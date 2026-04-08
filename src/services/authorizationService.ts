import { User, UserRole, ClubRole } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Permission types for system operations
 */
export enum Permission {
  // User management
  VIEW_USERS = 'VIEW_USERS',
  EDIT_USERS = 'EDIT_USERS',
  DELETE_USERS = 'DELETE_USERS',
  MANAGE_ROLES = 'MANAGE_ROLES',

  // Club management
  CREATE_CLUB = 'CREATE_CLUB',
  VIEW_CLUB = 'VIEW_CLUB',
  EDIT_CLUB = 'EDIT_CLUB',
  DELETE_CLUB = 'DELETE_CLUB',
  MANAGE_CLUB_MEMBERS = 'MANAGE_CLUB_MEMBERS',
  APPROVE_MEMBERSHIP_REQUESTS = 'APPROVE_MEMBERSHIP_REQUESTS',
  UPLOAD_CLUB_DOCUMENTS = 'UPLOAD_CLUB_DOCUMENTS',
  CREATE_CLUB_ANNOUNCEMENT = 'CREATE_CLUB_ANNOUNCEMENT',

  // Event management
  CREATE_EVENT = 'CREATE_EVENT',
  VIEW_EVENT = 'VIEW_EVENT',
  EDIT_EVENT = 'EDIT_EVENT',
  DELETE_EVENT = 'DELETE_EVENT',
  CANCEL_EVENT = 'CANCEL_EVENT',
  MANAGE_EVENT_ATTENDANCE = 'MANAGE_EVENT_ATTENDANCE',
  GENERATE_EVENT_QR_CODE = 'GENERATE_EVENT_QR_CODE',

  // RSVP management
  CREATE_RSVP = 'CREATE_RSVP',
  CANCEL_RSVP = 'CANCEL_RSVP',
  VIEW_RSVP_LIST = 'VIEW_RSVP_LIST',

  // Venue management
  CREATE_VENUE = 'CREATE_VENUE',
  VIEW_VENUE = 'VIEW_VENUE',
  EDIT_VENUE = 'EDIT_VENUE',
  DELETE_VENUE = 'DELETE_VENUE',
  BOOK_VENUE = 'BOOK_VENUE',
  CANCEL_BOOKING = 'CANCEL_BOOKING',

  // Attendance management
  RECORD_ATTENDANCE = 'RECORD_ATTENDANCE',
  VIEW_ATTENDANCE = 'VIEW_ATTENDANCE',
  EDIT_ATTENDANCE = 'EDIT_ATTENDANCE',
  DELETE_ATTENDANCE = 'DELETE_ATTENDANCE',

  // Certificate management
  GENERATE_CERTIFICATE = 'GENERATE_CERTIFICATE',
  VIEW_CERTIFICATE = 'VIEW_CERTIFICATE',

  // Feedback management
  SUBMIT_FEEDBACK = 'SUBMIT_FEEDBACK',
  VIEW_FEEDBACK = 'VIEW_FEEDBACK',
  VIEW_FEEDBACK_ANALYTICS = 'VIEW_FEEDBACK_ANALYTICS',

  // Messaging
  SEND_DIRECT_MESSAGE = 'SEND_DIRECT_MESSAGE',
  CREATE_FORUM_THREAD = 'CREATE_FORUM_THREAD',
  REPLY_TO_THREAD = 'REPLY_TO_THREAD',
  PIN_THREAD = 'PIN_THREAD',
  DELETE_THREAD = 'DELETE_THREAD',

  // Analytics and reports
  VIEW_CLUB_ANALYTICS = 'VIEW_CLUB_ANALYTICS',
  VIEW_EVENT_ANALYTICS = 'VIEW_EVENT_ANALYTICS',
  VIEW_SYSTEM_ANALYTICS = 'VIEW_SYSTEM_ANALYTICS',
  EXPORT_REPORTS = 'EXPORT_REPORTS',

  // Admin panel
  ACCESS_ADMIN_PANEL = 'ACCESS_ADMIN_PANEL',
  MANAGE_SYSTEM_CONFIG = 'MANAGE_SYSTEM_CONFIG',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',

  // Gamification
  VIEW_BADGES = 'VIEW_BADGES',
  VIEW_LEADERBOARD = 'VIEW_LEADERBOARD',

  // Payment
  PROCESS_PAYMENT = 'PROCESS_PAYMENT',
  VIEW_TRANSACTIONS = 'VIEW_TRANSACTIONS',
  ISSUE_REFUND = 'ISSUE_REFUND',
}

/**
 * Role-based permission sets
 */
