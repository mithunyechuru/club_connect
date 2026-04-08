import { userRepository } from '../repositories/userRepository';
import { UserRole, ClubRole, User } from '../types';

/**
 * Permission types for role-based access control
 */
export enum Permission {
  // User permissions
  VIEW_PROFILE = 'VIEW_PROFILE',
  EDIT_OWN_PROFILE = 'EDIT_OWN_PROFILE',
  
  // Club permissions
  VIEW_CLUB = 'VIEW_CLUB',
  CREATE_CLUB = 'CREATE_CLUB',
  EDIT_CLUB = 'EDIT_CLUB',
  DELETE_CLUB = 'DELETE_CLUB',
  MANAGE_CLUB_MEMBERS = 'MANAGE_CLUB_MEMBERS',
  MANAGE_CLUB_OFFICERS = 'MANAGE_CLUB_OFFICERS',
  
  // Event permissions
  VIEW_EVENT = 'VIEW_EVENT',
  CREATE_EVENT = 'CREATE_EVENT',
  EDIT_EVENT = 'EDIT_EVENT',
  DELETE_EVENT = 'DELETE_EVENT',
  MANAGE_EVENT_ATTENDANCE = 'MANAGE_EVENT_ATTENDANCE',
  
  // RSVP permissions
  RSVP_TO_EVENT = 'RSVP_TO_EVENT',
  CANCEL_RSVP = 'CANCEL_RSVP',
  
  // Admin permissions
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_VENUES = 'MANAGE_VENUES',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  SYSTEM_CONFIGURATION = 'SYSTEM_CONFIGURATION',
}

/**
 * Role hierarchy levels (higher number = more privileges)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.STUDENT]: 1,
  [UserRole.CLUB_OFFICER]: 2,
  [UserRole.ADMINISTRATOR]: 3,
};

/**
 * Club role hierarchy levels
 */
const CLUB_ROLE_HIERARCHY: Record<ClubRole, number> = {
  [ClubRole.MEMBER]: 1,
  [ClubRole.SECRETARY]: 2,
  [ClubRole.VICE_PRESIDENT]: 3,
  [ClubRole.PRESIDENT]: 4,
};

/**
 * Permissions for each user role
 */
const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  [UserRole.STUDENT]: new Set([
    Permission.VIEW_PROFILE,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_CLUB,
    Permission.VIEW_EVENT,
    Permission.RSVP_TO_EVENT,
    Permission.CANCEL_RSVP,
  ]),
  [UserRole.CLUB_OFFICER]: new Set([
    Permission.VIEW_PROFILE,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_CLUB,
    Permission.CREATE_CLUB,
    Permission.EDIT_CLUB,
    Permission.MANAGE_CLUB_MEMBERS,
    Permission.MANAGE_CLUB_OFFICERS,
    Permission.VIEW_EVENT,
    Permission.CREATE_EVENT,
    Permission.EDIT_EVENT,
    Permission.DELETE_EVENT,
    Permission.MANAGE_EVENT_ATTENDANCE,
    Permission.RSVP_TO_EVENT,
    Permission.CANCEL_RSVP,
    Permission.VIEW_ANALYTICS,
  ]),
  [UserRole.ADMINISTRATOR]: new Set([
    Permission.VIEW_PROFILE,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_CLUB,
    Permission.CREATE_CLUB,
    Permission.EDIT_CLUB,
    Permission.DELETE_CLUB,
    Permission.MANAGE_CLUB_MEMBERS,
    Permission.MANAGE_CLUB_OFFICERS,
    Permission.VIEW_EVENT,
    Permission.CREATE_EVENT,
    Permission.EDIT_EVENT,
    Permission.DELETE_EVENT,
    Permission.MANAGE_EVENT_ATTENDANCE,
    Permission.RSVP_TO_EVENT,
    Permission.CANCEL_RSVP,
    Permission.MANAGE_USERS,
    Permission.MANAGE_VENUES,
    Permission.VIEW_ANALYTICS,
    Permission.SYSTEM_CONFIGURATION,
  ]),
};

