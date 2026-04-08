import { Timestamp } from 'firebase/firestore';
import { eventRepository } from '../repositories/eventRepository';
import { Event, EventType, EventStatus } from '../types';
import { qrCodeGenerator } from './qrCodeGenerator';

/**
 * Validation error for event operations
 */
export class EventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventValidationError';
  }
}

/**
 * Service for managing events with validation and business logic
 * Handles event creation, updates, cancellation, and notifications
 */
export class EventService {
  /**
   * Create a new event with validation
   * @param eventData - The event data to create
   * @returns Promise<Event> The created event
   * @throws EventValidationError if validation fails
   */
  async createEvent(eventData: Omit<Event, 'eventId' | 'createdAt' | 'registeredCount' | 'qrCodeData'>): Promise<Event> {
    // Validate event data
    this.validateEventData(eventData);

    // Create event with defaults (temporary qrCodeData)
    const newEvent = await eventRepository.createEvent({
      ...eventData,
      registeredCount: 0,
      qrCodeData: '', // Temporary, will be updated with proper QR code
      createdAt: Timestamp.now(),
    });

    // Generate QR code for the event
    const qrCode = qrCodeGenerator.generateQRCode(newEvent);
    
    // Update event with QR code data
    await eventRepository.updateEvent(newEvent.eventId, {
      qrCodeData: qrCode.qrCodeData,
    });

    // Retrieve the updated event
    const updatedEvent = await eventRepository.getEventById(newEvent.eventId);
    if (!updatedEvent) {
      throw new Error('Failed to retrieve event after QR code generation');
    }

    return updatedEvent;
  }

  /**
   * Update an existing event with attendee notification
   * @param eventId - The ID of the event to update
   * @param updates - Partial event data to update
   * @returns Promise<Event> The updated event
   * @throws EventValidationError if validation fails
   */
  async updateEvent(eventId: string, updates: Partial<Omit<Event, 'eventId' | 'createdAt'>>): Promise<Event> {
    // Get existing event
    const existingEvent = await eventRepository.getEventById(eventId);
    if (!existingEvent) {
      throw new EventValidationError(`Event with ID ${eventId} not found`);
    }

    // Validate updates if they include date or capacity changes
    if (updates.startTime || updates.endTime) {
      const startTime = updates.startTime || existingEvent.startTime;
      const endTime = updates.endTime || existingEvent.endTime;
      this.validateEventDates(startTime, endTime);
    }

    if (updates.capacity !== undefined) {
      this.validateCapacity(updates.capacity);
    }

    // Update the event
    await eventRepository.updateEvent(eventId, updates);

    // Get updated event
    const updatedEvent = await eventRepository.getEventById(eventId);
    if (!updatedEvent) {
      throw new Error('Failed to retrieve updated event');
    }

    // Notify registered attendees about the update
    await this.notifyAttendees(eventId, 'update', updatedEvent);

    return updatedEvent;
  }

  /**
   * Cancel an event with attendee notification
   * @param eventId - The ID of the event to cancel
   * @returns Promise<Event> The cancelled event
   */
  async cancelEvent(eventId: string): Promise<Event> {
    // Get existing event
    const existingEvent = await eventRepository.getEventById(eventId);
    if (!existingEvent) {
      throw new EventValidationError(`Event with ID ${eventId} not found`);
    }

    // Update event status to cancelled
    await eventRepository.updateEvent(eventId, {
      status: EventStatus.CANCELLED,
    });

    // Get updated event
    const cancelledEvent = await eventRepository.getEventById(eventId);
    if (!cancelledEvent) {
      throw new Error('Failed to retrieve cancelled event');
    }

    // Notify all registered attendees about cancellation
    await this.notifyAttendees(eventId, 'cancel', cancelledEvent);

    return cancelledEvent;
  }

  /**
   * Add tags to an event
   * @param eventId - The ID of the event
   * @param tags - Array of tags to add
   * @returns Promise<Event> The updated event
   */
  async addTags(eventId: string, tags: string[]): Promise<Event> {
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new EventValidationError(`Event with ID ${eventId} not found`);
    }

    // Merge new tags with existing tags (remove duplicates)
    const updatedTags = Array.from(new Set([...event.tags, ...tags]));

    await eventRepository.updateEvent(eventId, { tags: updatedTags });

    const updatedEvent = await eventRepository.getEventById(eventId);
    if (!updatedEvent) {
      throw new Error('Failed to retrieve updated event');
    }

