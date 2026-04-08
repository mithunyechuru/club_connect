import { SubClubManager } from './subClubManager';
import { clubRepository } from '../repositories/clubRepository';
import { Club, ClubRole } from '../types';
import { Timestamp } from 'firebase/firestore';

// Mock the clubRepository
jest.mock('../repositories/clubRepository', () => ({
  clubRepository: {
    getClubById: jest.fn(),
    createClub: jest.fn(),
    updateClub: jest.fn(),
    getSubClubs: jest.fn(),
  },
}));

const mockedClubRepository = clubRepository as jest.Mocked<typeof clubRepository>;

describe('SubClubManager', () => {
  let subClubManager: SubClubManager;
  const mockTimestamp = Timestamp.now();

  const mockParentClub: Club = {
    clubId: 'parent1',
    name: 'Parent Club',
    description: 'A parent club',
    parentClubId: null,
    officerIds: ['officer1', 'officer2'],
    memberIds: ['officer1', 'officer2', 'member1'],
    memberRoles: {
      officer1: ClubRole.PRESIDENT,
      officer2: ClubRole.VICE_PRESIDENT,
      member1: ClubRole.MEMBER,
    },
    managerId: null,
    documentIds: [],
    category: 'Parent Category',
    createdAt: mockTimestamp,
  };

  beforeEach(() => {
    subClubManager = new SubClubManager();
    jest.clearAllMocks();
  });

  describe('createSubClub', () => {
    it('should create a sub-club with parent association (Requirement 4.1)', async () => {
      const mockSubClub: Club = {
        clubId: 'sub1',
        name: 'Sub Club',
        description: 'A sub-club',
        parentClubId: 'parent1',
        officerIds: ['officer1'],
        memberIds: ['officer1'],
        memberRoles: { officer1: ClubRole.PRESIDENT },
        managerId: null,
        documentIds: [],
        category: 'Sub Category',
        createdAt: mockTimestamp,
      };

      mockedClubRepository.getClubById.mockResolvedValue(mockParentClub);
      mockedClubRepository.createClub.mockResolvedValue(mockSubClub);

      const result = await subClubManager.createSubClub(
        'Sub Club',
        'A sub-club',
        'parent1',
        'officer1'
      );

      expect(result).toEqual(mockSubClub);
      expect(result.parentClubId).toBe('parent1');
      expect(clubRepository.createClub).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sub Club',
          description: 'A sub-club',
          parentClubId: 'parent1',
          officerIds: ['officer1'],
          memberIds: ['officer1'],
          memberRoles: { officer1: ClubRole.PRESIDENT },
        })
      );
    });

    it('should allow parent club officer to create sub-club (Requirement 4.2)', async () => {
      const mockSubClub: Club = {
        clubId: 'sub1',
        name: 'Sub Club',
        description: 'A sub-club',
        parentClubId: 'parent1',
        officerIds: ['officer2'],
        memberIds: ['officer2'],
        memberRoles: { officer2: ClubRole.PRESIDENT },
        managerId: null,
        documentIds: [],
        category: 'Sub Category',
        createdAt: mockTimestamp,
      };

      mockedClubRepository.getClubById.mockResolvedValue(mockParentClub);
      mockedClubRepository.createClub.mockResolvedValue(mockSubClub);

      const result = await subClubManager.createSubClub(
        'Sub Club',
        'A sub-club',
        'parent1',
        'officer2'
      );

      expect(result.parentClubId).toBe('parent1');
      expect(clubRepository.getClubById).toHaveBeenCalledWith('parent1');
    });

    it('should throw error when parent club does not exist', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(
        subClubManager.createSubClub('Sub Club', 'A sub-club', 'nonexistent', 'officer1')
      ).rejects.toThrow('Parent club not found');
    });

    it('should throw error when creator is not a parent club officer', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockParentClub);

      await expect(
        subClubManager.createSubClub('Sub Club', 'A sub-club', 'parent1', 'member1')
      ).rejects.toThrow('Only parent club officers can create sub-clubs');
    });

    it('should throw error when creator is not in parent club at all', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockParentClub);

      await expect(
        subClubManager.createSubClub('Sub Club', 'A sub-club', 'parent1', 'stranger')
      ).rejects.toThrow('Only parent club officers can create sub-clubs');
    });

    it('should throw error for invalid sub-club name', async () => {
      await expect(
        subClubManager.createSubClub('', 'Description', 'parent1', 'officer1')
      ).rejects.toThrow('Sub-club name cannot be empty');
    });

    it('should throw error for invalid sub-club description', async () => {
      await expect(
        subClubManager.createSubClub('Valid Name', '', 'parent1', 'officer1')
      ).rejects.toThrow('Sub-club description cannot be empty');
    });

    it('should throw error for missing parent club ID', async () => {
      await expect(
        subClubManager.createSubClub('Valid Name', 'Description', '', 'officer1')
      ).rejects.toThrow('Parent club ID is required for sub-clubs');
    });

    it('should trim whitespace from name and description', async () => {
      const mockSubClub: Club = {
        clubId: 'sub1',
        name: 'Sub Club',
        description: 'A sub-club',
        parentClubId: 'parent1',
        officerIds: ['officer1'],
        memberIds: ['officer1'],
        memberRoles: { officer1: ClubRole.PRESIDENT },
        managerId: null,
        documentIds: [],
        category: 'Sub Category',
        createdAt: mockTimestamp,
      };

      mockedClubRepository.getClubById.mockResolvedValue(mockParentClub);
      mockedClubRepository.createClub.mockResolvedValue(mockSubClub);

      await subClubManager.createSubClub(
        '  Sub Club  ',
        '  A sub-club  ',
        'parent1',
        'officer1'
      );

      expect(clubRepository.createClub).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sub Club',
          description: 'A sub-club',
        })
      );
    });
  });

  describe('hasSubClubManagementPermission', () => {
    const mockSubClub: Club = {
      clubId: 'sub1',
      name: 'Sub Club',
      description: 'A sub-club',
      parentClubId: 'parent1',
      officerIds: ['subOfficer1'],
      memberIds: ['subOfficer1', 'subMember1'],
      memberRoles: {
        subOfficer1: ClubRole.PRESIDENT,
        subMember1: ClubRole.MEMBER,
      },
      managerId: null,
      documentIds: [],
      category: 'Sub Category',
      createdAt: mockTimestamp,
    };

    it('should return true for sub-club officer', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockSubClub);

      const hasPermission = await subClubManager.hasSubClubManagementPermission(
        'sub1',
        'subOfficer1'
      );

      expect(hasPermission).toBe(true);
    });

    it('should return true for parent club officer (Requirement 4.2 - permission inheritance)', async () => {
      mockedClubRepository.getClubById
        .mockResolvedValueOnce(mockSubClub)
        .mockResolvedValueOnce(mockParentClub);

      const hasPermission = await subClubManager.hasSubClubManagementPermission(
        'sub1',
        'officer1'
      );

      expect(hasPermission).toBe(true);
      expect(clubRepository.getClubById).toHaveBeenCalledWith('sub1');
      expect(clubRepository.getClubById).toHaveBeenCalledWith('parent1');
    });

    it('should return false for sub-club member who is not an officer', async () => {
      mockedClubRepository.getClubById
        .mockResolvedValueOnce(mockSubClub)
        .mockResolvedValueOnce(mockParentClub);

      const hasPermission = await subClubManager.hasSubClubManagementPermission(
        'sub1',
        'subMember1'
      );

      expect(hasPermission).toBe(false);
    });

    it('should return false for parent club member who is not an officer', async () => {
      mockedClubRepository.getClubById
        .mockResolvedValueOnce(mockSubClub)
        .mockResolvedValueOnce(mockParentClub);

      const hasPermission = await subClubManager.hasSubClubManagementPermission(
        'sub1',
        'member1'
      );

      expect(hasPermission).toBe(false);
    });

    it('should return false for non-existent sub-club', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      const hasPermission = await subClubManager.hasSubClubManagementPermission(
        'nonexistent',
        'officer1'
      );

      expect(hasPermission).toBe(false);
    });

    it('should return false for club without parent', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockParentClub);

      const hasPermission = await subClubManager.hasSubClubManagementPermission(
        'parent1',
        'stranger'
      );

      expect(hasPermission).toBe(false);
    });

    it('should return false when parent club does not exist', async () => {
      mockedClubRepository.getClubById
        .mockResolvedValueOnce(mockSubClub)
        .mockResolvedValueOnce(null);

      const hasPermission = await subClubManager.hasSubClubManagementPermission(
        'sub1',
        'officer1'
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('addMemberToSubClub', () => {
    const mockSubClub: Club = {
      clubId: 'sub1',
      name: 'Sub Club',
      description: 'A sub-club',
      parentClubId: 'parent1',
      officerIds: ['subOfficer1'],
      memberIds: ['subOfficer1'],
      memberRoles: {
        subOfficer1: ClubRole.PRESIDENT,
      },
      managerId: null,
      documentIds: [],
      category: 'Sub Category',
      createdAt: mockTimestamp,
    };

    it('should add member to sub-club and automatically to parent club (Requirement 4.3)', async () => {
      mockedClubRepository.getClubById
        .mockResolvedValueOnce(mockSubClub)
        .mockResolvedValueOnce(mockParentClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await subClubManager.addMemberToSubClub('sub1', 'newUser', ClubRole.MEMBER);

      // Verify parent club was updated
      expect(clubRepository.updateClub).toHaveBeenCalledWith('parent1', {
        memberIds: ['officer1', 'officer2', 'member1', 'newUser'],
        memberRoles: {
          officer1: ClubRole.PRESIDENT,
          officer2: ClubRole.VICE_PRESIDENT,
          member1: ClubRole.MEMBER,
          newUser: ClubRole.MEMBER,
        },
      });

      // Verify sub-club was updated
      expect(clubRepository.updateClub).toHaveBeenCalledWith('sub1', {
        memberIds: ['subOfficer1', 'newUser'],
        memberRoles: {
          subOfficer1: ClubRole.PRESIDENT,
          newUser: ClubRole.MEMBER,
        },
        officerIds: ['subOfficer1'],
      });
    });

    it('should not add to parent club if already a member', async () => {
      mockedClubRepository.getClubById
        .mockResolvedValueOnce(mockSubClub)
        .mockResolvedValueOnce(mockParentClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      // member1 is already in parent club
      await subClubManager.addMemberToSubClub('sub1', 'member1', ClubRole.MEMBER);

      // Verify parent club was NOT updated (only one updateClub call for sub-club)
      expect(clubRepository.updateClub).toHaveBeenCalledTimes(1);
      expect(clubRepository.updateClub).toHaveBeenCalledWith('sub1', {
        memberIds: ['subOfficer1', 'member1'],
        memberRoles: {
          subOfficer1: ClubRole.PRESIDENT,
          member1: ClubRole.MEMBER,
        },
        officerIds: ['subOfficer1'],
      });
    });

    it('should add member with officer role to sub-club', async () => {
      mockedClubRepository.getClubById
        .mockResolvedValueOnce(mockSubClub)
        .mockResolvedValueOnce(mockParentClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await subClubManager.addMemberToSubClub('sub1', 'newOfficer', ClubRole.SECRETARY);

      // Verify sub-club was updated with officer role
      expect(clubRepository.updateClub).toHaveBeenCalledWith('sub1', {
        memberIds: ['subOfficer1', 'newOfficer'],
        memberRoles: {
          subOfficer1: ClubRole.PRESIDENT,
          newOfficer: ClubRole.SECRETARY,
        },
        officerIds: ['subOfficer1', 'newOfficer'],
      });
    });

    it('should throw error when sub-club does not exist', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(
        subClubManager.addMemberToSubClub('nonexistent', 'newUser', ClubRole.MEMBER)
      ).rejects.toThrow('Sub-club not found');
    });

    it('should throw error when club is not a sub-club', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockParentClub);

      await expect(
        subClubManager.addMemberToSubClub('parent1', 'newUser', ClubRole.MEMBER)
      ).rejects.toThrow('This is not a sub-club');
    });

    it('should throw error when user is already a member of sub-club', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockSubClub);

      await expect(
        subClubManager.addMemberToSubClub('sub1', 'subOfficer1', ClubRole.MEMBER)
      ).rejects.toThrow('User is already a member of this sub-club');
    });

    it('should throw error when parent club does not exist', async () => {
      mockedClubRepository.getClubById
        .mockResolvedValueOnce(mockSubClub)
        .mockResolvedValueOnce(null);

      await expect(
        subClubManager.addMemberToSubClub('sub1', 'newUser', ClubRole.MEMBER)
      ).rejects.toThrow('Parent club not found');
    });
  });

  describe('getSubClubs', () => {
    it('should return all sub-clubs of a parent club', async () => {
      const mockSubClubs: Club[] = [
        {
          clubId: 'sub1',
          name: 'Sub Club 1',
          description: 'First sub-club',
          parentClubId: 'parent1',
          officerIds: ['officer1'],
          memberIds: ['officer1'],
          memberRoles: { officer1: ClubRole.PRESIDENT },
          managerId: null,
          documentIds: [],
          category: 'Sub Category',
          createdAt: mockTimestamp,
        },
        {
          clubId: 'sub2',
          name: 'Sub Club 2',
          description: 'Second sub-club',
          parentClubId: 'parent1',
          officerIds: ['officer2'],
          memberIds: ['officer2'],
          memberRoles: { officer2: ClubRole.PRESIDENT },
          managerId: null,
          documentIds: [],
          category: 'Sub Category',
          createdAt: mockTimestamp,
        },
      ];

      mockedClubRepository.getSubClubs.mockResolvedValue(mockSubClubs);

      const result = await subClubManager.getSubClubs('parent1');

      expect(result).toEqual(mockSubClubs);
      expect(clubRepository.getSubClubs).toHaveBeenCalledWith('parent1');
    });
  });

  describe('getParentClub', () => {
    const mockSubClub: Club = {
      clubId: 'sub1',
      name: 'Sub Club',
      description: 'A sub-club',
      parentClubId: 'parent1',
      officerIds: ['officer1'],
      memberIds: ['officer1'],
      memberRoles: { officer1: ClubRole.PRESIDENT },
      managerId: null,
      documentIds: [],
      category: 'Sub Category',
      createdAt: mockTimestamp,
    };

    it('should return parent club of a sub-club', async () => {
      mockedClubRepository.getClubById
        .mockResolvedValueOnce(mockSubClub)
        .mockResolvedValueOnce(mockParentClub);

      const result = await subClubManager.getParentClub('sub1');

      expect(result).toEqual(mockParentClub);
      expect(clubRepository.getClubById).toHaveBeenCalledWith('sub1');
      expect(clubRepository.getClubById).toHaveBeenCalledWith('parent1');
    });

    it('should return null for club without parent', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockParentClub);

      const result = await subClubManager.getParentClub('parent1');

      expect(result).toBeNull();
    });

    it('should return null for non-existent club', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      const result = await subClubManager.getParentClub('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('isSubClub', () => {
    const mockSubClub: Club = {
      clubId: 'sub1',
      name: 'Sub Club',
      description: 'A sub-club',
      parentClubId: 'parent1',
      officerIds: ['officer1'],
      memberIds: ['officer1'],
      memberRoles: { officer1: ClubRole.PRESIDENT },
      managerId: null,
      documentIds: [],
      category: 'Sub Category',
      createdAt: mockTimestamp,
    };

    it('should return true for a sub-club', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockSubClub);

      const result = await subClubManager.isSubClub('sub1');

      expect(result).toBe(true);
    });

    it('should return false for a parent club', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockParentClub);

      const result = await subClubManager.isSubClub('parent1');

      expect(result).toBe(false);
    });

    it('should return false for non-existent club', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      const result = await subClubManager.isSubClub('nonexistent');

      expect(result).toBe(false);
    });
  });
});
