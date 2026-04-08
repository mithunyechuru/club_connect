import { ClubRepository } from './clubRepository';
import {
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { Club, ClubRole } from '../types';

// Mock Firebase Firestore
jest.mock('firebase/firestore');
jest.mock('../services/firebase', () => ({
  db: {},
}));

describe('ClubRepository', () => {
  let clubRepository: ClubRepository;

  beforeEach(() => {
    clubRepository = new ClubRepository();
    jest.clearAllMocks();
  });

  describe('getClubById', () => {
    it('should return a club when it exists', async () => {
      const mockClubData = {
        name: 'Test Club',
        description: 'A test club',
        parentClubId: null,
        officerIds: ['user1'],
        memberIds: ['user1', 'user2'],
        memberRoles: { user1: ClubRole.PRESIDENT, user2: ClubRole.MEMBER },
        managerId: null,
        documentIds: [],
        category: 'Test Category',
        createdAt: Timestamp.now(),
      };

      const mockDoc = {
        exists: () => true,
        id: 'club1',
        data: () => mockClubData,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const result = await clubRepository.getClubById('club1');

      expect(result).toEqual({
        clubId: 'club1',
        ...mockClubData,
      });
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return null when club does not exist', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const result = await clubRepository.getClubById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(clubRepository.getClubById('club1')).rejects.toThrow(
        'Failed to get club with ID club1'
      );
    });
  });

  describe('getClubsByMember', () => {
    it('should return clubs where user is a member', async () => {
      const mockClubs = [
        {
          id: 'club1',
          data: () => ({
            name: 'Club 1',
            description: 'First club',
            parentClubId: null,
            officerIds: ['user2'],
            memberIds: ['user1', 'user2'],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
        {
          id: 'club2',
          data: () => ({
            name: 'Club 2',
            description: 'Second club',
            parentClubId: null,
            officerIds: ['user3'],
            memberIds: ['user1', 'user3'],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockClubs,
      });

      const result = await clubRepository.getClubsByMember('user1');

      expect(result).toHaveLength(2);
      expect(result[0].clubId).toBe('club1');
      expect(result[1].clubId).toBe('club2');
    });

    it('should return empty array when user is not a member of any club', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
      });

      const result = await clubRepository.getClubsByMember('user1');

      expect(result).toEqual([]);
    });
  });

  describe('getSubClubs', () => {
    it('should return all sub-clubs of a parent club', async () => {
      const mockSubClubs = [
        {
          id: 'subclub1',
          data: () => ({
            name: 'Sub Club 1',
            description: 'First sub-club',
            parentClubId: 'parent1',
            officerIds: ['user1'],
            memberIds: ['user1'],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
        {
          id: 'subclub2',
          data: () => ({
            name: 'Sub Club 2',
            description: 'Second sub-club',
            parentClubId: 'parent1',
            officerIds: ['user2'],
            memberIds: ['user2'],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockSubClubs,
      });

      const result = await clubRepository.getSubClubs('parent1');

      expect(result).toHaveLength(2);
      expect(result[0].parentClubId).toBe('parent1');
      expect(result[1].parentClubId).toBe('parent1');
    });

    it('should return empty array when parent has no sub-clubs', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
      });

      const result = await clubRepository.getSubClubs('parent1');

      expect(result).toEqual([]);
    });
  });

  describe('createClub', () => {
    it('should create a new club and return it with generated ID', async () => {
      const clubData: Omit<Club, 'clubId'> = {
        name: 'New Club',
        description: 'A new club',
        parentClubId: null,
        officerIds: ['user1'],
        memberIds: ['user1'],
        memberRoles: { user1: ClubRole.PRESIDENT },
        managerId: null,
        documentIds: [],
        category: 'Test Category',
        createdAt: Timestamp.now(),
      };

      const mockDocRef = {
        id: 'newclub1',
      };

      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await clubRepository.createClub(clubData);

      expect(result.clubId).toBe('newclub1');
      expect(result.name).toBe('New Club');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should throw error on creation failure', async () => {
      const clubData: Omit<Club, 'clubId'> = {
        name: 'New Club',
        description: 'A new club',
        parentClubId: null,
        officerIds: ['user1'],
        memberIds: ['user1'],
        memberRoles: {},
        managerId: null,
        documentIds: [],
        category: 'Test Category',
        createdAt: Timestamp.now(),
      };

      (addDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(clubRepository.createClub(clubData)).rejects.toThrow(
        'Failed to create club'
      );
    });
  });

  describe('updateClub', () => {
    it('should update club data', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await clubRepository.updateClub('club1', {
        name: 'Updated Club Name',
        description: 'Updated description',
      });

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw error on update failure', async () => {
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        clubRepository.updateClub('club1', { name: 'Updated' })
      ).rejects.toThrow('Failed to update club with ID club1');
    });
  });

  describe('deleteClub', () => {
    it('should delete a club', async () => {
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await clubRepository.deleteClub('club1');

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw error on deletion failure', async () => {
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(clubRepository.deleteClub('club1')).rejects.toThrow(
        'Failed to delete club with ID club1'
      );
    });
  });

  describe('queryClubs', () => {
    it('should return paginated clubs', async () => {
      const mockClubs = [
        {
          id: 'club1',
          data: () => ({
            name: 'Club 1',
            description: 'First club',
            parentClubId: null,
            officerIds: [],
            memberIds: [],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockClubs,
      });

      const result = await clubRepository.queryClubs({ pageSize: 10 });

      expect(result.clubs).toHaveLength(1);
      expect(result.lastDoc).toBe(mockClubs[0]);
    });

    it('should filter by parent club ID', async () => {
      const mockSubClubs = [
        {
          id: 'subclub1',
          data: () => ({
            name: 'Sub Club 1',
            description: 'First sub-club',
            parentClubId: 'parent1',
            officerIds: [],
            memberIds: [],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockSubClubs,
      });

      const result = await clubRepository.queryClubs({
        pageSize: 10,
        parentClubId: 'parent1',
      });

      expect(result.clubs).toHaveLength(1);
      expect(result.clubs[0].parentClubId).toBe('parent1');
    });

    it('should filter clubs without parents', async () => {
      const mockParentClubs = [
        {
          id: 'club1',
          data: () => ({
            name: 'Parent Club',
            description: 'A parent club',
            parentClubId: null,
            officerIds: [],
            memberIds: [],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockParentClubs,
      });

      const result = await clubRepository.queryClubs({
        pageSize: 10,
        hasParent: false,
      });

      expect(result.clubs).toHaveLength(1);
      expect(result.clubs[0].parentClubId).toBeNull();
    });
  });

  describe('getClubsByOfficer', () => {
    it('should return clubs where user is an officer', async () => {
      const mockClubs = [
        {
          id: 'club1',
          data: () => ({
            name: 'Club 1',
            description: 'First club',
            parentClubId: null,
            officerIds: ['user1'],
            memberIds: ['user1', 'user2'],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockClubs,
      });

      const result = await clubRepository.getClubsByOfficer('user1');

      expect(result).toHaveLength(1);
      expect(result[0].officerIds).toContain('user1');
    });
  });

  describe('searchClubsByName', () => {
    it('should return clubs matching search term', async () => {
      const mockClubs = [
        {
          id: 'club1',
          data: () => ({
            name: 'Chess Club',
            description: 'Play chess',
            parentClubId: null,
            officerIds: [],
            memberIds: [],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
        {
          id: 'club2',
          data: () => ({
            name: 'Debate Club',
            description: 'Debate topics',
            parentClubId: null,
            officerIds: [],
            memberIds: [],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockClubs,
      });

      const result = await clubRepository.searchClubsByName('chess');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Chess Club');
    });

    it('should perform case-insensitive search', async () => {
      const mockClubs = [
        {
          id: 'club1',
          data: () => ({
            name: 'Chess Club',
            description: 'Play chess',
            parentClubId: null,
            officerIds: [],
            memberIds: [],
            memberRoles: {},
            managerId: null,
            documentIds: [],
            category: 'Test Category',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockClubs,
      });

      const result = await clubRepository.searchClubsByName('CHESS');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Chess Club');
    });
  });
});