    return updatedEvent;
  }

  /**
   * Remove tags from an event
   * @param eventId - The ID of the event
   * @param tags - Array of tags to remove
   * @returns Promise<Event> The updated event
   */
  async removeTags(eventId: string, tags: string[]): Promise<Event> {
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new EventValidationError(`Event with ID ${eventId} not found`);
    }

    // Remove specified tags
    const updatedTags = event.tags.filter(tag => !tags.includes(tag));

    await eventRepository.updateEvent(eventId, { tags: updatedTags });

    const updatedEvent = await eventRepository.getEventById(eventId);
    if (!updatedEvent) {
      throw new Error('Failed to retrieve updated event');
    }

    return updatedEvent;
  }

  /**
   * Update event type
   * @param eventId - The ID of the event
   * @param type - The new event type
   * @returns Promise<Event> The updated event
   */
  async updateEventType(eventId: string, type: EventType): Promise<Event> {
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new EventValidationError(`Event with ID ${eventId} not found`);
    }

    await eventRepository.updateEvent(eventId, { type });

    const updatedEvent = await eventRepository.getEventById(eventId);
    if (!updatedEvent) {
      throw new Error('Failed to retrieve updated event');
    }

    return updatedEvent;
  }

  /**
   * Validate event data
   * @param eventData - The event data to validate
   * @throws EventValidationError if validation fails
   */
  private validateEventData(eventData: Partial<Event>): void {
    // Validate required fields
    if (eventData.name && eventData.name.trim().length === 0) {
      throw new EventValidationError('Event name cannot be empty');
    }

    // Validate dates
    if (eventData.startTime && eventData.endTime) {
      this.validateEventDates(eventData.startTime, eventData.endTime);
    }

    // Validate capacity
    if (eventData.capacity !== undefined) {
      this.validateCapacity(eventData.capacity);
    }

    // Validate fee
    if (eventData.fee !== undefined && eventData.fee < 0) {
      throw new EventValidationError('Event fee cannot be negative');
    }
  }

  /**
   * Validate event dates (end must be after start)
   * @param startTime - Event start time
   * @param endTime - Event end time
   * @throws EventValidationError if validation fails
   */
  private validateEventDates(startTime: Timestamp, endTime: Timestamp): void {
    // Compare timestamps by converting to milliseconds
    const startMillis = startTime.toMillis ? startTime.toMillis() : startTime.toDate().getTime();
    const endMillis = endTime.toMillis ? endTime.toMillis() : endTime.toDate().getTime();
    
    if (endMillis <= startMillis) {
      throw new EventValidationError('Event end time must be after start time');
    }
  }

  /**
   * Validate event capacity (must be positive)
   * @param capacity - Event capacity
   * @throws EventValidationError if validation fails
   */
  private validateCapacity(capacity: number): void {
    if (capacity <= 0) {
      throw new EventValidationError('Event capacity must be a positive number');
    }

    if (!Number.isInteger(capacity)) {
      throw new EventValidationError('Event capacity must be an integer');
    }
  }

  /**
   * Notify registered attendees about event changes
   * @param eventId - The ID of the event
   * @param notificationType - Type of notification ('update' or 'cancel')
   * @param event - The event data
   * @returns Promise<void>
   */
  private async notifyAttendees(eventId: string, notificationType: 'update' | 'cancel', event: Event): Promise<void> {
    // TODO: Implement notification logic when NotificationService is available
    // This is a placeholder that will be implemented in task 12
    // For now, we'll just log the notification
    console.log(`Notification: Event ${notificationType} for event ${eventId} (${event.name})`);
    
    // In the future, this will:
    // 1. Get all RSVPs for the event
    // 2. Get all registered attendees
    // 3. Send notifications to each attendee
    // Example:
    // const rsvps = await rsvpRepository.getRSVPsByEvent(eventId);
    // for (const rsvp of rsvps) {
    //   await notificationService.sendNotification({
    //     userId: rsvp.studentId,
    //     type: notificationType === 'update' ? NotificationType.EVENT_UPDATED : NotificationType.EVENT_CANCELLED,
    //     title: `Event ${notificationType === 'update' ? 'Updated' : 'Cancelled'}`,
    //     message: `The event "${event.name}" has been ${notificationType === 'update' ? 'updated' : 'cancelled'}`,
    //     data: { eventId, eventName: event.name }
    //   });
    // }
  }
}

export const eventService = new EventService();
