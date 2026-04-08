import { Timestamp } from 'firebase/firestore';
import { userRepository } from '../repositories/userRepository';
import { User, UserRole, UserProfile, NotificationPreferences } from '../types';
import { validateEmail, validatePassword, validateName } from '../utils/validation';

/**
 * Service for managing user operations
 * Handles user registration, profile management, and notification preferences
 */
export class UserService {
  /**
   * Register a new user with role assignment
   * @param email - User's email address
   * @param password - User's password (will be hashed)
   * @param profile - User profile information
   * @param role - User role (defaults to STUDENT)
   * @returns Promise<User> The created user
   */
  async registerUser(
    userId: string,
    email: string,
    password: string,
    profile: UserProfile,
    role: UserRole = UserRole.STUDENT
  ): Promise<User> {
    // Validate input data
    this.validateUserInput(email, password, profile);

    // Check if user already exists
    const existingUser = await userRepository.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password (in production, use bcrypt or similar)
    const passwordHash = await this.hashPassword(password);

    // Create default notification preferences
    const preferences: NotificationPreferences = {
      emailNotifications: true,
      pushNotifications: true,
      eventReminders: true,
      clubAnnouncements: true,
    };

    // Create user
    const userData: User = {
      userId,
      email,
      passwordHash,
      role,
      profile: {
        ...profile,
        email, // Ensure email is in profile
      },
      preferences,
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
    };

    return await userRepository.createUser(userData);
  }

  /**
   * Update user profile
   * @param userId - The ID of the user
   * @param profileUpdates - Partial profile data to update
   * @returns Promise<void>
   */
  async updateProfile(userId: string, profileUpdates: Partial<UserProfile>): Promise<void> {
    // Validate profile updates
    if (profileUpdates.firstName) {
      validateName(profileUpdates.firstName, 'First name');
    }
    if (profileUpdates.lastName) {
      validateName(profileUpdates.lastName, 'Last name');
    }
    if (profileUpdates.email) {
      validateEmail(profileUpdates.email);

      // Check if email is already taken by another user
      const existingUser = await userRepository.getUserByEmail(profileUpdates.email);
      if (existingUser && existingUser.userId !== userId) {
        throw new Error('Email is already taken by another user');
      }
    }

    // Get current user
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Merge profile updates
    const updatedProfile: UserProfile = {
      ...user.profile,
      ...profileUpdates,
    };

    await userRepository.updateUser(userId, { profile: updatedProfile });
  }

  /**
   * Update notification preferences
   * @param userId - The ID of the user
   * @param preferences - Notification preferences to update
   * @returns Promise<void>
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    // Get current user
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Merge preferences
    const updatedPreferences: NotificationPreferences = {
      ...user.preferences,
      ...preferences,
    };

    await userRepository.updateUser(userId, { preferences: updatedPreferences });
  }

  /**
   * Get user by ID
   * @param userId - The ID of the user
   * @returns Promise<User | null> The user if found
   */
  async getUserById(userId: string): Promise<User | null> {
    return await userRepository.getUserById(userId);
  }

  /**
   * Get user by email
   * @param email - The email address
   * @returns Promise<User | null> The user if found
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await userRepository.getUserByEmail(email);
  }

  /**
   * Delete user account
   * @param userId - The ID of the user to delete
   * @returns Promise<void>
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await userRepository.deleteUser(userId);
  }

  /**
   * Validate user input data
   * @param email - Email address
   * @param password - Password
   * @param profile - User profile
   * @throws Error if validation fails
   */
  private validateUserInput(email: string, password: string, profile: UserProfile): void {
    validateEmail(email);
    validatePassword(password);
    validateName(profile.firstName, 'First name');
    validateName(profile.lastName, 'Last name');

    if (profile.phoneNumber && profile.phoneNumber.trim().length > 0) {
      // Basic phone number validation
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(profile.phoneNumber)) {
        throw new Error('Invalid phone number format');
      }
    }
  }

  /**
   * Hash password (placeholder - in production use bcrypt)
   * @param password - Plain text password
   * @returns Promise<string> Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt or similar
    // For now, this is a placeholder
    return `hashed_${password}`;
  }
}

export const userService = new UserService();
