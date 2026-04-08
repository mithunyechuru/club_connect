import { UserService } from './userService';
import { userRepository } from '../repositories/userRepository';
import { UserRole, UserProfile } from '../types';

// Mock the userRepository
jest.mock('../repositories/userRepository', () => ({
  userRepository: {
    getUserByEmail: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  const createTestProfile = (): UserProfile => ({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    interests: ['coding', 'music'],
  });

  describe('registerUser', () => {
    it('should register a new user with valid data', async () => {
      const profile = createTestProfile();
      const email = 'john.doe@example.com';
      const password = 'SecurePass123!';

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.createUser as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        email,
        passwordHash: 'hashed_SecurePass123!',
        role: UserRole.STUDENT,
        profile,
        preferences: {
          emailNotifications: true,
          pushNotifications: true,
          eventReminders: true,
          clubAnnouncements: true,
        },
        createdAt: expect.any(Object),
        lastLogin: expect.any(Object),
      });

      const user = await userService.registerUser('user-123', email, password, profile);

      expect(user.userId).toBe('user-123');
      expect(user.email).toBe(email);
      expect(user.role).toBe(UserRole.STUDENT);
      expect(userRepository.createUser).toHaveBeenCalled();
    });

    it('should register a user with CLUB_OFFICER role', async () => {
      const profile = createTestProfile();
      const email = 'officer@example.com';
      const password = 'SecurePass123!';

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.createUser as jest.Mock).mockResolvedValue({
        userId: 'user-456',
        email,
        passwordHash: 'hashed_SecurePass123!',
        role: UserRole.CLUB_OFFICER,
        profile,
        preferences: expect.any(Object),
        createdAt: expect.any(Object),
        lastLogin: expect.any(Object),
      });

      const user = await userService.registerUser('user-456', email, password, profile, UserRole.CLUB_OFFICER);

      expect(user.role).toBe(UserRole.CLUB_OFFICER);
    });

    it('should reject registration if email already exists', async () => {
      const profile = createTestProfile();
      const email = 'existing@example.com';
      const password = 'SecurePass123!';

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
        userId: 'existing-user',
        email,
      });

      await expect(userService.registerUser('any-id', email, password, profile))
        .rejects.toThrow('User with this email already exists');
    });

    it('should reject registration with invalid email', async () => {
      const profile = createTestProfile();
      const email = 'invalid-email';
      const password = 'SecurePass123!';

      await expect(userService.registerUser('any-id', email, password, profile))
        .rejects.toThrow('Invalid email format');
    });

    it('should reject registration with weak password', async () => {
      const profile = createTestProfile();
      const email = 'john@example.com';
      const password = '123'; // Too short

      await expect(userService.registerUser('any-id', email, password, profile))
        .rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should reject registration with empty first name', async () => {
      const profile = { ...createTestProfile(), firstName: '' };
      const email = 'john@example.com';
      const password = 'SecurePass123!';

      await expect(userService.registerUser('any-id', email, password, profile))
        .rejects.toThrow('First name cannot be empty');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userId = 'user-123';
      const existingUser = {
        userId,
        email: 'john@example.com',
        profile: createTestProfile(),
        preferences: expect.any(Object),
      };

      (userRepository.getUserById as jest.Mock).mockResolvedValue(existingUser);
      (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);

      const profileUpdates = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      await userService.updateProfile(userId, profileUpdates);

      expect(userRepository.updateUser).toHaveBeenCalledWith(userId, {
        profile: expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
        }),
      });
    });

    it('should reject profile update if user not found', async () => {
      const userId = 'non-existent';
      (userRepository.getUserById as jest.Mock).mockResolvedValue(null);

      await expect(userService.updateProfile(userId, { firstName: 'Jane' }))
        .rejects.toThrow('User not found');
    });

    it('should reject email update if email is taken', async () => {
      const userId = 'user-123';
      const existingUser = {
        userId,
        email: 'john@example.com',
        profile: createTestProfile(),
      };

      (userRepository.getUserById as jest.Mock).mockResolvedValue(existingUser);
      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
        userId: 'other-user',
        email: 'taken@example.com',
      });

      await expect(userService.updateProfile(userId, { email: 'taken@example.com' }))
        .rejects.toThrow('Email is already taken by another user');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      const userId = 'user-123';
      const existingUser = {
        userId,
        email: 'john@example.com',
        profile: createTestProfile(),
        preferences: {
          emailNotifications: true,
          pushNotifications: true,
          eventReminders: true,
          clubAnnouncements: true,
        },
      };

      (userRepository.getUserById as jest.Mock).mockResolvedValue(existingUser);
      (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);

      await userService.updateNotificationPreferences(userId, {
        emailNotifications: false,
        eventReminders: false,
      });

      expect(userRepository.updateUser).toHaveBeenCalledWith(userId, {
        preferences: {
          emailNotifications: false,
          pushNotifications: true,
          eventReminders: false,
          clubAnnouncements: true,
        },
      });
    });

    it('should reject if user not found', async () => {
      const userId = 'non-existent';
      (userRepository.getUserById as jest.Mock).mockResolvedValue(null);

      await expect(userService.updateNotificationPreferences(userId, { emailNotifications: false }))
        .rejects.toThrow('User not found');
    });
  });

  describe('getUserById', () => {
    it('should get user by ID', async () => {
      const userId = 'user-123';
      const user = {
        userId,
        email: 'john@example.com',
        profile: createTestProfile(),
      };

      (userRepository.getUserById as jest.Mock).mockResolvedValue(user);

      const result = await userService.getUserById(userId);

      expect(result).toEqual(user);
      expect(userRepository.getUserById).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email', async () => {
      const email = 'john@example.com';
      const user = {
        userId: 'user-123',
        email,
        profile: createTestProfile(),
      };

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(user);

      const result = await userService.getUserByEmail(email);

      expect(result).toEqual(user);
      expect(userRepository.getUserByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userId = 'user-123';
      const user = {
        userId,
        email: 'john@example.com',
        profile: createTestProfile(),
      };

      (userRepository.getUserById as jest.Mock).mockResolvedValue(user);
      (userRepository.deleteUser as jest.Mock).mockResolvedValue(undefined);

      await userService.deleteUser(userId);

      expect(userRepository.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should reject if user not found', async () => {
      const userId = 'non-existent';
      (userRepository.getUserById as jest.Mock).mockResolvedValue(null);

      await expect(userService.deleteUser(userId))
        .rejects.toThrow('User not found');
    });
  });
});
