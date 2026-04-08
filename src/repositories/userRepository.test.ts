import { UserRepository } from './userRepository';
import { User, UserRole, UserProfile, NotificationPreferences } from '../types';
import { Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { deleteDoc, doc } from 'firebase/firestore';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  const testUserIds: string[] = [];

  beforeEach(() => {
    userRepository = new UserRepository();
  });

  afterEach(async () => {
    // Clean up test users
    for (const userId of testUserIds) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    testUserIds.length = 0;
  });

  const createTestUser = (overrides?: Partial<User>): User => {
    const profile: UserProfile = {
      firstName: 'John',
      lastName: 'Doe',
      email: `test${Date.now()}@example.com`,
      interests: ['coding', 'music'],
    };

    const preferences: NotificationPreferences = {
      emailNotifications: true,
      pushNotifications: true,
      eventReminders: true,
      clubAnnouncements: true,
    };

    return {
      userId: `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
      email: profile.email,
      passwordHash: 'hashed_password_123',
      role: UserRole.STUDENT,
      profile,
      preferences,
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
      ...overrides,
    };
  };

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = createTestUser();

      const user = await userRepository.createUser(userData);
      testUserIds.push(user.userId);

      expect(user.userId).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(UserRole.STUDENT);
      expect(user.profile.firstName).toBe('John');
    });

    it('should create a user with CLUB_OFFICER role', async () => {
      const userData = createTestUser({ role: UserRole.CLUB_OFFICER });

      const user = await userRepository.createUser(userData);
      testUserIds.push(user.userId);

      expect(user.role).toBe(UserRole.CLUB_OFFICER);
    });
  });

  describe('getUserById', () => {
    it('should retrieve a user by ID', async () => {
      const userData = createTestUser();
      const createdUser = await userRepository.createUser(userData);
      testUserIds.push(createdUser.userId);

      const retrievedUser = await userRepository.getUserById(createdUser.userId);

      expect(retrievedUser).not.toBeNull();
      expect(retrievedUser?.userId).toBe(createdUser.userId);
      expect(retrievedUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent user ID', async () => {
      const user = await userRepository.getUserById('non-existent-id');

      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve a user by email', async () => {
      const userData = createTestUser();
      const createdUser = await userRepository.createUser(userData);
      testUserIds.push(createdUser.userId);

      const retrievedUser = await userRepository.getUserByEmail(userData.email);

      expect(retrievedUser).not.toBeNull();
      expect(retrievedUser?.email).toBe(userData.email);
      expect(retrievedUser?.userId).toBe(createdUser.userId);
    });

    it('should return null for non-existent email', async () => {
      const user = await userRepository.getUserByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const userData = createTestUser();
      const createdUser = await userRepository.createUser(userData);
      testUserIds.push(createdUser.userId);

      const updatedProfile: UserProfile = {
        ...userData.profile,
        firstName: 'Jane',
        lastName: 'Smith',
      };

      await userRepository.updateUser(createdUser.userId, { profile: updatedProfile });

      const retrievedUser = await userRepository.getUserById(createdUser.userId);
      expect(retrievedUser?.profile.firstName).toBe('Jane');
      expect(retrievedUser?.profile.lastName).toBe('Smith');
    });

    it('should update user role', async () => {
      const userData = createTestUser();
      const createdUser = await userRepository.createUser(userData);
      testUserIds.push(createdUser.userId);

      await userRepository.updateUser(createdUser.userId, { role: UserRole.CLUB_OFFICER });

      const retrievedUser = await userRepository.getUserById(createdUser.userId);
      expect(retrievedUser?.role).toBe(UserRole.CLUB_OFFICER);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const userData = createTestUser();
      const createdUser = await userRepository.createUser(userData);

      await userRepository.deleteUser(createdUser.userId);

      const retrievedUser = await userRepository.getUserById(createdUser.userId);
      expect(retrievedUser).toBeNull();
    });
  });

  describe('queryUsers', () => {
    it('should query users with pagination', async () => {
      // Create multiple test users
      const user1 = await userRepository.createUser(createTestUser());
      testUserIds.push(user1.userId);

      const user2 = await userRepository.createUser(createTestUser());
      testUserIds.push(user2.userId);

      const result = await userRepository.queryUsers(10);

      expect(result.users.length).toBeGreaterThanOrEqual(2);
      expect(result.lastDoc).not.toBeNull();
    });

    it('should filter users by role', async () => {
      const studentUser = await userRepository.createUser(createTestUser({ role: UserRole.STUDENT }));
      testUserIds.push(studentUser.userId);

      const officerUser = await userRepository.createUser(createTestUser({ role: UserRole.CLUB_OFFICER }));
      testUserIds.push(officerUser.userId);

      const result = await userRepository.queryUsers(10, undefined, UserRole.CLUB_OFFICER);

      expect(result.users.length).toBeGreaterThanOrEqual(1);
      expect(result.users.every(u => u.role === UserRole.CLUB_OFFICER)).toBe(true);
    });
  });

  describe('getUsersByRole', () => {
    it('should get all users with a specific role', async () => {
      const studentUser = await userRepository.createUser(createTestUser({ role: UserRole.STUDENT }));
      testUserIds.push(studentUser.userId);

      const users = await userRepository.getUsersByRole(UserRole.STUDENT);

      expect(users.length).toBeGreaterThanOrEqual(1);
      expect(users.every(u => u.role === UserRole.STUDENT)).toBe(true);
    });
  });
});
