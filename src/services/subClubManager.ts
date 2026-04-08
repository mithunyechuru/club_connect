import { Timestamp } from 'firebase/firestore';
import { clubRepository } from '../repositories/clubRepository';
import { Club, ClubRole } from '../types';
import { validateName } from '../utils/validation';

/**
 * Service for managing sub-club operations
 * Handles sub-club creation with parent association, permission inheritance,
 * and automatic parent membership
 */
export class SubClubManager {
  /**
   * Create a sub-club with parent association
   * Implements Requirements 4.1, 4.2, 4.3:
   * - Associates sub-club with parent club
   * - Inherits parent club permissions for sub-club management
   * - Automatically grants parent club membership when joining sub-club
   * 
   * @param name - Sub-club name
   * @param description - Sub-club description
   * @param parentClubId - ID of the parent club
   * @param creatorId - ID of the user creating the sub-club
   * @returns Promise<Club> The created sub-club
   */
  async createSubClub(
    name: string,
    description: string,
    parentClubId: string,
    creatorId: string
  ): Promise<Club> {
    // Validate input data
    this.validateSubClubData(name, description, parentClubId);

    // Verify parent club exists
    const parentClub = await clubRepository.getClubById(parentClubId);
    if (!parentClub) {
      throw new Error('Parent club not found');
    }

    // Verify creator has permission to create sub-club (must be parent club officer)
    if (!parentClub.officerIds.includes(creatorId)) {
      throw new Error('Only parent club officers can create sub-clubs');
    }

    // Create sub-club data with creator as officer and member
    const subClubData: Omit<Club, 'clubId'> = {
      name: name.trim(),
      description: description.trim(),
      parentClubId,
      officerIds: [creatorId],
      memberIds: [creatorId],
      memberRoles: {
        [creatorId]: ClubRole.PRESIDENT,
      },
      documentIds: [],
      managerId: null,
      category: 'Sub-Club',
      createdAt: Timestamp.now(),
    };

    return await clubRepository.createClub(subClubData);
  }

  /**
   * Check if a user has permission to manage a sub-club
   * Implements Requirement 4.2: Parent permission inheritance
   * 
   * Parent club officers automatically have management permissions for sub-clubs
   * 
   * @param subClubId - ID of the sub-club
   * @param userId - ID of the user
   * @returns Promise<boolean> True if user has management permission
   */
  async hasSubClubManagementPermission(
    subClubId: string,
    userId: string
  ): Promise<boolean> {
    // Get the sub-club
    const subClub = await clubRepository.getClubById(subClubId);
    if (!subClub) {
      return false;
    }

    // Check if user is a sub-club officer
    if (subClub.officerIds.includes(userId)) {
      return true;
    }

    // Check if sub-club has a parent
    if (!subClub.parentClubId) {
      return false;
    }

    // Check if user is a parent club officer (permission inheritance)
    const parentClub = await clubRepository.getClubById(subClub.parentClubId);
    if (!parentClub) {
      return false;
    }

    return parentClub.officerIds.includes(userId);
  }

  /**
   * Add a member to a sub-club with automatic parent membership
   * Implements Requirement 4.3: Automatic parent membership on sub-club join
   * 
   * When a student joins a sub-club, they automatically become a member
   * of the parent club if not already a member
   * 
   * @param subClubId - ID of the sub-club
   * @param userId - ID of the user to add
   * @param role - The role to assign in the sub-club (defaults to MEMBER)
   * @returns Promise<void>
   */
  async addMemberToSubClub(
    subClubId: string,
    userId: string,
    role: ClubRole = ClubRole.MEMBER
  ): Promise<void> {
    // Get the sub-club
    const subClub = await clubRepository.getClubById(subClubId);
    if (!subClub) {
      throw new Error('Sub-club not found');
    }

    // Verify this is actually a sub-club
    if (!subClub.parentClubId) {
      throw new Error('This is not a sub-club');
    }

    // Check if user is already a member of the sub-club
    if (subClub.memberIds.includes(userId)) {
      throw new Error('User is already a member of this sub-club');
    }

    // Get the parent club
    const parentClub = await clubRepository.getClubById(subClub.parentClubId);
    if (!parentClub) {
      throw new Error('Parent club not found');
    }

    // Add user to parent club if not already a member (Requirement 4.3)
    if (!parentClub.memberIds.includes(userId)) {
      const updatedParentMemberIds = [...parentClub.memberIds, userId];
      const updatedParentMemberRoles = {
        ...parentClub.memberRoles,
        [userId]: ClubRole.MEMBER, // Always add as regular member to parent
      };

      await clubRepository.updateClub(subClub.parentClubId, {
        memberIds: updatedParentMemberIds,
        memberRoles: updatedParentMemberRoles,
      });
    }

    // Add user to sub-club with specified role
    const updatedSubClubMemberIds = [...subClub.memberIds, userId];
    const updatedSubClubMemberRoles = {
      ...subClub.memberRoles,
      [userId]: role,
    };

    // If role is an officer role, add to officer list
    const updatedSubClubOfficerIds = this.isOfficerRole(role)
      ? [...subClub.officerIds, userId]
      : subClub.officerIds;

    await clubRepository.updateClub(subClubId, {
      memberIds: updatedSubClubMemberIds,
      memberRoles: updatedSubClubMemberRoles,
      officerIds: updatedSubClubOfficerIds,
    });
  }

  /**
   * Get all sub-clubs of a parent club
   * @param parentClubId - ID of the parent club
   * @returns Promise<Club[]> Array of sub-clubs
   */
  async getSubClubs(parentClubId: string): Promise<Club[]> {
    return await clubRepository.getSubClubs(parentClubId);
  }

  /**
   * Get the parent club of a sub-club
   * @param subClubId - ID of the sub-club
   * @returns Promise<Club | null> The parent club if exists
   */
  async getParentClub(subClubId: string): Promise<Club | null> {
    const subClub = await clubRepository.getClubById(subClubId);
    if (!subClub || !subClub.parentClubId) {
      return null;
    }

    return await clubRepository.getClubById(subClub.parentClubId);
  }

  /**
   * Check if a club is a sub-club
   * @param clubId - ID of the club
   * @returns Promise<boolean> True if the club is a sub-club
   */
  async isSubClub(clubId: string): Promise<boolean> {
    const club = await clubRepository.getClubById(clubId);
    return club !== null && club.parentClubId !== null;
  }

  /**
   * Validate sub-club data
   * @param name - Sub-club name
   * @param description - Sub-club description
   * @param parentClubId - Parent club ID
   * @throws Error if validation fails
   */
  private validateSubClubData(
    name: string,
    description: string,
    parentClubId: string
  ): void {
    validateName(name, 'Sub-club name');

    if (!description || description.trim().length === 0) {
      throw new Error('Sub-club description cannot be empty');
    }
    if (description.trim().length > 1000) {
      throw new Error('Sub-club description is too long (maximum 1000 characters)');
    }

    if (!parentClubId || parentClubId.trim().length === 0) {
      throw new Error('Parent club ID is required for sub-clubs');
    }
  }

  /**
   * Check if a role is an officer role
   * @param role - The role to check
   * @returns boolean True if the role is an officer role
   */
  private isOfficerRole(role: ClubRole): boolean {
    return (
      role === ClubRole.PRESIDENT ||
      role === ClubRole.VICE_PRESIDENT ||
      role === ClubRole.SECRETARY
    );
  }
}

export const subClubManager = new SubClubManager();
