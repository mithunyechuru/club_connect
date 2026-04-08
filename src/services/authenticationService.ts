import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  UserCredential,
  Auth,
} from 'firebase/auth';
import { auth, db, realtimeDb } from './firebase';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  addDoc,
} from 'firebase/firestore';
import { ref, set, remove } from 'firebase/database';
import { User, UserRole } from '../types';
import bcrypt from 'bcryptjs';

/**
 * Result of an authentication attempt
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  error?: string;
}

/**
 * Session data stored in Realtime Database
 */
interface SessionData {
  userId: string;
  email: string;
  role: UserRole;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

/**
 * Authentication attempt log entry
 */
interface AuthAttemptLog {
  userId?: string;
  email: string;
  success: boolean;
  timestamp: Timestamp;
  ipAddress?: string;
}

/**
 * Failed login attempt tracking
 */
interface FailedAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory storage for failed attempts (in production, use Redis or Firestore)
const failedAttempts = new Map<string, FailedAttempt>();

/**
 * AuthenticationService handles user authentication, session management, and password operations
 */
export class AuthenticationService {
  private auth: Auth;

  constructor(authInstance: Auth = auth) {
    this.auth = authInstance;
  }

  /**
   * Authenticates a user with email and password
   * Implements failed login attempt tracking and account lockout
   * Creates a session with 30-minute timeout
   * 
   * @param email - User's email address
   * @param password - User's password (plaintext)
   * @returns Promise<AuthResult> - Authentication result with user data and session token
   */
  async authenticate(email: string, password: string): Promise<AuthResult> {
    try {
      // Check if account is locked
      const lockStatus = this.checkAccountLock(email);
      if (lockStatus.locked) {
        await this.logAuthAttempt(email, false);
        return {
          success: false,
          error: `Account locked due to too many failed attempts. Try again in ${Math.ceil(lockStatus.remainingTime! / 60000)} minutes.`,
        };
      }

      // Authenticate with Firebase Auth
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (!userDoc.exists()) {
        await this.logAuthAttempt(email, false);
        return {
          success: false,
          error: 'User data not found',
        };
      }

      const userData = userDoc.data() as User;

      // Verify password hash (additional layer beyond Firebase Auth)
      const passwordValid = await bcrypt.compare(password, userData.passwordHash);

      if (!passwordValid) {
        await this.recordFailedAttempt(email);
        await this.logAuthAttempt(email, false, userData.userId);
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Clear failed attempts on successful login
      this.clearFailedAttempts(email);

      // Create session
      const sessionToken = await this.createSession(userData);

      // Update last login timestamp
      await updateDoc(doc(db, 'users', userData.userId), {
        lastLogin: Timestamp.now(),
      });

      // Log successful authentication
      await this.logAuthAttempt(email, true, userData.userId);

      return {
        success: true,
        user: userData,
        sessionToken,
      };
    } catch (error: any) {
      await this.recordFailedAttempt(email);
      await this.logAuthAttempt(email, false);

      // Map Firebase errors to user-friendly messages
      let errorMessage = 'Authentication failed';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Logs out a user and cleans up their session
   * Removes session from Realtime Database and signs out from Firebase Auth
   * 
   * @param userId - ID of the user to log out
   * @returns Promise<void>
   */
  async logout(userId: string): Promise<void> {
    try {
      // Remove session from Realtime Database
      const sessionRef = ref(realtimeDb, `sessions/${userId}`);
      await remove(sessionRef);

      // Sign out from Firebase Auth
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  }

  /**
   * Sends a password reset email to the user
   * 
   * @param email - User's email address
   * @returns Promise<void>
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);

      // Map Firebase errors to user-friendly messages
      if (error.code === 'auth/user-not-found') {
        // Don't reveal if user exists for security
        return;
      }

      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Validates a session token and checks for timeout
   * Sessions expire after 30 minutes of inactivity
   * 
   * @param sessionToken - Session token to validate (userId)
   * @returns Promise<boolean> - True if session is valid and not expired
   */
  async validateSession(sessionToken: string): Promise<boolean> {
    try {
      const sessionRef = ref(realtimeDb, `sessions/${sessionToken}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        return false;
      }

      const sessionData = snapshot.val() as SessionData;
      const now = Date.now();

      // Check if session has expired
      if (now > sessionData.expiresAt) {
        // Remove expired session
        await remove(sessionRef);
        return false;
      }

      // Check for 30-minute inactivity timeout
      if (now - sessionData.lastActivity > SESSION_TIMEOUT_MS) {
        // Remove inactive session
        await remove(sessionRef);
        return false;
      }

      // Update last activity time
      await set(sessionRef, {
        ...sessionData,
        lastActivity: now,
      });

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Creates a new session for the authenticated user
   * Session is stored in Firebase Realtime Database
   * 
   * @param user - Authenticated user
   * @returns Promise<string> - Session token (userId)
   */
  private async createSession(user: User): Promise<string> {
    const now = Date.now();
    const sessionData: SessionData = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + SESSION_TIMEOUT_MS,
    };

    const sessionRef = ref(realtimeDb, `sessions/${user.userId}`);
    await set(sessionRef, sessionData);

    return user.userId;
  }

  /**
   * Records a failed login attempt for rate limiting
   * 
   * @param email - Email address of the failed attempt
   */
  private async recordFailedAttempt(email: string): Promise<void> {
    const attempt = failedAttempts.get(email) || { count: 0, lastAttempt: 0 };

    attempt.count += 1;
    attempt.lastAttempt = Date.now();

    if (attempt.count >= MAX_FAILED_ATTEMPTS) {
      attempt.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }

    failedAttempts.set(email, attempt);
  }

  /**
   * Clears failed login attempts for an email
   * 
   * @param email - Email address to clear attempts for
   */
  private clearFailedAttempts(email: string): void {
    failedAttempts.delete(email);
  }

  /**
   * Checks if an account is locked due to failed attempts
   * 
   * @param email - Email address to check
   * @returns Object with locked status and remaining time
   */
  private checkAccountLock(email: string): { locked: boolean; remainingTime?: number } {
    const attempt = failedAttempts.get(email);

    if (!attempt || !attempt.lockedUntil) {
      return { locked: false };
    }

    const now = Date.now();
    if (now < attempt.lockedUntil) {
      return {
        locked: true,
        remainingTime: attempt.lockedUntil - now,
      };
    }

    // Lock has expired, clear the attempt
    this.clearFailedAttempts(email);
    return { locked: false };
  }

  /**
   * Logs an authentication attempt for security auditing
   * 
   * @param email - Email address used in the attempt
   * @param success - Whether the attempt was successful
   * @param userId - User ID if known
   */
  private async logAuthAttempt(
    email: string,
    success: boolean,
    userId?: string
  ): Promise<void> {
    try {
      const logEntry: AuthAttemptLog = {
        email,
        success,
        timestamp: Timestamp.now(),
        userId,
      };

      await addDoc(collection(db, 'authLogs'), logEntry);
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
      // Don't throw - logging failure shouldn't prevent authentication
    }
  }

  /**
   * Hashes a password using BCrypt
   * Used when creating new users
   * 
   * @param password - Plaintext password
   * @returns Promise<string> - Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verifies a password against a hash
   * 
   * @param password - Plaintext password
   * @param hash - Hashed password
   * @returns Promise<boolean> - True if password matches
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

// Export singleton instance
export const authenticationService = new AuthenticationService();

// Import get function from firebase/database
import { get } from 'firebase/database';
