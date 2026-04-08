import { ClubService } from './clubService';
import { clubRepository } from '../repositories/clubRepository';
import { Club, ClubRole } from '../types';
import { Timestamp, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

jest.mock('./firebase', () => ({
  db: {},
}));

// Mock the clubRepository
jest.mock('../repositories/clubRepository', () => ({
  clubRepository: {
    getClubById: jest.fn(),
    createClub: jest.fn(),
    updateClub: jest.fn(),
    deleteClub: jest.fn(),
    getClubsByMember: jest.fn(),
    getClubsByOfficer: jest.fn(),
    getSubClubs: jest.fn(),
  },
}));

const mockedClubRepository = clubRepository as jest.Mocked<typeof clubRepository>;

describe('ClubService', () => {
  let clubService: ClubService;
  const mockTimestamp = Timestamp.now();

  beforeEach(() => {
    clubService = new ClubService();
    jest.clearAllMocks();
  });

  describe('createClub', () => {
    it('should create a club with creator as president', async () => {
      const mockClub: Club = {
        clubId: 'club1',
        name: 'Test Club',
        description: 'A test club',
        parentClubId: null,
        officerIds: ['user1'],
        memberIds: ['user1'],
        memberRoles: { user1: ClubRole.PRESIDENT },
        managerId: null,
        documentIds: [],
        category: 'Test Category',
        createdAt: mockTimestamp,
      };

      mockedClubRepository.createClub.mockResolvedValue(mockClub);

      const result = await clubService.createClub(
        'Test Club',
        'A test club',
        'user1'
      );

      expect(result).toEqual(mockClub);
      expect(clubRepository.createClub).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Club',
          description: 'A test club',
          parentClubId: null,
          officerIds: ['user1'],
          memberIds: ['user1'],
          memberRoles: { user1: ClubRole.PRESIDENT },
        })
      );
    });

    it('should create a sub-club when parent club exists', async () => {
      const parentClub: Club = {
        clubId: 'parent1',
        name: 'Parent Club',
        description: 'Parent',
        parentClubId: null,
        officerIds: ['user1'],
        memberIds: ['user1'],
        memberRoles: { user1: ClubRole.PRESIDENT },
        managerId: null,
        documentIds: [],
        category: 'Test Category',
        createdAt: mockTimestamp,
      };

      const subClub: Club = {
        clubId: 'sub1',
        name: 'Sub Club',
        description: 'Sub',
        parentClubId: 'parent1',
        officerIds: ['user2'],
        memberIds: ['user2'],
        memberRoles: { user2: ClubRole.PRESIDENT },
        managerId: null,
        documentIds: [],
        category: 'Test Category',
        createdAt: mockTimestamp,
      };

      mockedClubRepository.getClubById.mockResolvedValue(parentClub);
      mockedClubRepository.createClub.mockResolvedValue(subClub);

      const result = await clubService.createClub(
        'Sub Club',
        'Sub',
        'user2',
        'parent1'
      );

      expect(result.parentClubId).toBe('parent1');
      expect(clubRepository.getClubById).toHaveBeenCalledWith('parent1');
    });

    it('should throw error when parent club does not exist', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(
        clubService.createClub('Sub Club', 'Sub', 'user2', 'nonexistent')
      ).rejects.toThrow('Parent club not found');
    });

    it('should throw error for invalid club name', async () => {
      await expect(
        clubService.createClub('', 'Description', 'user1')
      ).rejects.toThrow('Club name cannot be empty');
    });

    it('should throw error for invalid club description', async () => {
      await expect(
        clubService.createClub('Valid Name', '', 'user1')
      ).rejects.toThrow('Club description cannot be empty');
    });

    it('should trim whitespace from name and description', async () => {
      const mockClub: Club = {
        clubId: 'club1',
        name: 'Test Club',
        description: 'A test club',
        parentClubId: null,
        officerIds: ['user1'],
        memberIds: ['user1'],
        memberRoles: { user1: ClubRole.PRESIDENT },
        managerId: null,
        documentIds: [],
        category: 'Test Category',
        createdAt: mockTimestamp,
      };

      mockedClubRepository.createClub.mockResolvedValue(mockClub);

      await clubService.createClub('  Test Club  ', '  A test club  ', 'user1');

      expect(clubRepository.createClub).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Club',
          description: 'A test club',
        })
      );
    });
  });

  describe('updateClub', () => {
    const mockClub: Club = {
      clubId: 'club1',
      name: 'Test Club',
      description: 'A test club',
      parentClubId: null,
      officerIds: ['user1'],
      memberIds: ['user1'],
      memberRoles: { user1: ClubRole.PRESIDENT },
      managerId: null,
      documentIds: [],
      category: 'Test Category',
      createdAt: mockTimestamp,
    };

    it('should update club name', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await clubService.updateClub('club1', { name: 'Updated Name' });

      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        name: 'Updated Name',
      });
    });

    it('should update club description', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await clubService.updateClub('club1', { description: 'Updated Description' });

      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        description: 'Updated Description',
      });
    });

    it('should throw error when club not found', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(
        clubService.updateClub('nonexistent', { name: 'New Name' })
      ).rejects.toThrow('Club not found');
    });

    it('should throw error for invalid name', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      await expect(
        clubService.updateClub('club1', { name: '' })
      ).rejects.toThrow('Club name cannot be empty');
    });

    it('should throw error for invalid description', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      await expect(
        clubService.updateClub('club1', { description: '' })
      ).rejects.toThrow('Club description cannot be empty');
    });
  });

  describe('deleteClub', () => {
    const mockClub: Club = {
      clubId: 'club1',
      name: 'Test Club',
      description: 'A test club',
      parentClubId: null,
      officerIds: ['user1'],
      memberIds: ['user1'],
      memberRoles: { user1: ClubRole.PRESIDENT },
      managerId: null,
      documentIds: [],
      category: 'Test Category',
      createdAt: mockTimestamp,
    };

    it('should delete a club without sub-clubs', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.getSubClubs.mockResolvedValue([]);
      mockedClubRepository.deleteClub.mockResolvedValue();

      await clubService.deleteClub('club1');

      expect(clubRepository.deleteClub).toHaveBeenCalledWith('club1');
    });

    it('should throw error when club not found', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(clubService.deleteClub('nonexistent')).rejects.toThrow(
        'Club not found'
      );
    });

    it('should throw error when club has sub-clubs', async () => {
      const subClub: Club = {
        clubId: 'sub1',
        name: 'Sub Club',
        description: 'Sub',
        parentClubId: 'club1',
        officerIds: ['user2'],
        memberIds: ['user2'],
        memberRoles: { user2: ClubRole.PRESIDENT },
        managerId: null,
        documentIds: [],
        category: 'Test Category',
        createdAt: mockTimestamp,
      };

      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.getSubClubs.mockResolvedValue([subClub]);

      await expect(clubService.deleteClub('club1')).rejects.toThrow(
        'Cannot delete club with existing sub-clubs'
      );
    });
  });

  describe('addMember', () => {
    const mockClub: Club = {
      clubId: 'club1',
      name: 'Test Club',
      description: 'A test club',
      parentClubId: null,
      officerIds: ['user1'],
      memberIds: ['user1'],
      memberRoles: { user1: ClubRole.PRESIDENT },
      managerId: null,
      documentIds: [],
      category: 'Test Category',
      createdAt: mockTimestamp,
    };

    it('should add a member with default MEMBER role', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await clubService.addMember('club1', 'user2');

      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        memberIds: ['user1', 'user2'],
        memberRoles: { user1: ClubRole.PRESIDENT, user2: ClubRole.MEMBER },
        officerIds: ['user1'],
      });
    });

    it('should add a member with officer role', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await clubService.addMember('club1', 'user2', ClubRole.VICE_PRESIDENT);

      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        memberIds: ['user1', 'user2'],
        memberRoles: {
          user1: ClubRole.PRESIDENT,
          user2: ClubRole.VICE_PRESIDENT,
        },
        officerIds: ['user1', 'user2'],
      });
    });

    it('should throw error when club not found', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(clubService.addMember('nonexistent', 'user2')).rejects.toThrow(
        'Club not found'
      );
    });

    it('should throw error when user is already a member', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      await expect(clubService.addMember('club1', 'user1')).rejects.toThrow(
        'User is already a member of this club'
      );
    });
  });

  describe('removeMember', () => {
    const mockClub: Club = {
      clubId: 'club1',
      name: 'Test Club',
      description: 'A test club',
      parentClubId: null,
      officerIds: ['user1', 'user2'],
      memberIds: ['user1', 'user2', 'user3'],
      memberRoles: {
        user1: ClubRole.PRESIDENT,
        user2: ClubRole.VICE_PRESIDENT,
        user3: ClubRole.MEMBER,
      },
      documentIds: [],
      managerId: null,
      category: 'Test Category',
      createdAt: mockTimestamp,
    };

    it('should remove a regular member', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await clubService.removeMember('club1', 'user3');

      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        memberIds: ['user1', 'user2'],
        officerIds: ['user1', 'user2'],
        memberRoles: {
          user1: ClubRole.PRESIDENT,
          user2: ClubRole.VICE_PRESIDENT,
        },
      });
    });

    it('should remove an officer when other officers exist', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await clubService.removeMember('club1', 'user2');

      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        memberIds: ['user1', 'user3'],
        officerIds: ['user1'],
        memberRoles: {
          user1: ClubRole.PRESIDENT,
          user3: ClubRole.MEMBER,
        },
      });
    });

    it('should throw error when club not found', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(clubService.removeMember('nonexistent', 'user2')).rejects.toThrow(
        'Club not found'
      );
    });

    it('should throw error when user is not a member', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      await expect(clubService.removeMember('club1', 'user999')).rejects.toThrow(
        'User is not a member of this club'
      );
    });

    it('should throw error when removing the last officer', async () => {
      const singleOfficerClub: Club = {
        ...mockClub,
        officerIds: ['user1'],
        memberIds: ['user1', 'user3'],
      };

      mockedClubRepository.getClubById.mockResolvedValue(singleOfficerClub);

      await expect(clubService.removeMember('club1', 'user1')).rejects.toThrow(
        'Cannot remove the last officer from the club'
      );
    });
  });

  describe('assignMemberRole', () => {
    const mockClub: Club = {
      clubId: 'club1',
      name: 'Test Club',
      description: 'A test club',
      parentClubId: null,
      officerIds: ['user1', 'user2'],
      memberIds: ['user1', 'user2', 'user3'],
      memberRoles: {
        user1: ClubRole.PRESIDENT,
        user2: ClubRole.VICE_PRESIDENT,
        user3: ClubRole.MEMBER,
      },
      documentIds: [],
      managerId: null,
      category: 'Test Category',
      createdAt: mockTimestamp,
    };

    it('should promote a member to officer', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await clubService.assignMemberRole('club1', 'user3', ClubRole.SECRETARY);

      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        memberRoles: {
          user1: ClubRole.PRESIDENT,
          user2: ClubRole.VICE_PRESIDENT,
          user3: ClubRole.SECRETARY,
        },
        officerIds: ['user1', 'user2', 'user3'],
      });
    });

    it('should demote an officer to member', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await clubService.assignMemberRole('club1', 'user2', ClubRole.MEMBER);

      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        memberRoles: {
          user1: ClubRole.PRESIDENT,
          user2: ClubRole.MEMBER,
          user3: ClubRole.MEMBER,
        },
        officerIds: ['user1'],
      });
    });

    it('should change officer role to another officer role', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      mockedClubRepository.updateClub.mockResolvedValue();

      await clubService.assignMemberRole('club1', 'user2', ClubRole.SECRETARY);

      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        memberRoles: {
          user1: ClubRole.PRESIDENT,
          user2: ClubRole.SECRETARY,
          user3: ClubRole.MEMBER,
        },
        officerIds: ['user1', 'user2'],
      });
    });

    it('should throw error when club not found', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(
        clubService.assignMemberRole('nonexistent', 'user2', ClubRole.MEMBER)
      ).rejects.toThrow('Club not found');
    });

    it('should throw error when user is not a member', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      await expect(
        clubService.assignMemberRole('club1', 'user999', ClubRole.MEMBER)
      ).rejects.toThrow('User is not a member of this club');
    });

    it('should throw error when demoting the last officer', async () => {
      const singleOfficerClub: Club = {
        ...mockClub,
        officerIds: ['user1'],
        memberIds: ['user1', 'user3'],
        memberRoles: {
          user1: ClubRole.PRESIDENT,
          user3: ClubRole.MEMBER,
        },
      };

      mockedClubRepository.getClubById.mockResolvedValue(singleOfficerClub);

      await expect(
        clubService.assignMemberRole('club1', 'user1', ClubRole.MEMBER)
      ).rejects.toThrow('Cannot demote the last officer to a non-officer role');
    });
  });

  describe('helper methods', () => {
    const mockClub: Club = {
      clubId: 'club1',
      name: 'Test Club',
      description: 'A test club',
      parentClubId: null,
      officerIds: ['user1'],
      memberIds: ['user1', 'user2'],
      memberRoles: {
        user1: ClubRole.PRESIDENT,
        user2: ClubRole.MEMBER,
      },
      documentIds: [],
      managerId: null,
      category: 'Test Category',
      createdAt: mockTimestamp,
    };

    it('should check if user is a member', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      const isMember = await clubService.isMember('club1', 'user2');
      expect(isMember).toBe(true);

      const isNotMember = await clubService.isMember('club1', 'user999');
      expect(isNotMember).toBe(false);
    });

    it('should check if user is an officer', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      const isOfficer = await clubService.isOfficer('club1', 'user1');
      expect(isOfficer).toBe(true);

      const isNotOfficer = await clubService.isOfficer('club1', 'user2');
      expect(isNotOfficer).toBe(false);
    });

    it('should get member role', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      const role = await clubService.getMemberRole('club1', 'user1');
      expect(role).toBe(ClubRole.PRESIDENT);

      const memberRole = await clubService.getMemberRole('club1', 'user2');
      expect(memberRole).toBe(ClubRole.MEMBER);

      const noRole = await clubService.getMemberRole('club1', 'user999');
      expect(noRole).toBeNull();
    });

    it('should return null for non-existent club', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      const isMember = await clubService.isMember('nonexistent', 'user1');
      expect(isMember).toBe(false);

      const isOfficer = await clubService.isOfficer('nonexistent', 'user1');
      expect(isOfficer).toBe(false);

      const role = await clubService.getMemberRole('nonexistent', 'user1');
      expect(role).toBeNull();
    });
  });

  describe('createAnnouncement', () => {
    const mockClub: Club = {
      clubId: 'club1',
      name: 'Test Club',
      description: 'A test club',
      parentClubId: null,
      officerIds: ['officer1'],
      memberIds: ['officer1', 'member1'],
      memberRoles: { officer1: ClubRole.PRESIDENT, member1: ClubRole.MEMBER },
      managerId: null,
      documentIds: [],
      category: 'Test Category',
      createdAt: mockTimestamp,
    };

    it('should create an announcement when author is an officer', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      const mockDocRef = { id: 'announcement1' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);
      (collection as jest.Mock).mockReturnValue({});

      const result = await clubService.createAnnouncement(
        'club1',
        'Important Update',
        'This is an important announcement for all members.',
        'officer1'
      );

      expect(result).toMatchObject({
        announcementId: 'announcement1',
        clubId: 'club1',
        title: 'Important Update',
        content: 'This is an important announcement for all members.',
        authorId: 'officer1',
      });
      expect(result.createdAt).toBeDefined();
      expect(collection).toHaveBeenCalledWith(db, 'clubs', 'club1', 'announcements');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should throw error if club does not exist', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(
        clubService.createAnnouncement('nonexistent', 'Title', 'Content', 'user1')
      ).rejects.toThrow('Club not found');
    });

    it('should throw error if author is not an officer', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      await expect(
        clubService.createAnnouncement('club1', 'Title', 'Content', 'member1')
      ).rejects.toThrow('Only club officers can create announcements');
    });

    it('should throw error if title is empty', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      await expect(
        clubService.createAnnouncement('club1', '', 'Content', 'officer1')
      ).rejects.toThrow('Announcement title cannot be empty');

      await expect(
        clubService.createAnnouncement('club1', '   ', 'Content', 'officer1')
      ).rejects.toThrow('Announcement title cannot be empty');
    });

    it('should throw error if title is too long', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      const longTitle = 'a'.repeat(201);

      await expect(
        clubService.createAnnouncement('club1', longTitle, 'Content', 'officer1')
      ).rejects.toThrow('Announcement title is too long (maximum 200 characters)');
    });

    it('should throw error if content is empty', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      await expect(
        clubService.createAnnouncement('club1', 'Title', '', 'officer1')
      ).rejects.toThrow('Announcement content cannot be empty');

      await expect(
        clubService.createAnnouncement('club1', 'Title', '   ', 'officer1')
      ).rejects.toThrow('Announcement content cannot be empty');
    });

    it('should throw error if content is too long', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);
      const longContent = 'a'.repeat(5001);

      await expect(
        clubService.createAnnouncement('club1', 'Title', longContent, 'officer1')
      ).rejects.toThrow('Announcement content is too long (maximum 5000 characters)');
    });

    it('should trim title and content', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      const mockDocRef = { id: 'announcement1' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await clubService.createAnnouncement(
        'club1',
        '  Title with spaces  ',
        '  Content with spaces  ',
        'officer1'
      );

      expect(result.title).toBe('Title with spaces');
      expect(result.content).toBe('Content with spaces');
    });
  });

  describe('getAnnouncements', () => {
    const mockClub: Club = {
      clubId: 'club1',
      name: 'Test Club',
      description: 'A test club',
      parentClubId: null,
      officerIds: ['officer1'],
      memberIds: ['officer1', 'member1'],
      memberRoles: { officer1: ClubRole.PRESIDENT, member1: ClubRole.MEMBER },
      managerId: null,
      documentIds: [],
      category: 'Test Category',
      createdAt: mockTimestamp,
    };

    it('should retrieve announcements with pagination', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      const mockAnnouncements = [
        {
          id: 'ann1',
          data: () => ({
            title: 'Announcement 1',
            content: 'Content 1',
            authorId: 'officer1',
            createdAt: mockTimestamp,
          }),
        },
        {
          id: 'ann2',
          data: () => ({
            title: 'Announcement 2',
            content: 'Content 2',
            authorId: 'officer1',
            createdAt: mockTimestamp,
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockAnnouncements,
      });
      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (limit as jest.Mock).mockReturnValue({});

      const result = await clubService.getAnnouncements('club1', 20);

      expect(result.announcements).toHaveLength(2);
      expect(result.announcements[0]).toMatchObject({
        announcementId: 'ann1',
        clubId: 'club1',
        title: 'Announcement 1',
        content: 'Content 1',
        authorId: 'officer1',
      });
      expect(result.lastDoc).toBe(mockAnnouncements[1]);
    });

    it('should return empty array when no announcements exist', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
      });
      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});

      const result = await clubService.getAnnouncements('club1');

      expect(result.announcements).toHaveLength(0);
      expect(result.lastDoc).toBeNull();
    });

    it('should throw error if club does not exist', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(null);

      await expect(
        clubService.getAnnouncements('nonexistent')
      ).rejects.toThrow('Club not found');
    });

    it('should use default page size of 20', async () => {
      mockedClubRepository.getClubById.mockResolvedValue(mockClub);

      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });
      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (limit as jest.Mock).mockReturnValue({});

      await clubService.getAnnouncements('club1');

      expect(limit).toHaveBeenCalledWith(20);
    });
  });
});
