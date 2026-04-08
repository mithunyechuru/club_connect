import { Timestamp } from 'firebase/firestore';
import { RSVPService, RSVPValidationError } from './rsvpService';
import { rsvpRepository } from '../repositories/rsvpRepository';
import { eventRepository } from '../repositories/eventRepository';
import { paymentService, PaymentResult } from './paymentService';
import { RSVP, RSVPStatus, Event, EventType, EventStatus, TransactionStatus, TransactionType } from '../types';

// Mock the repositories and services
jest.mock('../repositories/rsvpRepository');
jest.mock('../repositories/eventRepository');
jest.mock('./paymentService');

describe('RSVPService', () => {
  let rsvpService: RSVPService;
  let mockEvent: Event;
  let mockRSVP: RSVP;

  beforeEach(() => {
    rsvpService = new RSVPService();
    jest.clearAllMocks();

    // Setup mock event
    mockEvent = {
      eventId: 'event1',
      clubId: 'club1',
      name: 'Test Event',
      description: 'Test Description',
      type: EventType.WORKSHOP,
      startTime: Timestamp.fromDate(new Date('2024-12-31')),
      endTime: Timestamp.fromDate(new Date('2024-12-31')),
      venueId: 'venue1',
      capacity: 10,
      registeredCount: 0,
      tags: [],
      fee: 0,
      status: EventStatus.ACTIVE,
      location: 'Test Location',
      qrCodeData: 'qr123',
      createdAt: Timestamp.now(),
    };

    // Setup mock RSVP
    mockRSVP = {
      rsvpId: 'rsvp1',
      eventId: 'event1',
      studentId: 'student1',
      status: RSVPStatus.CONFIRMED,
      waitlistPosition: 0,
      registeredAt: Timestamp.now(),
      paymentCompleted: false,
    };
  });

  describe('createRSVP', () => {
    it('should create a confirmed RSVP when event has capacity', async () => {
      // Mock event with capacity
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([]);
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(mockRSVP);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);

      const result = await rsvpService.createRSVP('student1', 'event1');

      expect(result).toEqual(mockRSVP);
      expect(rsvpRepository.createRSVP).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          paymentCompleted: false,
        })
      );
      expect(eventRepository.updateEvent).toHaveBeenCalledWith('event1', {
        registeredCount: 1,
      });
    });

    it('should add to waitlist when event is at capacity', async () => {
      // Mock event at capacity
      const confirmedRSVPs = Array(10).fill(mockRSVP);
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue(confirmedRSVPs);
      (rsvpRepository.getWaitlistByEvent as jest.Mock).mockResolvedValue([]);

      const waitlistedRSVP = { ...mockRSVP, status: RSVPStatus.WAITLISTED, waitlistPosition: 1 };
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(waitlistedRSVP);

      const result = await rsvpService.createRSVP('student1', 'event1');

      expect(result.status).toBe(RSVPStatus.WAITLISTED);
      expect(result.waitlistPosition).toBe(1);
      expect(rsvpRepository.createRSVP).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RSVPStatus.WAITLISTED,
          waitlistPosition: 1,
        })
      );
      // Should not update event registered count for waitlisted
      expect(eventRepository.updateEvent).not.toHaveBeenCalled();
    });

    it('should assign correct waitlist position when others are already waitlisted', async () => {
      const confirmedRSVPs = Array(10).fill(mockRSVP);
      const existingWaitlist = [
        { ...mockRSVP, rsvpId: 'rsvp2', status: RSVPStatus.WAITLISTED, waitlistPosition: 1 },
        { ...mockRSVP, rsvpId: 'rsvp3', status: RSVPStatus.WAITLISTED, waitlistPosition: 2 },
      ];

      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue(confirmedRSVPs);
      (rsvpRepository.getWaitlistByEvent as jest.Mock).mockResolvedValue(existingWaitlist);

      const waitlistedRSVP = { ...mockRSVP, status: RSVPStatus.WAITLISTED, waitlistPosition: 3 };
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(waitlistedRSVP);

      const result = await rsvpService.createRSVP('student1', 'event1');

      expect(result.waitlistPosition).toBe(3);
    });

    it('should throw error if student already has active RSVP', async () => {
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(mockRSVP);

      await expect(rsvpService.createRSVP('student1', 'event1')).rejects.toThrow(
        RSVPValidationError
      );
      await expect(rsvpService.createRSVP('student1', 'event1')).rejects.toThrow(
        'Student already has an active RSVP for this event'
      );
    });

    it('should allow RSVP if previous RSVP was cancelled', async () => {
      const cancelledRSVP = { ...mockRSVP, status: RSVPStatus.CANCELLED };
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(cancelledRSVP);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([]);
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(mockRSVP);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);

      const result = await rsvpService.createRSVP('student1', 'event1');

      expect(result).toEqual(mockRSVP);
      expect(rsvpRepository.createRSVP).toHaveBeenCalled();
    });

    it('should throw error if event not found', async () => {
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);

      await expect(rsvpService.createRSVP('student1', 'event1')).rejects.toThrow(
        RSVPValidationError
      );
      await expect(rsvpService.createRSVP('student1', 'event1')).rejects.toThrow(
        'Event with ID event1 not found'
      );
    });

    it('should throw error if payment required but not completed', async () => {
      const paidEvent = { ...mockEvent, fee: 50 };
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(paidEvent);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);

      await expect(rsvpService.createRSVP('student1', 'event1', false)).rejects.toThrow(
        RSVPValidationError
      );
      await expect(rsvpService.createRSVP('student1', 'event1', false)).rejects.toThrow(
        'Payment required for this event'
      );
    });

    it('should create RSVP for paid event when payment completed', async () => {
      const paidEvent = { ...mockEvent, fee: 50 };
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(paidEvent);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([]);

      const paidRSVP = { ...mockRSVP, paymentCompleted: true };
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(paidRSVP);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);

      const result = await rsvpService.createRSVP('student1', 'event1', true);

      expect(result.paymentCompleted).toBe(true);
      expect(rsvpRepository.createRSVP).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentCompleted: true,
        })
      );
    });

    it('should throw error if studentId is empty', async () => {
      await expect(rsvpService.createRSVP('', 'event1')).rejects.toThrow(
        RSVPValidationError
      );
      await expect(rsvpService.createRSVP('', 'event1')).rejects.toThrow(
        'Student ID and Event ID are required'
      );
    });

    it('should throw error if eventId is empty', async () => {
      await expect(rsvpService.createRSVP('student1', '')).rejects.toThrow(
        RSVPValidationError
      );
      await expect(rsvpService.createRSVP('student1', '')).rejects.toThrow(
        'Student ID and Event ID are required'
      );
    });
  });

  describe('cancelRSVP', () => {
    it('should cancel a confirmed RSVP and promote from waitlist', async () => {
      const waitlistedRSVP = {
        ...mockRSVP,
        rsvpId: 'rsvp2',
        studentId: 'student2',
        status: RSVPStatus.WAITLISTED,
        waitlistPosition: 1,
      };

      (rsvpRepository.getRSVPById as jest.Mock)
        .mockResolvedValueOnce(mockRSVP) // First call for the RSVP being cancelled
        .mockResolvedValueOnce(waitlistedRSVP); // Second call in promoteFromWaitlist

      (rsvpRepository.updateRSVP as jest.Mock).mockResolvedValue(undefined);
      (rsvpRepository.getFirstWaitlistedRSVP as jest.Mock).mockResolvedValue(waitlistedRSVP);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([mockRSVP]);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);

      await rsvpService.cancelRSVP('rsvp1');

      // Should cancel the RSVP
      expect(rsvpRepository.updateRSVP).toHaveBeenCalledWith('rsvp1', {
        status: RSVPStatus.CANCELLED,
      });

      // Should promote from waitlist
      expect(rsvpRepository.getFirstWaitlistedRSVP).toHaveBeenCalledWith('event1');
      expect(rsvpRepository.updateRSVP).toHaveBeenCalledWith('rsvp2', {
        status: RSVPStatus.CONFIRMED,
        waitlistPosition: 0,
      });

      // Should update event registered count
      expect(eventRepository.updateEvent).toHaveBeenCalled();
    });

    it('should cancel waitlisted RSVP without promoting', async () => {
      const waitlistedRSVP = { ...mockRSVP, status: RSVPStatus.WAITLISTED, waitlistPosition: 1 };
      (rsvpRepository.getRSVPById as jest.Mock).mockResolvedValue(waitlistedRSVP);
      (rsvpRepository.updateRSVP as jest.Mock).mockResolvedValue(undefined);

      await rsvpService.cancelRSVP('rsvp1');

      expect(rsvpRepository.updateRSVP).toHaveBeenCalledWith('rsvp1', {
        status: RSVPStatus.CANCELLED,
      });
      // Should not try to promote from waitlist
      expect(rsvpRepository.getFirstWaitlistedRSVP).not.toHaveBeenCalled();
    });

    it('should handle cancellation when waitlist is empty', async () => {
      (rsvpRepository.getRSVPById as jest.Mock).mockResolvedValue(mockRSVP);
      (rsvpRepository.updateRSVP as jest.Mock).mockResolvedValue(undefined);
      (rsvpRepository.getFirstWaitlistedRSVP as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([]);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);

      await rsvpService.cancelRSVP('rsvp1');

      expect(rsvpRepository.updateRSVP).toHaveBeenCalledWith('rsvp1', {
        status: RSVPStatus.CANCELLED,
      });
      expect(rsvpRepository.getFirstWaitlistedRSVP).toHaveBeenCalledWith('event1');
      // Should still update event count
      expect(eventRepository.updateEvent).toHaveBeenCalled();
    });

    it('should throw error if RSVP not found', async () => {
      (rsvpRepository.getRSVPById as jest.Mock).mockResolvedValue(null);

      await expect(rsvpService.cancelRSVP('rsvp1')).rejects.toThrow(RSVPValidationError);
      await expect(rsvpService.cancelRSVP('rsvp1')).rejects.toThrow(
        'RSVP with ID rsvp1 not found'
      );
    });

    it('should throw error if RSVP already cancelled', async () => {
      const cancelledRSVP = { ...mockRSVP, status: RSVPStatus.CANCELLED };
      (rsvpRepository.getRSVPById as jest.Mock).mockResolvedValue(cancelledRSVP);

      await expect(rsvpService.cancelRSVP('rsvp1')).rejects.toThrow(RSVPValidationError);
      await expect(rsvpService.cancelRSVP('rsvp1')).rejects.toThrow(
        'RSVP is already cancelled'
      );
    });
  });

  describe('getRSVPById', () => {
    it('should return RSVP by ID', async () => {
      (rsvpRepository.getRSVPById as jest.Mock).mockResolvedValue(mockRSVP);

      const result = await rsvpService.getRSVPById('rsvp1');

      expect(result).toEqual(mockRSVP);
      expect(rsvpRepository.getRSVPById).toHaveBeenCalledWith('rsvp1');
    });

    it('should return null if RSVP not found', async () => {
      (rsvpRepository.getRSVPById as jest.Mock).mockResolvedValue(null);

      const result = await rsvpService.getRSVPById('rsvp1');

      expect(result).toBeNull();
    });
  });

  describe('getRSVPsByEvent', () => {
    it('should return all RSVPs for an event', async () => {
      const rsvps = [mockRSVP, { ...mockRSVP, rsvpId: 'rsvp2' }];
      (rsvpRepository.getRSVPsByEvent as jest.Mock).mockResolvedValue(rsvps);

      const result = await rsvpService.getRSVPsByEvent('event1');

      expect(result).toEqual(rsvps);
      expect(rsvpRepository.getRSVPsByEvent).toHaveBeenCalledWith('event1', undefined);
    });

    it('should return RSVPs filtered by status', async () => {
      const confirmedRSVPs = [mockRSVP];
      (rsvpRepository.getRSVPsByEvent as jest.Mock).mockResolvedValue(confirmedRSVPs);

      const result = await rsvpService.getRSVPsByEvent('event1', RSVPStatus.CONFIRMED);

      expect(result).toEqual(confirmedRSVPs);
      expect(rsvpRepository.getRSVPsByEvent).toHaveBeenCalledWith('event1', RSVPStatus.CONFIRMED);
    });
  });

  describe('getRSVPsByStudent', () => {
    it('should return all RSVPs for a student', async () => {
      const rsvps = [mockRSVP, { ...mockRSVP, rsvpId: 'rsvp2', eventId: 'event2' }];
      (rsvpRepository.getRSVPsByStudent as jest.Mock).mockResolvedValue(rsvps);

      const result = await rsvpService.getRSVPsByStudent('student1');

      expect(result).toEqual(rsvps);
      expect(rsvpRepository.getRSVPsByStudent).toHaveBeenCalledWith('student1', undefined);
    });

    it('should return RSVPs filtered by status', async () => {
      const confirmedRSVPs = [mockRSVP];
      (rsvpRepository.getRSVPsByStudent as jest.Mock).mockResolvedValue(confirmedRSVPs);

      const result = await rsvpService.getRSVPsByStudent('student1', RSVPStatus.CONFIRMED);

      expect(result).toEqual(confirmedRSVPs);
      expect(rsvpRepository.getRSVPsByStudent).toHaveBeenCalledWith('student1', RSVPStatus.CONFIRMED);
    });
  });

  describe('getWaitlist', () => {
    it('should return waitlist ordered by position', async () => {
      const waitlist = [
        { ...mockRSVP, rsvpId: 'rsvp2', status: RSVPStatus.WAITLISTED, waitlistPosition: 1 },
        { ...mockRSVP, rsvpId: 'rsvp3', status: RSVPStatus.WAITLISTED, waitlistPosition: 2 },
      ];
      (rsvpRepository.getWaitlistByEvent as jest.Mock).mockResolvedValue(waitlist);

      const result = await rsvpService.getWaitlist('event1');

      expect(result).toEqual(waitlist);
      expect(rsvpRepository.getWaitlistByEvent).toHaveBeenCalledWith('event1');
    });
  });

  describe('isEventAtCapacity', () => {
    it('should return true when event is at capacity', async () => {
      const confirmedRSVPs = Array(10).fill(mockRSVP);
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue(confirmedRSVPs);

      const result = await rsvpService.isEventAtCapacity('event1');

      expect(result).toBe(true);
    });

    it('should return false when event has capacity', async () => {
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([mockRSVP]);

      const result = await rsvpService.isEventAtCapacity('event1');

      expect(result).toBe(false);
    });

    it('should throw error if event not found', async () => {
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(null);

      await expect(rsvpService.isEventAtCapacity('event1')).rejects.toThrow(
        RSVPValidationError
      );
    });
  });

  describe('getRSVPByStudentAndEvent', () => {
    it('should return RSVP for student and event', async () => {
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(mockRSVP);

      const result = await rsvpService.getRSVPByStudentAndEvent('student1', 'event1');

      expect(result).toEqual(mockRSVP);
      expect(rsvpRepository.getRSVPByStudentAndEvent).toHaveBeenCalledWith('student1', 'event1');
    });

    it('should return null if no RSVP found', async () => {
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);

      const result = await rsvpService.getRSVPByStudentAndEvent('student1', 'event1');

      expect(result).toBeNull();
    });
  });

  describe('handleWaitlistPromotionTimeout', () => {
    it('should cancel RSVP if timeout has passed', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const oldTimestamp = {
        ...Timestamp.fromDate(oldDate),
        toMillis: () => oldDate.getTime(),
        toDate: () => oldDate,
      };
      const oldRSVP = { ...mockRSVP, registeredAt: oldTimestamp as any };

      (rsvpRepository.getRSVPById as jest.Mock)
        .mockResolvedValueOnce(oldRSVP)
        .mockResolvedValueOnce(oldRSVP);
      (rsvpRepository.updateRSVP as jest.Mock).mockResolvedValue(undefined);
      (rsvpRepository.getFirstWaitlistedRSVP as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([]);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);

      await rsvpService.handleWaitlistPromotionTimeout('rsvp1');

      expect(rsvpRepository.updateRSVP).toHaveBeenCalledWith('rsvp1', {
        status: RSVPStatus.CANCELLED,
      });
    });

    it('should not cancel RSVP if timeout has not passed', async () => {
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      const recentTimestamp = {
        ...Timestamp.fromDate(recentDate),
        toMillis: () => recentDate.getTime(),
        toDate: () => recentDate,
      };
      const recentRSVP = { ...mockRSVP, registeredAt: recentTimestamp as any };

      (rsvpRepository.getRSVPById as jest.Mock).mockResolvedValue(recentRSVP);

      await rsvpService.handleWaitlistPromotionTimeout('rsvp1');

      expect(rsvpRepository.updateRSVP).not.toHaveBeenCalled();
    });

    it('should handle non-existent RSVP gracefully', async () => {
      (rsvpRepository.getRSVPById as jest.Mock).mockResolvedValue(null);

      await expect(rsvpService.handleWaitlistPromotionTimeout('rsvp1')).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent RSVP attempts gracefully', async () => {
      // This test simulates the scenario where multiple students try to RSVP
      // for the last spot simultaneously
      const eventWithOneSpot = { ...mockEvent, capacity: 5 };
      const fourConfirmedRSVPs = Array(4).fill(mockRSVP);

      (eventRepository.getEventById as jest.Mock).mockResolvedValue(eventWithOneSpot);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue(fourConfirmedRSVPs);
      (rsvpRepository.getWaitlistByEvent as jest.Mock).mockResolvedValue([]);
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(mockRSVP);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);

      // First student should get confirmed
      const result1 = await rsvpService.createRSVP('student1', 'event1');
      expect(result1.status).toBe(RSVPStatus.CONFIRMED);

      // Simulate capacity being full now
      const fiveConfirmedRSVPs = Array(5).fill(mockRSVP);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue(fiveConfirmedRSVPs);

      const waitlistedRSVP = { ...mockRSVP, status: RSVPStatus.WAITLISTED, waitlistPosition: 1 };
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(waitlistedRSVP);

      // Second student should be waitlisted
      const result2 = await rsvpService.createRSVP('student2', 'event1');
      expect(result2.status).toBe(RSVPStatus.WAITLISTED);
    });

    it('should handle multiple waitlist promotions correctly', async () => {
      const waitlist = [
        { ...mockRSVP, rsvpId: 'rsvp2', studentId: 'student2', status: RSVPStatus.WAITLISTED, waitlistPosition: 1 },
        { ...mockRSVP, rsvpId: 'rsvp3', studentId: 'student3', status: RSVPStatus.WAITLISTED, waitlistPosition: 2 },
      ];

      (rsvpRepository.getRSVPById as jest.Mock)
        .mockResolvedValueOnce(mockRSVP)
        .mockResolvedValueOnce(waitlist[0]);
      (rsvpRepository.updateRSVP as jest.Mock).mockResolvedValue(undefined);
      (rsvpRepository.getFirstWaitlistedRSVP as jest.Mock).mockResolvedValue(waitlist[0]);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([mockRSVP]);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);

      // Cancel first RSVP
      await rsvpService.cancelRSVP('rsvp1');

      // First waitlisted should be promoted
      expect(rsvpRepository.updateRSVP).toHaveBeenCalledWith('rsvp2', {
        status: RSVPStatus.CONFIRMED,
        waitlistPosition: 0,
      });
    });
  });

  describe('createRSVPWithPayment - Payment Integration', () => {
    it('should process payment and create RSVP for paid event', async () => {
      const paidEvent = { ...mockEvent, fee: 50 };
      const mockPaymentResult: PaymentResult = {
        success: true,
        transaction: {
          transactionId: 'txn1',
          userId: 'student1',
          eventId: 'event1',
          amount: 50,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
          completedAt: Timestamp.now(),
        },
        receipt: {
          transactionId: 'txn1',
          userId: 'student1',
          amount: 50,
          currency: 'USD',
          eventId: 'event1',
          paymentMethod: 'card',
          timestamp: Timestamp.now(),
        },
      };

      (eventRepository.getEventById as jest.Mock).mockResolvedValue(paidEvent);
      (paymentService.processEventPayment as jest.Mock).mockResolvedValue(mockPaymentResult);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([]);

      const paidRSVP = { ...mockRSVP, paymentCompleted: true };
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(paidRSVP);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);
      (paymentService.sendReceipt as jest.Mock).mockResolvedValue(undefined);

      const result = await rsvpService.createRSVPWithPayment(
        'student1',
        'event1',
        'card',
        'student@example.com'
      );

      expect(result.rsvp.paymentCompleted).toBe(true);
      expect(result.paymentResult).toBeDefined();
      expect(result.paymentResult?.success).toBe(true);
      expect(paymentService.processEventPayment).toHaveBeenCalledWith(
        'student1',
        'event1',
        50,
        'USD',
        'card'
      );
      expect(paymentService.sendReceipt).toHaveBeenCalledWith(
        mockPaymentResult.receipt,
        'student@example.com'
      );
    });

    it('should throw error if payment method not provided for paid event', async () => {
      const paidEvent = { ...mockEvent, fee: 50 };
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(paidEvent);

      await expect(
        rsvpService.createRSVPWithPayment('student1', 'event1')
      ).rejects.toThrow(RSVPValidationError);
      await expect(
        rsvpService.createRSVPWithPayment('student1', 'event1')
      ).rejects.toThrow('Payment method is required for paid events');
    });

    it('should throw error if payment fails', async () => {
      const paidEvent = { ...mockEvent, fee: 50 };
      const mockPaymentResult: PaymentResult = {
        success: false,
        transaction: {
          transactionId: 'txn1',
          userId: 'student1',
          eventId: 'event1',
          amount: 50,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.FAILED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
        error: 'Insufficient funds',
      };

      (eventRepository.getEventById as jest.Mock).mockResolvedValue(paidEvent);
      (paymentService.processEventPayment as jest.Mock).mockResolvedValue(mockPaymentResult);

      await expect(
        rsvpService.createRSVPWithPayment('student1', 'event1', 'card')
      ).rejects.toThrow(RSVPValidationError);
      await expect(
        rsvpService.createRSVPWithPayment('student1', 'event1', 'card')
      ).rejects.toThrow('Payment failed: Insufficient funds');

      // RSVP should not be created
      expect(rsvpRepository.createRSVP).not.toHaveBeenCalled();
    });

    it('should create RSVP without payment for free event', async () => {
      const freeEvent = { ...mockEvent, fee: 0 };
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(freeEvent);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([]);
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(mockRSVP);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);

      const result = await rsvpService.createRSVPWithPayment('student1', 'event1');

      expect(result.rsvp).toEqual(mockRSVP);
      expect(result.paymentResult).toBeUndefined();
      expect(paymentService.processEventPayment).not.toHaveBeenCalled();
    });

    it('should not send receipt if email not provided', async () => {
      const paidEvent = { ...mockEvent, fee: 50 };
      const mockPaymentResult: PaymentResult = {
        success: true,
        transaction: {
          transactionId: 'txn1',
          userId: 'student1',
          eventId: 'event1',
          amount: 50,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
          completedAt: Timestamp.now(),
        },
        receipt: {
          transactionId: 'txn1',
          userId: 'student1',
          amount: 50,
          currency: 'USD',
          eventId: 'event1',
          paymentMethod: 'card',
          timestamp: Timestamp.now(),
        },
      };

      (eventRepository.getEventById as jest.Mock).mockResolvedValue(paidEvent);
      (paymentService.processEventPayment as jest.Mock).mockResolvedValue(mockPaymentResult);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue([]);

      const paidRSVP = { ...mockRSVP, paymentCompleted: true };
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(paidRSVP);
      (eventRepository.updateEvent as jest.Mock).mockResolvedValue(undefined);

      await rsvpService.createRSVPWithPayment('student1', 'event1', 'card');

      expect(paymentService.sendReceipt).not.toHaveBeenCalled();
    });

    it('should throw error if event not found', async () => {
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(null);

      await expect(
        rsvpService.createRSVPWithPayment('student1', 'event1', 'card')
      ).rejects.toThrow(RSVPValidationError);
      await expect(
        rsvpService.createRSVPWithPayment('student1', 'event1', 'card')
      ).rejects.toThrow('Event with ID event1 not found');
    });

    it('should throw error if studentId or eventId is empty', async () => {
      await expect(
        rsvpService.createRSVPWithPayment('', 'event1', 'card')
      ).rejects.toThrow(RSVPValidationError);
      await expect(
        rsvpService.createRSVPWithPayment('', 'event1', 'card')
      ).rejects.toThrow('Student ID and Event ID are required');

      await expect(
        rsvpService.createRSVPWithPayment('student1', '', 'card')
      ).rejects.toThrow(RSVPValidationError);
      await expect(
        rsvpService.createRSVPWithPayment('student1', '', 'card')
      ).rejects.toThrow('Student ID and Event ID are required');
    });

    it('should handle payment processing with waitlist', async () => {
      const paidEvent = { ...mockEvent, fee: 50, capacity: 1 };
      const mockPaymentResult: PaymentResult = {
        success: true,
        transaction: {
          transactionId: 'txn1',
          userId: 'student1',
          eventId: 'event1',
          amount: 50,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
          completedAt: Timestamp.now(),
        },
        receipt: {
          transactionId: 'txn1',
          userId: 'student1',
          amount: 50,
          currency: 'USD',
          eventId: 'event1',
          paymentMethod: 'card',
          timestamp: Timestamp.now(),
        },
      };

      // Event is at capacity
      const confirmedRSVPs = [mockRSVP];
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(paidEvent);
      (paymentService.processEventPayment as jest.Mock).mockResolvedValue(mockPaymentResult);
      (rsvpRepository.getRSVPByStudentAndEvent as jest.Mock).mockResolvedValue(null);
      (rsvpRepository.getConfirmedRSVPs as jest.Mock).mockResolvedValue(confirmedRSVPs);
      (rsvpRepository.getWaitlistByEvent as jest.Mock).mockResolvedValue([]);

      const waitlistedRSVP = {
        ...mockRSVP,
        status: RSVPStatus.WAITLISTED,
        waitlistPosition: 1,
        paymentCompleted: true,
      };
      (rsvpRepository.createRSVP as jest.Mock).mockResolvedValue(waitlistedRSVP);
      (paymentService.sendReceipt as jest.Mock).mockResolvedValue(undefined);

      const result = await rsvpService.createRSVPWithPayment(
        'student1',
        'event1',
        'card',
        'student@example.com'
      );

      // Payment should be processed even for waitlisted RSVP
      expect(result.rsvp.status).toBe(RSVPStatus.WAITLISTED);
      expect(result.rsvp.paymentCompleted).toBe(true);
      expect(paymentService.processEventPayment).toHaveBeenCalled();
      expect(paymentService.sendReceipt).toHaveBeenCalled();
    });
  });
});

