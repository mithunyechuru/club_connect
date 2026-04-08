import { Timestamp } from 'firebase/firestore';
import { membershipRequestRepository } from './membershipRequestRepository';
import { MembershipRequest, RequestStatus } from '../types';

// Mock Firestore
jest.mock('../services/firebase', () => ({
  db: {},
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

describe('MembershipRequestRepository', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRequestById', () => {
    it('should return request if found', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'req1',
        data: () => ({
          studentId: 'student1',
          clubId: 'club1',
          status: RequestStatus.PENDING,
          message: 'I would like to join',
          requestedAt: Timestamp.now(),
        }),
      };

      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await membershipRequestRepository.getRequestById('req1');

      expect(result).toEqual(expect.objectContaining({
        requestId: 'req1',
        studentId: 'student1',
        clubId: 'club1',
      }));
    });

    it('should return null if request not found', async () => {
      const mockDocSnap = {
        exists: () => false,
      };

      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await membershipRequestRepository.getRequestById('req1');

      expect(result).toBeNull();
    });

    it('should throw error on failure', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        membershipRequestRepository.getRequestById('req1')
      ).rejects.toThrow('Failed to get membership request with ID req1');
    });
  });

  describe('getPendingRequestsByClub', () => {
    it('should return pending requests for a club', async () => {
      const mockQuerySnapshot = {
        docs: [
          {
            id: 'req1',
            data: () => ({
              studentId: 'student1',
              clubId: 'club1',
              status: RequestStatus.PENDING,
              message: 'Message 1',
              requestedAt: Timestamp.now(),
            }),
          },
          {
            id: 'req2',
            data: () => ({
              studentId: 'student2',
              clubId: 'club1',
              status: RequestStatus.PENDING,
              message: 'Message 2',
              requestedAt: Timestamp.now(),
            }),
          },
        ],
      };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await membershipRequestRepository.getPendingRequestsByClub('club1');

      expect(result).toHaveLength(2);
      expect(result[0].requestId).toBe('req1');
      expect(result[1].requestId).toBe('req2');
    });

    it('should throw error on failure', async () => {
      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        membershipRequestRepository.getPendingRequestsByClub('club1')
      ).rejects.toThrow('Failed to get pending requests for club club1');
    });
  });

  describe('getRequestsByStudent', () => {
    it('should return all requests by a student', async () => {
      const mockQuerySnapshot = {
        docs: [
          {
            id: 'req1',
            data: () => ({
              studentId: 'student1',
              clubId: 'club1',
              status: RequestStatus.PENDING,
              message: 'Message 1',
              requestedAt: Timestamp.now(),
            }),
          },
        ],
      };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await membershipRequestRepository.getRequestsByStudent('student1');

      expect(result).toHaveLength(1);
      expect(result[0].studentId).toBe('student1');
    });
  });

  describe('getPendingRequestByStudentAndClub', () => {
    it('should return pending request if exists', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            id: 'req1',
            data: () => ({
              studentId: 'student1',
              clubId: 'club1',
              status: RequestStatus.PENDING,
              message: 'Message',
              requestedAt: Timestamp.now(),
            }),
          },
        ],
      };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await membershipRequestRepository.getPendingRequestByStudentAndClub(
        'student1',
        'club1'
      );

      expect(result).not.toBeNull();
      expect(result?.requestId).toBe('req1');
    });

    it('should return null if no pending request exists', async () => {
      const mockQuerySnapshot = {
        empty: true,
        docs: [],
      };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await membershipRequestRepository.getPendingRequestByStudentAndClub(
        'student1',
        'club1'
      );

      expect(result).toBeNull();
    });
  });

  describe('createRequest', () => {
    it('should create a new request', async () => {
      const mockDocRef = { id: 'req1' };
      (collection as jest.Mock).mockReturnValue({});
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const requestData: Omit<MembershipRequest, 'requestId'> = {
        studentId: 'student1',
        clubId: 'club1',
        status: RequestStatus.PENDING,
        message: 'Message',
        requestedAt: Timestamp.now(),
      };

      const result = await membershipRequestRepository.createRequest(requestData);

      expect(result.requestId).toBe('req1');
      expect(result.studentId).toBe('student1');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      (collection as jest.Mock).mockReturnValue({});
      (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      const requestData: Omit<MembershipRequest, 'requestId'> = {
        studentId: 'student1',
        clubId: 'club1',
        status: RequestStatus.PENDING,
        message: 'Message',
        requestedAt: Timestamp.now(),
      };

      await expect(
        membershipRequestRepository.createRequest(requestData)
      ).rejects.toThrow('Failed to create membership request');
    });
  });

  describe('updateRequest', () => {
    it('should update a request', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await membershipRequestRepository.updateRequest('req1', {
        status: RequestStatus.APPROVED,
      });

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        membershipRequestRepository.updateRequest('req1', { status: RequestStatus.APPROVED })
      ).rejects.toThrow('Failed to update membership request with ID req1');
    });
  });

  describe('deleteRequest', () => {
    it('should delete a request', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await membershipRequestRepository.deleteRequest('req1');

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        membershipRequestRepository.deleteRequest('req1')
      ).rejects.toThrow('Failed to delete membership request with ID req1');
    });
  });

  describe('getAllRequestsByClub', () => {
    it('should return all requests for a club', async () => {
      const mockQuerySnapshot = {
        docs: [
          {
            id: 'req1',
            data: () => ({
              studentId: 'student1',
              clubId: 'club1',
              status: RequestStatus.APPROVED,
              message: 'Message 1',
              requestedAt: Timestamp.now(),
            }),
          },
          {
            id: 'req2',
            data: () => ({
              studentId: 'student2',
              clubId: 'club1',
              status: RequestStatus.PENDING,
              message: 'Message 2',
              requestedAt: Timestamp.now(),
            }),
          },
        ],
      };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await membershipRequestRepository.getAllRequestsByClub('club1');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(RequestStatus.APPROVED);
      expect(result[1].status).toBe(RequestStatus.PENDING);
    });
  });
});
