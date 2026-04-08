import { Timestamp } from 'firebase/firestore';
import { rsvpRepository } from '../repositories/rsvpRepository';
import { eventRepository } from '../repositories/eventRepository';
import { paymentService, PaymentResult } from './paymentService';
import { RSVP, RSVPStatus } from '../types';

/**
 * Validation error for RSVP operations
 */
export class RSVPValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RSVPValidationError';
  }
}

/**
 * Configuration for waitlist promotion timeout
 */
const WAITLIST_PROMOTION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Service for managing RSVPs with capacity checking and waitlist management
 * Handles RSVP creation, cancellation, and waitlist promotion
 * Integrates with PaymentService for paid events
 */
export class RSVPService {
  /**
   * Create an RSVP with payment processing for paid events
   * This is the main entry point for RSVP creation that handles payment integration
   * @param studentId - The ID of the student
   * @param eventId - The ID of the event
   * @param paymentMethod - The payment method (e.g., 'card', 'paypal') - required for paid events
   * @param userEmail - The user's email for receipt delivery
   * @returns Promise<{ rsvp: RSVP; paymentResult?: PaymentResult }> The created RSVP and payment result
   * @throws RSVPValidationError if validation fails
   */
  async createRSVPWithPayment(
    studentId: string,
    eventId: string,
    paymentMethod?: string,
    userEmail?: string
  ): Promise<{ rsvp: RSVP; paymentResult?: PaymentResult }> {
    // Validate inputs
    if (!studentId || !eventId) {
      throw new RSVPValidationError('Student ID and Event ID are required');
    }

    // Get event details to check if payment is required
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new RSVPValidationError(`Event with ID ${eventId} not found`);
    }

