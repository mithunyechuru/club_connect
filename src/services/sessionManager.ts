import { ref, set, get, remove, onValue, DataSnapshot } from 'firebase/database';
import { realtimeDb } from './firebase';
import { UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session data stored in Firebase Realtime Database
 */
export interface Session {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Session creation options
 */
export interface SessionOptions {
  userId: string;
  email: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * SessionManager handles session creation, validation, and automatic timeout
 * Sessions are stored in Firebase Realtime Database for real-time synchronization
 */
export class SessionManager {
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor() {
    // Start automatic cleanup of expired sessions
    this.startCleanupInterval();
  }

  /**
   * Creates a new session for a user
   * Session expires after 30 minutes of inactivity
   * 
   * @param options - Session creation options
   * @returns Promise<Session> - Created session
   */
  async createSession(options: SessionOptions): Promise<Session> {
    const sessionId = uuidv4();
    const now = Date.now();

    const session: Session = {
      sessionId,
      userId: options.userId,
      email: options.email,
      role: options.role,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + SESSION_TIMEOUT_MS,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    };

    // Store session in Realtime Database under sessions/{userId}/{sessionId}
    const sessionRef = ref(realtimeDb, `sessions/${options.userId}/${sessionId}`);
    await set(sessionRef, session);

    return session;
  }

  /**
   * Validates a session token
   * Checks if session exists, is not expired, and updates last activity
   * 
   * @param userId - User ID
   * @param sessionId - Session ID to validate
   * @returns Promise<boolean> - True if session is valid
   */
  async validateSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      const sessionRef = ref(realtimeDb, `sessions/${userId}/${sessionId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        return false;
      }

      const session = snapshot.val() as Session;
      const now = Date.now();

      // Check if session has expired (absolute expiration)
      if (now > session.expiresAt) {
        await this.removeSession(userId, sessionId);
        return false;
      }

      // Check for 30-minute inactivity timeout
      if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
        await this.removeSession(userId, sessionId);
        return false;
      }

      // Update last activity time and extend expiration
      await this.updateSessionActivity(userId, sessionId);

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Gets session data for a user
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   * @returns Promise<Session | null> - Session data or null if not found
   */
  async getSession(userId: string, sessionId: string): Promise<Session | null> {
    try {
      const sessionRef = ref(realtimeDb, `sessions/${userId}/${sessionId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.val() as Session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Gets all active sessions for a user
   * 
   * @param userId - User ID
   * @returns Promise<Session[]> - Array of active sessions
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    try {
      const sessionsRef = ref(realtimeDb, `sessions/${userId}`);
      const snapshot = await get(sessionsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const sessionsData = snapshot.val();
      const sessions: Session[] = [];

      for (const sessionId in sessionsData) {
        sessions.push(sessionsData[sessionId] as Session);
      }

      return sessions;
    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }

  /**
   * Updates the last activity time for a session
   * Extends the session expiration time
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   */
  async updateSessionActivity(userId: string, sessionId: string): Promise<void> {
    try {
      const sessionRef = ref(realtimeDb, `sessions/${userId}/${sessionId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        return;
      }

      const session = snapshot.val() as Session;
      const now = Date.now();

      // Update last activity and extend expiration
      session.lastActivity = now;
      session.expiresAt = now + SESSION_TIMEOUT_MS;

      await set(sessionRef, session);
    } catch (error) {
      console.error('Update session activity error:', error);
    }
  }

  /**
   * Removes a specific session
   * 
   * @param userId - User ID
   * @param sessionId - Session ID to remove
   */
  async removeSession(userId: string, sessionId: string): Promise<void> {
    try {
      const sessionRef = ref(realtimeDb, `sessions/${userId}/${sessionId}`);
      await remove(sessionRef);
    } catch (error) {
      console.error('Remove session error:', error);
      throw new Error('Failed to remove session');
    }
  }

  /**
   * Removes all sessions for a user (logout from all devices)
   * 
   * @param userId - User ID
   */
  async removeAllUserSessions(userId: string): Promise<void> {
    try {
      const sessionsRef = ref(realtimeDb, `sessions/${userId}`);
      await remove(sessionsRef);
    } catch (error) {
      console.error('Remove all user sessions error:', error);
      throw new Error('Failed to remove all sessions');
    }
  }

  /**
   * Listens for session changes in real-time
   * Useful for detecting when a session is invalidated from another device
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param callback - Callback function called when session changes or is removed
   * @returns Function to unsubscribe from the listener
   */
  onSessionChange(
    userId: string,
    sessionId: string,
    callback: (session: Session | null) => void
  ): () => void {
    const sessionRef = ref(realtimeDb, `sessions/${userId}/${sessionId}`);
    
    const unsubscribe = onValue(sessionRef, (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as Session);
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  }

  /**
   * Cleans up expired sessions
   * Called periodically by the cleanup interval
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const sessionsRef = ref(realtimeDb, 'sessions');
      const snapshot = await get(sessionsRef);

      if (!snapshot.exists()) {
        return;
      }

      const now = Date.now();
      const allSessions = snapshot.val();

      for (const userId in allSessions) {
        const userSessions = allSessions[userId];
        
        for (const sessionId in userSessions) {
          const session = userSessions[sessionId] as Session;
          
          // Remove expired sessions
          if (now > session.expiresAt || now - session.lastActivity > SESSION_TIMEOUT_MS) {
            await this.removeSession(userId, sessionId);
          }
        }
      }
    } catch (error) {
      console.error('Cleanup expired sessions error:', error);
    }
  }

  /**
   * Starts the automatic cleanup interval
   * Runs every 5 minutes to remove expired sessions
   */
  private startCleanupInterval(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredSessions();
    }, SESSION_CLEANUP_INTERVAL_MS);
  }

  /**
   * Stops the automatic cleanup interval
   * Should be called when shutting down the application
   */
  stopCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }

  /**
   * Gets the number of active sessions for a user
   * 
   * @param userId - User ID
   * @returns Promise<number> - Number of active sessions
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    const sessions = await this.getUserSessions(userId);
    const now = Date.now();
    
    // Count only non-expired sessions
    return sessions.filter(
      session => now <= session.expiresAt && now - session.lastActivity <= SESSION_TIMEOUT_MS
    ).length;
  }

  /**
   * Checks if a session is about to expire (within 5 minutes)
   * Useful for showing warnings to users
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   * @returns Promise<boolean> - True if session expires soon
   */
  async isSessionExpiringSoon(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.getSession(userId, sessionId);
    
    if (!session) {
      return false;
    }

    const now = Date.now();
    const timeUntilExpiry = session.expiresAt - now;
    const timeUntilInactivityTimeout = SESSION_TIMEOUT_MS - (now - session.lastActivity);
    
    const minTimeRemaining = Math.min(timeUntilExpiry, timeUntilInactivityTimeout);
    
    return minTimeRemaining < 5 * 60 * 1000; // Less than 5 minutes
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