const STUDENT_PERMISSIONS = new Set([
  // Club permissions
  Permission.CREATE_CLUB,
  Permission.VIEW_CLUB,

  // Event permissions
  Permission.VIEW_EVENT,

  // RSVP permissions
  Permission.CREATE_RSVP,
  Permission.CANCEL_RSVP,

  // Certificate permissions
  Permission.VIEW_CERTIFICATE,

  // Feedback permissions
  Permission.SUBMIT_FEEDBACK,

  // Messaging permissions
  Permission.SEND_DIRECT_MESSAGE,
  Permission.CREATE_FORUM_THREAD,
  Permission.REPLY_TO_THREAD,

  // Gamification permissions
  Permission.VIEW_BADGES,
  Permission.VIEW_LEADERBOARD,

  // Payment permissions
  Permission.PROCESS_PAYMENT,
]);

const CLUB_OFFICER_PERMISSIONS = new Set([
  // All student permissions
  ...Array.from(STUDENT_PERMISSIONS),

  // Additional club permissions
  Permission.EDIT_CLUB,
  Permission.MANAGE_CLUB_MEMBERS,
  Permission.APPROVE_MEMBERSHIP_REQUESTS,
  Permission.UPLOAD_CLUB_DOCUMENTS,
  Permission.CREATE_CLUB_ANNOUNCEMENT,

  // Event permissions
  Permission.CREATE_EVENT,
  Permission.EDIT_EVENT,
  Permission.DELETE_EVENT,
  Permission.CANCEL_EVENT,
  Permission.MANAGE_EVENT_ATTENDANCE,
  Permission.GENERATE_EVENT_QR_CODE,

  // RSVP permissions
  Permission.VIEW_RSVP_LIST,

  // Venue permissions
  Permission.VIEW_VENUE,
  Permission.BOOK_VENUE,
  Permission.CANCEL_BOOKING,

  // Attendance permissions
  Permission.RECORD_ATTENDANCE,
  Permission.VIEW_ATTENDANCE,
  Permission.EDIT_ATTENDANCE,
  Permission.DELETE_ATTENDANCE,

  // Certificate permissions
  Permission.GENERATE_CERTIFICATE,

  // Feedback permissions
  Permission.VIEW_FEEDBACK,
  Permission.VIEW_FEEDBACK_ANALYTICS,

  // Forum moderation
  Permission.PIN_THREAD,
  Permission.DELETE_THREAD,

  // Analytics permissions
  Permission.VIEW_CLUB_ANALYTICS,
  Permission.VIEW_EVENT_ANALYTICS,
  Permission.EXPORT_REPORTS,

  // Transaction permissions
  Permission.VIEW_TRANSACTIONS,
]);

const ADMINISTRATOR_PERMISSIONS = new Set(Object.values(Permission));

const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  [UserRole.STUDENT]: STUDENT_PERMISSIONS,
  [UserRole.CLUB_OFFICER]: CLUB_OFFICER_PERMISSIONS,
  [UserRole.ADMINISTRATOR]: ADMINISTRATOR_PERMISSIONS,
};

/**
 * AuthorizationService enforces role-based access control
 */
export class AuthorizationService {
  /**
   * Checks if a user has a specific permission
   * 
   * @param user - User to check permissions for
   * @param permission - Permission to check
   * @returns boolean - True if user has the permission
   */
  hasPermission(user: User, permission: Permission): boolean {
    const permissions = this.getPermissions(user.role);
    return permissions.has(permission);
  }

  /**
   * Gets all permissions for a given role
   * 
   * @param role - User role
   * @returns Set<Permission> - Set of permissions for the role
   */
  getPermissions(role: UserRole): Set<Permission> {
    return new Set(ROLE_PERMISSIONS[role] || []);
  }

