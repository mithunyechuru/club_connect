import { Timestamp } from 'firebase/firestore';
import { membershipService } from './membershipService';
import { clubRepository } from '../repositories/clubRepository';
import { membershipRequestRepository } from '../repositories/membershipRequestRepository';
import { clubService } from './clubService';
import { Club, ClubRole, MembershipRequest, RequestStatus } from '../types';

// Mock dependencies
jest.mock('../repositories/clubRepository');
jest.mock('../repositories/membershipRequestRepository');
jest.mock('./clubService');

describe('MembershipService', () => {
  const mockClub: Club = {
    clubId: 'club1',
    name: 'Test Club',
    description: 'A test club',
    parentClubId: null,
    officerIds: ['officer1'],
    memberIds: ['officer1'],
    memberRoles: { officer1: ClubRole.PRESIDENT },
    documentIds: [],
    managerId: null,
    category: 'Test Category',
    createdAt: Timestamp.now(),
  };

  const mockRequest: MembershipRequest = {
    requestId: 'req1',
    studentId: 'student1',
    clubId: 'club1',
    status: RequestStatus.PENDING,
    message: 'I would like to join',
    requestedAt: Timestamp.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitMembershipRequest', () => {
    it('should create a pending membership request', async () => {
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);
      (membershipRequestRepository.getPendingRequestByStudentAndClub as jest.Mock).mockResolvedValue(null);
      (membershipRequestRepository.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      const result = await membershipService.submitMembershipRequest(
        'student1',
        'club1',
        'I would like to join'
      );

      expect(result).toEqual(mockRequest);
      expect(clubRepository.getClubById).toHaveBeenCalledWith('club1');
      expect(membershipRequestRepository.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student1',
          clubId: 'club1',
          status: RequestStatus.PENDING,
          message: 'I would like to join',
        })
      );
    });

    it('should throw error if club not found', async () => {
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(null);

      await expect(
        membershipService.submitMembershipRequest('student1', 'club1', 'message')
      ).rejects.toThrow('Club not found');
    });

    it('should throw error if student is already a member', async () => {
      const clubWithStudent = {
        ...mockClub,
        memberIds: ['officer1', 'student1'],
      };
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(clubWithStudent);

      await expect(
        membershipService.submitMembershipRequest('student1', 'club1', 'message')
      ).rejects.toThrow('Student is already a member of this club');
    });

    it('should throw error if pending request already exists', async () => {
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);
      (membershipRequestRepository.getPendingRequestByStudentAndClub as jest.Mock).mockResolvedValue(mockRequest);

      await expect(
        membershipService.submitMembershipRequest('student1', 'club1', 'message')
      ).rejects.toThrow('A pending membership request already exists for this club');
    });

    it('should throw error if message is too long', async () => {
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);
      (membershipRequestRepository.getPendingRequestByStudentAndClub as jest.Mock).mockResolvedValue(null);

      const longMessage = 'a'.repeat(501);
      await expect(
        membershipService.submitMembershipRequest('student1', 'club1', longMessage)
      ).rejects.toThrow('Message is too long (maximum 500 characters)');
    });

    it('should trim message whitespace', async () => {
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);
      (membershipRequestRepository.getPendingRequestByStudentAndClub as jest.Mock).mockResolvedValue(null);
      (membershipRequestRepository.createRequest as jest.Mock).mockResolvedValue(mockRequest);

      await membershipService.submitMembershipRequest('student1', 'club1', '  message  ');

      expect(membershipRequestRepository.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'message',
        })
      );
    });
  });

  describe('approveMembershipRequest', () => {
    it('should approve request and add student to club', async () => {
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(mockRequest);
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);
      (clubService.addMember as jest.Mock).mockResolvedValue(undefined);
      (membershipRequestRepository.updateRequest as jest.Mock).mockResolvedValue(undefined);

      await membershipService.approveMembershipRequest('req1', 'officer1');

      expect(membershipRequestRepository.getRequestById).toHaveBeenCalledWith('req1');
      expect(clubService.addMember).toHaveBeenCalledWith('club1', 'student1', ClubRole.MEMBER);
      expect(membershipRequestRepository.updateRequest).toHaveBeenCalledWith(
        'req1',
        expect.objectContaining({
          status: RequestStatus.APPROVED,
        })
      );
    });

    it('should throw error if request not found', async () => {
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(null);

      await expect(
        membershipService.approveMembershipRequest('req1', 'officer1')
      ).rejects.toThrow('Membership request not found');
    });

    it('should throw error if request is not pending', async () => {
      const approvedRequest = { ...mockRequest, status: RequestStatus.APPROVED };
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(approvedRequest);

      await expect(
        membershipService.approveMembershipRequest('req1', 'officer1')
      ).rejects.toThrow('Membership request is not pending');
    });

    it('should throw error if approver is not an officer', async () => {
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(mockRequest);
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);

      await expect(
        membershipService.approveMembershipRequest('req1', 'notOfficer')
      ).rejects.toThrow('Only club officers can approve membership requests');
    });

    it('should validate tier assignment if provided', async () => {
      const clubWithTier = {
        ...mockClub,
        tierConfig: { name: 'Gold', benefits: ['benefit1'] },
      };
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(mockRequest);
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(clubWithTier);
      (clubService.addMember as jest.Mock).mockResolvedValue(undefined);
      (membershipRequestRepository.updateRequest as jest.Mock).mockResolvedValue(undefined);

      await membershipService.approveMembershipRequest('req1', 'officer1', 'Gold');

      expect(clubService.addMember).toHaveBeenCalled();
    });

    it('should throw error for invalid tier assignment', async () => {
      const clubWithTier = {
        ...mockClub,
        tierConfig: { name: 'Gold', benefits: ['benefit1'] },
      };
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(mockRequest);
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(clubWithTier);

      await expect(
        membershipService.approveMembershipRequest('req1', 'officer1', 'Silver')
      ).rejects.toThrow('Invalid tier assignment');
    });
  });

  describe('rejectMembershipRequest', () => {
    it('should reject request and delete it', async () => {
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(mockRequest);
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);
      (membershipRequestRepository.updateRequest as jest.Mock).mockResolvedValue(undefined);
      (membershipRequestRepository.deleteRequest as jest.Mock).mockResolvedValue(undefined);

      await membershipService.rejectMembershipRequest('req1', 'officer1');

      expect(membershipRequestRepository.updateRequest).toHaveBeenCalledWith(
        'req1',
        expect.objectContaining({
          status: RequestStatus.REJECTED,
        })
      );
      expect(membershipRequestRepository.deleteRequest).toHaveBeenCalledWith('req1');
    });

    it('should throw error if request not found', async () => {
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(null);

      await expect(
        membershipService.rejectMembershipRequest('req1', 'officer1')
      ).rejects.toThrow('Membership request not found');
    });

    it('should throw error if request is not pending', async () => {
      const rejectedRequest = { ...mockRequest, status: RequestStatus.REJECTED };
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(rejectedRequest);

      await expect(
        membershipService.rejectMembershipRequest('req1', 'officer1')
      ).rejects.toThrow('Membership request is not pending');
    });

    it('should throw error if rejecter is not an officer', async () => {
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(mockRequest);
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);

      await expect(
        membershipService.rejectMembershipRequest('req1', 'notOfficer')
      ).rejects.toThrow('Only club officers can reject membership requests');
    });

    it('should include reason in notification if provided', async () => {
      (membershipRequestRepository.getRequestById as jest.Mock).mockResolvedValue(mockRequest);
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);
      (membershipRequestRepository.updateRequest as jest.Mock).mockResolvedValue(undefined);
      (membershipRequestRepository.deleteRequest as jest.Mock).mockResolvedValue(undefined);

      // Spy on console.log to verify notification
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await membershipService.rejectMembershipRequest('req1', 'officer1', 'Not qualified');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reason: Not qualified')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getPendingRequestsByClub', () => {
    it('should return pending requests for a club', async () => {
      const requests = [mockRequest];
      (membershipRequestRepository.getPendingRequestsByClub as jest.Mock).mockResolvedValue(requests);

      const result = await membershipService.getPendingRequestsByClub('club1');

      expect(result).toEqual(requests);
      expect(membershipRequestRepository.getPendingRequestsByClub).toHaveBeenCalledWith('club1');
    });
  });

  describe('getRequestsByStudent', () => {
    it('should return all requests by a student', async () => {
      const requests = [mockRequest];
      (membershipRequestRepository.getRequestsByStudent as jest.Mock).mockResolvedValue(requests);

      const result = await membershipService.getRequestsByStudent('student1');

      expect(result).toEqual(requests);
      expect(membershipRequestRepository.getRequestsByStudent).toHaveBeenCalledWith('student1');
    });
  });
});