/**
 * Service for managing user roles and permissions
 * Handles role assignment, validation, and hierarchy checks
 */
export class RoleManager {
  /**
   * Assign a role to a user with permission updates
   * @param userId - The ID of the user
   * @param newRole - The new role to assign
   * @param assignedBy - The ID of the user assigning the role
   * @returns Promise<void>
   */
  async assignRole(userId: string, newRole: UserRole, assignedBy: string): Promise<void> {
    // Get the user being assigned the role
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get the user assigning the role
    const assigner = await userRepository.getUserById(assignedBy);
    if (!assigner) {
      throw new Error('Assigner not found');
    }

    // Validate role assignment
    this.validateRoleAssignment(assigner.role, newRole);

    // Update user role
    await userRepository.updateUser(userId, { role: newRole });
  }

  /**
   * Validate if a role assignment is allowed
   * @param assignerRole - The role of the user assigning the role
   * @param targetRole - The role being assigned
   * @throws Error if assignment is not allowed
   */
  validateRoleAssignment(assignerRole: UserRole, targetRole: UserRole): void {
    // Only administrators can assign roles
    if (assignerRole !== UserRole.ADMINISTRATOR) {
      throw new Error('Only administrators can assign roles');
    }

    // Validate target role exists
    if (!Object.values(UserRole).includes(targetRole)) {
      throw new Error('Invalid target role');
    }
  }

  /**
   * Check if a role has a specific permission
   * @param role - The user role
   * @param permission - The permission to check
   * @returns boolean True if the role has the permission
   */
  hasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? permissions.has(permission) : false;
  }

  /**
   * Get all permissions for a role
   * @param role - The user role
   * @returns Set<Permission> Set of permissions for the role
   */
  getPermissions(role: UserRole): Set<Permission> {
    return new Set(ROLE_PERMISSIONS[role] || []);
  }

  /**
   * Check if one role is higher in hierarchy than another
   * @param role1 - First role
   * @param role2 - Second role
   * @returns boolean True if role1 is higher than role2
   */
  isRoleHigher(role1: UserRole, role2: UserRole): boolean {
    return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
  }

  /**
   * Check if one role is equal or higher in hierarchy than another
   * @param role1 - First role
   * @param role2 - Second role
   * @returns boolean True if role1 is equal or higher than role2
   */
  isRoleEqualOrHigher(role1: UserRole, role2: UserRole): boolean {
    return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
  }

  /**
   * Check if one club role is higher in hierarchy than another
   * @param role1 - First club role
   * @param role2 - Second club role
   * @returns boolean True if role1 is higher than role2
   */
  isClubRoleHigher(role1: ClubRole, role2: ClubRole): boolean {
    return CLUB_ROLE_HIERARCHY[role1] > CLUB_ROLE_HIERARCHY[role2];
  }

  /**
   * Check if one club role is equal or higher in hierarchy than another
   * @param role1 - First club role
   * @param role2 - Second club role
   * @returns boolean True if role1 is equal or higher than role2
   */
  isClubRoleEqualOrHigher(role1: ClubRole, role2: ClubRole): boolean {
    return CLUB_ROLE_HIERARCHY[role1] >= CLUB_ROLE_HIERARCHY[role2];
  }

  /**
   * Validate if a user can perform an action based on their role
   * @param user - The user attempting the action
   * @param permission - The required permission
   * @throws Error if user doesn't have permission
   */
  enforcePermission(user: User, permission: Permission): void {
    if (!this.hasPermission(user.role, permission)) {
      throw new Error(`User does not have permission: ${permission}`);
    }
  }

  /**
   * Get the hierarchy level of a role
   * @param role - The user role
   * @returns number The hierarchy level
   */
  getRoleLevel(role: UserRole): number {
    return ROLE_HIERARCHY[role];
  }

  /**
   * Get the hierarchy level of a club role
   * @param role - The club role
   * @returns number The hierarchy level
   */
  getClubRoleLevel(role: ClubRole): number {
    return CLUB_ROLE_HIERARCHY[role];
  }
}

export const roleManager = new RoleManager();