  /**
   * Enforces a permission check, throwing an error if unauthorized
   * 
   * @param user - User to check permissions for
   * @param permission - Permission to enforce
   * @throws Error if user doesn't have the permission
   */
  enforcePermission(user: User, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw new Error(
        `Unauthorized: User does not have permission ${permission}`
      );
    }
  }

  /**
   * Checks if a user is a club officer for a specific club
   * 
   * @param userId - User ID to check
   * @param clubId - Club ID to check
   * @returns Promise<boolean> - True if user is an officer of the club
   */
  async isClubOfficer(userId: string, clubId: string): Promise<boolean> {
    try {
      const clubDoc = await getDoc(doc(db, 'clubs', clubId));
      
      if (!clubDoc.exists()) {
        return false;
      }

      const clubData = clubDoc.data();
      return clubData.officerIds?.includes(userId) || false;
    } catch (error) {
      console.error('Error checking club officer status:', error);
      return false;
    }
  }

  /**
   * Checks if a user is a member of a specific club
   * 
   * @param userId - User ID to check
   * @param clubId - Club ID to check
   * @returns Promise<boolean> - True if user is a member of the club
   */
  async isClubMember(userId: string, clubId: string): Promise<boolean> {
    try {
      const clubDoc = await getDoc(doc(db, 'clubs', clubId));
      
      if (!clubDoc.exists()) {
        return false;
      }

      const clubData = clubDoc.data();
      return clubData.memberIds?.includes(userId) || false;
    } catch (error) {
      console.error('Error checking club member status:', error);
      return false;
    }
  }

  /**
   * Gets the club role for a user in a specific club
   * 
   * @param userId - User ID to check
   * @param clubId - Club ID to check
   * @returns Promise<ClubRole | null> - Club role or null if not a member
   */
  async getClubRole(userId: string, clubId: string): Promise<ClubRole | null> {
    try {
      const clubDoc = await getDoc(doc(db, 'clubs', clubId));
      
      if (!clubDoc.exists()) {
        return null;
      }

      const clubData = clubDoc.data();
      return clubData.memberRoles?.[userId] || null;
    } catch (error) {
      console.error('Error getting club role:', error);
      return null;
    }
  }

  /**
   * Checks if a user has permission to perform an action on a club
   * Combines system role permissions with club-specific roles
   * 
   * @param user - User to check
   * @param clubId - Club ID
   * @param permission - Permission to check
   * @returns Promise<boolean> - True if user has permission
   */
  async hasClubPermission(
    user: User,
    clubId: string,
    permission: Permission
  ): Promise<boolean> {
    // Administrators have all permissions
    if (user.role === UserRole.ADMINISTRATOR) {
      return true;
    }

    // Check system-level permission
    if (this.hasPermission(user, permission)) {
      // For club-specific operations, verify club membership/officer status
      const clubSpecificPermissions = [
        Permission.EDIT_CLUB,
        Permission.DELETE_CLUB,
        Permission.MANAGE_CLUB_MEMBERS,
        Permission.APPROVE_MEMBERSHIP_REQUESTS,
        Permission.UPLOAD_CLUB_DOCUMENTS,
        Permission.CREATE_CLUB_ANNOUNCEMENT,
        Permission.CREATE_EVENT,
        Permission.EDIT_EVENT,
        Permission.DELETE_EVENT,
        Permission.CANCEL_EVENT,
        Permission.MANAGE_EVENT_ATTENDANCE,
        Permission.GENERATE_EVENT_QR_CODE,
        Permission.VIEW_CLUB_ANALYTICS,
        Permission.PIN_THREAD,
        Permission.DELETE_THREAD,
      ];

      if (clubSpecificPermissions.includes(permission)) {
        return await this.isClubOfficer(user.userId, clubId);
      }

      return true;
    }

    return false;
  }

  /**
   * Enforces club-specific permission check
   * 
   * @param user - User to check
   * @param clubId - Club ID
   * @param permission - Permission to enforce
   * @throws Error if user doesn't have the permission
   */
  async enforceClubPermission(
    user: User,
    clubId: string,
    permission: Permission
  ): Promise<void> {
    const hasPermission = await this.hasClubPermission(user, clubId, permission);
    
    if (!hasPermission) {
      throw new Error(
        `Unauthorized: User does not have permission ${permission} for club ${clubId}`
      );
    }
  }

  /**
   * Checks if a user can perform an action on an event
   * 
   * @param user - User to check
   * @param eventId - Event ID
   * @param permission - Permission to check
   * @returns Promise<boolean> - True if user has permission
   */
  async hasEventPermission(
    user: User,
    eventId: string,
    permission: Permission
  ): Promise<boolean> {
    // Administrators have all permissions
    if (user.role === UserRole.ADMINISTRATOR) {
      return true;
    }

    // Get event to find its club
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      
      if (!eventDoc.exists()) {
        return false;
      }

      const eventData = eventDoc.data();
      const clubId = eventData.clubId;

      // Check club permission for the event's club
      return await this.hasClubPermission(user, clubId, permission);
    } catch (error) {
      console.error('Error checking event permission:', error);
      return false;
    }
  }

  /**
   * Enforces event-specific permission check
   * 
   * @param user - User to check
   * @param eventId - Event ID
   * @param permission - Permission to enforce
   * @throws Error if user doesn't have the permission
   */
  async enforceEventPermission(
    user: User,
    eventId: string,
    permission: Permission
  ): Promise<void> {
    const hasPermission = await this.hasEventPermission(user, eventId, permission);
    
    if (!hasPermission) {
      throw new Error(
        `Unauthorized: User does not have permission ${permission} for event ${eventId}`
      );
    }
  }
}

// Export singleton instance
export const authorizationService = new AuthorizationService();