    // Check if event requires payment
    if (event.fee > 0) {
      // Payment required
      if (!paymentMethod) {
        throw new RSVPValidationError('Payment method is required for paid events');
      }

      // Process payment first
      const paymentResult = await paymentService.processEventPayment(
        studentId,
        eventId,
        event.fee,
        'USD', // Default currency
        paymentMethod
      );

      if (!paymentResult.success) {
        // Payment failed - do not create RSVP
        throw new RSVPValidationError(
          `Payment failed: ${paymentResult.error || 'Unknown payment error'}`
        );
      }

      // Payment successful - create RSVP with paymentCompleted flag
      const rsvp = await this.createRSVP(studentId, eventId, true);

      // Send receipt if email provided
      if (userEmail && paymentResult.receipt) {
        await paymentService.sendReceipt(paymentResult.receipt, userEmail);
      }

      return { rsvp, paymentResult };
    } else {
      // Free event - no payment required
      const rsvp = await this.createRSVP(studentId, eventId, false);
      return { rsvp };
    }
  }

  /**
   * Create an RSVP with capacity checking
   * If event is at capacity, adds student to waitlist
   * @param studentId - The ID of the student
   * @param eventId - The ID of the event
   * @param paymentCompleted - Whether payment has been completed (for paid events)
   * @returns Promise<RSVP> The created RSVP
   * @throws RSVPValidationError if validation fails
   */
  async createRSVP(studentId: string, eventId: string, paymentCompleted: boolean = false): Promise<RSVP> {
    // Validate inputs
    if (!studentId || !eventId) {
      throw new RSVPValidationError('Student ID and Event ID are required');
    }

    // Check if student already has an RSVP for this event
    const existingRSVP = await rsvpRepository.getRSVPByStudentAndEvent(studentId, eventId);
    if (existingRSVP && existingRSVP.status !== RSVPStatus.CANCELLED) {
      throw new RSVPValidationError('Student already has an active RSVP for this event');
    }

    // Get event details
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new RSVPValidationError(`Event with ID ${eventId} not found`);
    }

    // Check if event requires payment
    if (event.fee > 0 && !paymentCompleted) {
      throw new RSVPValidationError('Payment required for this event');
    }

    // Check capacity
    const confirmedRSVPs = await rsvpRepository.getConfirmedRSVPs(eventId);
    const isAtCapacity = confirmedRSVPs.length >= event.capacity;

    let rsvpStatus: RSVPStatus;
    let waitlistPosition = 0;

    if (isAtCapacity) {
      // Add to waitlist
      rsvpStatus = RSVPStatus.WAITLISTED;
      const waitlist = await rsvpRepository.getWaitlistByEvent(eventId);
      waitlistPosition = waitlist.length + 1;
    } else {
      // Confirm RSVP
      rsvpStatus = RSVPStatus.CONFIRMED;

      // Update event registered count
      await eventRepository.updateEvent(eventId, {
        registeredCount: confirmedRSVPs.length + 1,
      });
    }

    // Create RSVP
    const rsvp = await rsvpRepository.createRSVP({
      eventId,
      studentId,
      status: rsvpStatus,
      waitlistPosition,
      registeredAt: Timestamp.now(),
      paymentCompleted,
    });

    return rsvp;
  }

  /**
   * Cancel an RSVP and promote from waitlist if applicable
   * @param rsvpId - The ID of the RSVP to cancel
   * @returns Promise<void>
   * @throws RSVPValidationError if validation fails
   */
  async cancelRSVP(rsvpId: string): Promise<void> {
    // Get RSVP
    const rsvp = await rsvpRepository.getRSVPById(rsvpId);
    if (!rsvp) {
      throw new RSVPValidationError(`RSVP with ID ${rsvpId} not found`);
    }

    if (rsvp.status === RSVPStatus.CANCELLED) {
      throw new RSVPValidationError('RSVP is already cancelled');
    }

    const wasConfirmed = rsvp.status === RSVPStatus.CONFIRMED;

    // Update RSVP status to cancelled
    await rsvpRepository.updateRSVP(rsvpId, {
      status: RSVPStatus.CANCELLED,
    });

    // If the cancelled RSVP was confirmed, promote from waitlist
    if (wasConfirmed) {
      await this.promoteFromWaitlist(rsvp.eventId);

      // Update event registered count
      const confirmedRSVPs = await rsvpRepository.getConfirmedRSVPs(rsvp.eventId);
      await eventRepository.updateEvent(rsvp.eventId, {
        registeredCount: confirmedRSVPs.length,
      });
    }
  }

  /**
   * Promote the first waitlisted student to confirmed status
   * Sends notification and handles timeout for response
   * @param eventId - The ID of the event
   * @returns Promise<void>
   */
  private async promoteFromWaitlist(eventId: string): Promise<void> {
    // Get first waitlisted RSVP
    const firstWaitlisted = await rsvpRepository.getFirstWaitlistedRSVP(eventId);

    if (!firstWaitlisted) {
      // No one on waitlist
      return;
    }

    // Update RSVP to confirmed
    await rsvpRepository.updateRSVP(firstWaitlisted.rsvpId, {
      status: RSVPStatus.CONFIRMED,
      waitlistPosition: 0,
    });

    // Update event registered count
    const confirmedRSVPs = await rsvpRepository.getConfirmedRSVPs(eventId);
    await eventRepository.updateEvent(eventId, {
      registeredCount: confirmedRSVPs.length,
    });

    // Send notification to student
    await this.sendWaitlistPromotionNotification(firstWaitlisted.studentId, eventId);

    // Schedule timeout check for promotion response
    // In a production system, this would be handled by a background job/scheduler
    // For now, we'll just log it
    console.log(`Waitlist promotion timeout scheduled for RSVP ${firstWaitlisted.rsvpId} (${WAITLIST_PROMOTION_TIMEOUT_MS}ms)`);
  }

  /**
   * Send notification to student about waitlist spot availability
   * @param studentId - The ID of the student
   * @param eventId - The ID of the event
   * @returns Promise<void>
   */
  private async sendWaitlistPromotionNotification(studentId: string, eventId: string): Promise<void> {
    // TODO: Implement notification logic when NotificationService is available
    // This is a placeholder that will be implemented in task 12
    const event = await eventRepository.getEventById(eventId);

    console.log(`Notification: Waitlist spot available for student ${studentId} for event ${eventId} (${event?.name})`);

    // In the future, this will:
    // await notificationService.sendNotification({
    //   userId: studentId,
    //   type: NotificationType.WAITLIST_SPOT_AVAILABLE,
    //   title: 'Waitlist Spot Available',
    //   message: `A spot has opened up for the event "${event.name}". You have been promoted from the waitlist!`,
    //   data: { eventId, eventName: event.name }
    // });
  }

  /**
   * Get RSVP by ID
   * @param rsvpId - The ID of the RSVP
   * @returns Promise<RSVP | null> The RSVP if found
   */
  async getRSVPById(rsvpId: string): Promise<RSVP | null> {
    return rsvpRepository.getRSVPById(rsvpId);
  }

  /**
   * Get all RSVPs for an event
   * @param eventId - The ID of the event
   * @param status - Optional status filter
   * @returns Promise<RSVP[]> Array of RSVPs
   */
  async getRSVPsByEvent(eventId: string, status?: RSVPStatus): Promise<RSVP[]> {
    return rsvpRepository.getRSVPsByEvent(eventId, status);
  }

  /**
   * Get all RSVPs for a student
   * @param studentId - The ID of the student
   * @param status - Optional status filter
   * @returns Promise<RSVP[]> Array of RSVPs
   */
  async getRSVPsByStudent(studentId: string, status?: RSVPStatus): Promise<RSVP[]> {
    return rsvpRepository.getRSVPsByStudent(studentId, status);
  }

  /**
   * Get waitlist for an event
   * @param eventId - The ID of the event
   * @returns Promise<RSVP[]> Array of waitlisted RSVPs ordered by position
   */
  async getWaitlist(eventId: string): Promise<RSVP[]> {
    return rsvpRepository.getWaitlistByEvent(eventId);
  }

  /**
   * Check if an event is at capacity
   * @param eventId - The ID of the event
   * @returns Promise<boolean> True if event is at capacity
   */
  async isEventAtCapacity(eventId: string): Promise<boolean> {
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new RSVPValidationError(`Event with ID ${eventId} not found`);
    }

    const confirmedRSVPs = await rsvpRepository.getConfirmedRSVPs(eventId);
    return confirmedRSVPs.length >= event.capacity;
  }

  /**
   * Get RSVP for a specific student and event
   * @param studentId - The ID of the student
   * @param eventId - The ID of the event
   * @returns Promise<RSVP | null> The RSVP if found
   */
  async getRSVPByStudentAndEvent(studentId: string, eventId: string): Promise<RSVP | null> {
    return rsvpRepository.getRSVPByStudentAndEvent(studentId, eventId);
  }

  /**
   * Handle waitlist promotion timeout
   * If student doesn't respond within timeout period, offer spot to next student
   * @param rsvpId - The ID of the promoted RSVP
   * @returns Promise<void>
   */
  async handleWaitlistPromotionTimeout(rsvpId: string): Promise<void> {
    const rsvp = await rsvpRepository.getRSVPById(rsvpId);

    if (!rsvp) {
      return;
    }

    // Check if RSVP is still confirmed and hasn't been acted upon
    // In a real system, we'd track whether the student has acknowledged the promotion
    // For now, we'll check if enough time has passed since registration
    const nowMillis = Date.now();
    const registeredMillis = rsvp.registeredAt.toMillis ? rsvp.registeredAt.toMillis() : rsvp.registeredAt.toDate().getTime();
    const timeSinceRegistration = nowMillis - registeredMillis;

    if (rsvp.status === RSVPStatus.CONFIRMED && timeSinceRegistration > WAITLIST_PROMOTION_TIMEOUT_MS) {
      // Cancel the RSVP and promote next person
      await this.cancelRSVP(rsvpId);
    }
  }
}

export const rsvpService = new RSVPService();
