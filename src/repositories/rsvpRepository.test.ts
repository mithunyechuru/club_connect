import { Timestamp } from 'firebase/firestore';
import { RSVPRepository } from './rsvpRepository';
import { RSVP, RSVPStatus } from '../types';
import {
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

// Mock Firebase Firestore
jest.mock('firebase/firestore');
jest.mock('../services/firebase', () => ({
  db: {},
}));

describe('RSVPRepository', () => {
  let repository: RSVPRepository;

  beforeEach(() => {
    repository = new RSVPRepository();
    jest.clearAllMocks();
  });

  describe('getRSVPById', () => {
    it('should return an RSVP when it exists', async () => {
      const mockRSVP: RSVP = {
        rsvpId: 'rsvp1',
        eventId: 'event1',
        studentId: 'student1',
        status: RSVPStatus.CONFIRMED,
        waitlistPosition: 0,
        registeredAt: Timestamp.now(),
        paymentCompleted: true,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'rsvp1',
        data: () => ({
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: mockRSVP.registeredAt,
          paymentCompleted: true,
        }),
      });

      const result = await repository.getRSVPById('rsvp1');

      expect(result).toEqual(mockRSVP);
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return null when RSVP does not exist', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await repository.getRSVPById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw an error when getDoc fails', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(repository.getRSVPById('rsvp1')).rejects.toThrow(
        'Failed to get RSVP with ID rsvp1'
      );
    });
  });

  describe('getRSVPsByEvent', () => {
    it('should return all RSVPs for an event', async () => {
      const mockRSVPs = [
        {
          rsvpId: 'rsvp1',
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: Timestamp.now(),
          paymentCompleted: true,
        },
        {
          rsvpId: 'rsvp2',
          eventId: 'event1',
          studentId: 'student2',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: Timestamp.now(),
          paymentCompleted: true,
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockRSVPs.map((rsvp) => ({
          id: rsvp.rsvpId,
          data: () => ({
            eventId: rsvp.eventId,
            studentId: rsvp.studentId,
            status: rsvp.status,
            waitlistPosition: rsvp.waitlistPosition,
            registeredAt: rsvp.registeredAt,
            paymentCompleted: rsvp.paymentCompleted,
          }),
        })),
      });

      const result = await repository.getRSVPsByEvent('event1');

      expect(result).toHaveLength(2);
      expect(result[0].eventId).toBe('event1');
      expect(getDocs).toHaveBeenCalled();
    });

    it('should filter RSVPs by status when provided', async () => {
      const mockRSVPs = [
        {
          rsvpId: 'rsvp1',
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: Timestamp.now(),
          paymentCompleted: true,
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockRSVPs.map((rsvp) => ({
          id: rsvp.rsvpId,
          data: () => ({
            eventId: rsvp.eventId,
            studentId: rsvp.studentId,
            status: rsvp.status,
            waitlistPosition: rsvp.waitlistPosition,
            registeredAt: rsvp.registeredAt,
            paymentCompleted: rsvp.paymentCompleted,
          }),
        })),
      });

      const result = await repository.getRSVPsByEvent('event1', RSVPStatus.CONFIRMED);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(RSVPStatus.CONFIRMED);
    });

    it('should throw an error when getDocs fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(repository.getRSVPsByEvent('event1')).rejects.toThrow(
        'Failed to get RSVPs for event event1'
      );
    });
  });

  describe('getRSVPsByStudent', () => {
    it('should return all RSVPs for a student', async () => {
      const mockRSVPs = [
        {
          rsvpId: 'rsvp1',
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: Timestamp.now(),
          paymentCompleted: true,
        },
        {
          rsvpId: 'rsvp2',
          eventId: 'event2',
          studentId: 'student1',
          status: RSVPStatus.WAITLISTED,
          waitlistPosition: 1,
          registeredAt: Timestamp.now(),
          paymentCompleted: false,
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockRSVPs.map((rsvp) => ({
          id: rsvp.rsvpId,
          data: () => ({
            eventId: rsvp.eventId,
            studentId: rsvp.studentId,
            status: rsvp.status,
            waitlistPosition: rsvp.waitlistPosition,
            registeredAt: rsvp.registeredAt,
            paymentCompleted: rsvp.paymentCompleted,
          }),
        })),
      });

      const result = await repository.getRSVPsByStudent('student1');

      expect(result).toHaveLength(2);
      expect(result[0].studentId).toBe('student1');
      expect(getDocs).toHaveBeenCalled();
    });

    it('should filter RSVPs by status when provided', async () => {
      const mockRSVPs = [
        {
          rsvpId: 'rsvp1',
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: Timestamp.now(),
          paymentCompleted: true,
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockRSVPs.map((rsvp) => ({
          id: rsvp.rsvpId,
          data: () => ({
            eventId: rsvp.eventId,
            studentId: rsvp.studentId,
            status: rsvp.status,
            waitlistPosition: rsvp.waitlistPosition,
            registeredAt: rsvp.registeredAt,
            paymentCompleted: rsvp.paymentCompleted,
          }),
        })),
      });

      const result = await repository.getRSVPsByStudent('student1', RSVPStatus.CONFIRMED);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(RSVPStatus.CONFIRMED);
    });

    it('should throw an error when getDocs fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(repository.getRSVPsByStudent('student1')).rejects.toThrow(
        'Failed to get RSVPs for student student1'
      );
    });
  });

  describe('getWaitlistByEvent', () => {
    it('should return waitlisted RSVPs ordered by position', async () => {
      const mockRSVPs = [
        {
          rsvpId: 'rsvp1',
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.WAITLISTED,
          waitlistPosition: 1,
          registeredAt: Timestamp.now(),
          paymentCompleted: false,
        },
        {
          rsvpId: 'rsvp2',
          eventId: 'event1',
          studentId: 'student2',
          status: RSVPStatus.WAITLISTED,
          waitlistPosition: 2,
          registeredAt: Timestamp.now(),
          paymentCompleted: false,
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockRSVPs.map((rsvp) => ({
          id: rsvp.rsvpId,
          data: () => ({
            eventId: rsvp.eventId,
            studentId: rsvp.studentId,
            status: rsvp.status,
            waitlistPosition: rsvp.waitlistPosition,
            registeredAt: rsvp.registeredAt,
            paymentCompleted: rsvp.paymentCompleted,
          }),
        })),
      });

      const result = await repository.getWaitlistByEvent('event1');

      expect(result).toHaveLength(2);
      expect(result[0].waitlistPosition).toBe(1);
      expect(result[1].waitlistPosition).toBe(2);
      expect(result[0].status).toBe(RSVPStatus.WAITLISTED);
    });

    it('should return empty array when no waitlisted RSVPs exist', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
      });

      const result = await repository.getWaitlistByEvent('event1');

      expect(result).toHaveLength(0);
    });

    it('should throw an error when getDocs fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(repository.getWaitlistByEvent('event1')).rejects.toThrow(
        'Failed to get waitlist for event event1'
      );
    });
  });

  describe('getFirstWaitlistedRSVP', () => {
    it('should return the first waitlisted RSVP', async () => {
      const mockRSVP = {
        rsvpId: 'rsvp1',
        eventId: 'event1',
        studentId: 'student1',
        status: RSVPStatus.WAITLISTED,
        waitlistPosition: 1,
        registeredAt: Timestamp.now(),
        paymentCompleted: false,
      };

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: mockRSVP.rsvpId,
            data: () => ({
              eventId: mockRSVP.eventId,
              studentId: mockRSVP.studentId,
              status: mockRSVP.status,
              waitlistPosition: mockRSVP.waitlistPosition,
              registeredAt: mockRSVP.registeredAt,
              paymentCompleted: mockRSVP.paymentCompleted,
            }),
          },
        ],
      });

      const result = await repository.getFirstWaitlistedRSVP('event1');

      expect(result).not.toBeNull();
      expect(result?.waitlistPosition).toBe(1);
      expect(result?.status).toBe(RSVPStatus.WAITLISTED);
    });

    it('should return null when waitlist is empty', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await repository.getFirstWaitlistedRSVP('event1');

      expect(result).toBeNull();
    });

    it('should throw an error when getDocs fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(repository.getFirstWaitlistedRSVP('event1')).rejects.toThrow(
        'Failed to get first waitlisted RSVP for event event1'
      );
    });
  });

  describe('createRSVP', () => {
    it('should create a new RSVP', async () => {
      const newRSVP: Omit<RSVP, 'rsvpId'> = {
        eventId: 'event1',
        studentId: 'student1',
        status: RSVPStatus.CONFIRMED,
        waitlistPosition: 0,
        registeredAt: Timestamp.now(),
        paymentCompleted: true,
      };

      (addDoc as jest.Mock).mockResolvedValue({
        id: 'rsvp1',
      });

      const result = await repository.createRSVP(newRSVP);

      expect(result.rsvpId).toBe('rsvp1');
      expect(result.eventId).toBe('event1');
      expect(result.studentId).toBe('student1');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should set registeredAt to current time if not provided', async () => {
      const newRSVP: Omit<RSVP, 'rsvpId' | 'registeredAt'> & { registeredAt?: Timestamp } = {
        eventId: 'event1',
        studentId: 'student1',
        status: RSVPStatus.CONFIRMED,
        waitlistPosition: 0,
        paymentCompleted: true,
      };

      (addDoc as jest.Mock).mockResolvedValue({
        id: 'rsvp1',
      });

      const result = await repository.createRSVP(newRSVP as Omit<RSVP, 'rsvpId'>);

      expect(result.rsvpId).toBe('rsvp1');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should throw an error when addDoc fails', async () => {
      const newRSVP: Omit<RSVP, 'rsvpId'> = {
        eventId: 'event1',
        studentId: 'student1',
        status: RSVPStatus.CONFIRMED,
        waitlistPosition: 0,
        registeredAt: Timestamp.now(),
        paymentCompleted: true,
      };

      (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(repository.createRSVP(newRSVP)).rejects.toThrow('Failed to create RSVP');
    });
  });

  describe('updateRSVP', () => {
    it('should update an existing RSVP', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await repository.updateRSVP('rsvp1', { status: RSVPStatus.CANCELLED });

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw an error when updateDoc fails', async () => {
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        repository.updateRSVP('rsvp1', { status: RSVPStatus.CANCELLED })
      ).rejects.toThrow('Failed to update RSVP with ID rsvp1');
    });
  });

  describe('deleteRSVP', () => {
    it('should delete an RSVP', async () => {
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await repository.deleteRSVP('rsvp1');

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw an error when deleteDoc fails', async () => {
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(repository.deleteRSVP('rsvp1')).rejects.toThrow(
        'Failed to delete RSVP with ID rsvp1'
      );
    });
  });

  describe('getConfirmedRSVPs', () => {
    it('should return only confirmed RSVPs for an event', async () => {
      const mockRSVPs = [
        {
          rsvpId: 'rsvp1',
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: Timestamp.now(),
          paymentCompleted: true,
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockRSVPs.map((rsvp) => ({
          id: rsvp.rsvpId,
          data: () => ({
            eventId: rsvp.eventId,
            studentId: rsvp.studentId,
            status: rsvp.status,
            waitlistPosition: rsvp.waitlistPosition,
            registeredAt: rsvp.registeredAt,
            paymentCompleted: rsvp.paymentCompleted,
          }),
        })),
      });

      const result = await repository.getConfirmedRSVPs('event1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(RSVPStatus.CONFIRMED);
    });
  });

  describe('getRSVPByStudentAndEvent', () => {
    it('should return an RSVP for a specific student and event', async () => {
      const mockRSVP = {
        rsvpId: 'rsvp1',
        eventId: 'event1',
        studentId: 'student1',
        status: RSVPStatus.CONFIRMED,
        waitlistPosition: 0,
        registeredAt: Timestamp.now(),
        paymentCompleted: true,
      };

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: mockRSVP.rsvpId,
            data: () => ({
              eventId: mockRSVP.eventId,
              studentId: mockRSVP.studentId,
              status: mockRSVP.status,
              waitlistPosition: mockRSVP.waitlistPosition,
              registeredAt: mockRSVP.registeredAt,
              paymentCompleted: mockRSVP.paymentCompleted,
            }),
          },
        ],
      });

      const result = await repository.getRSVPByStudentAndEvent('student1', 'event1');

      expect(result).not.toBeNull();
      expect(result?.studentId).toBe('student1');
      expect(result?.eventId).toBe('event1');
    });

    it('should return null when no RSVP exists', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await repository.getRSVPByStudentAndEvent('student1', 'event1');

      expect(result).toBeNull();
    });

    it('should throw an error when getDocs fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        repository.getRSVPByStudentAndEvent('student1', 'event1')
      ).rejects.toThrow('Failed to get RSVP for student student1 and event event1');
    });
  });

  describe('countRSVPsByStatus', () => {
    it('should count RSVPs by status', async () => {
      const mockRSVPs = [
        {
          rsvpId: 'rsvp1',
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: Timestamp.now(),
          paymentCompleted: true,
        },
        {
          rsvpId: 'rsvp2',
          eventId: 'event1',
          studentId: 'student2',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: Timestamp.now(),
          paymentCompleted: true,
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockRSVPs.map((rsvp) => ({
          id: rsvp.rsvpId,
          data: () => ({
            eventId: rsvp.eventId,
            studentId: rsvp.studentId,
            status: rsvp.status,
            waitlistPosition: rsvp.waitlistPosition,
            registeredAt: rsvp.registeredAt,
            paymentCompleted: rsvp.paymentCompleted,
          }),
        })),
      });

      const result = await repository.countRSVPsByStatus('event1', RSVPStatus.CONFIRMED);

      expect(result).toBe(2);
    });

    it('should return 0 when no RSVPs match the status', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
      });

      const result = await repository.countRSVPsByStatus('event1', RSVPStatus.CONFIRMED);

      expect(result).toBe(0);
    });
  });

  describe('getAllRSVPs', () => {
    it('should return all RSVPs', async () => {
      const mockRSVPs = [
        {
          rsvpId: 'rsvp1',
          eventId: 'event1',
          studentId: 'student1',
          status: RSVPStatus.CONFIRMED,
          waitlistPosition: 0,
          registeredAt: Timestamp.now(),
          paymentCompleted: true,
        },
        {
          rsvpId: 'rsvp2',
          eventId: 'event2',
          studentId: 'student2',
          status: RSVPStatus.WAITLISTED,
          waitlistPosition: 1,
          registeredAt: Timestamp.now(),
          paymentCompleted: false,
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockRSVPs.map((rsvp) => ({
          id: rsvp.rsvpId,
          data: () => ({
            eventId: rsvp.eventId,
            studentId: rsvp.studentId,
            status: rsvp.status,
            waitlistPosition: rsvp.waitlistPosition,
            registeredAt: rsvp.registeredAt,
            paymentCompleted: rsvp.paymentCompleted,
          }),
        })),
      });

      const result = await repository.getAllRSVPs();

      expect(result).toHaveLength(2);
    });

    it('should throw an error when getDocs fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(repository.getAllRSVPs()).rejects.toThrow('Failed to get all RSVPs');
    });
  });
});
