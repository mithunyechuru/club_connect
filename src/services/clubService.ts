import { Timestamp, collection, addDoc, query, orderBy, limit, startAfter, getDocs, DocumentSnapshot } from 'firebase/firestore';
import { clubRepository } from '../repositories/clubRepository';
import { Club, ClubRole, ClubAnnouncement } from '../types';
import { validateName } from '../utils/validation';
import { db } from './firebase';

/**
 * Service for managing club operations
 * Handles club creation, updates, membership management, and role assignments
 */
export class ClubService {
  /**
   * Create a new club with the creator assigned as an officer
   * @param name - Club name
   * @param description - Club description
   * @param creatorId - ID of the user creating the club
   * @param parentClubId - Optional parent club ID for sub-clubs
   * @returns Promise<Club> The created club
   * 
   * @note For creating sub-clubs with proper permission inheritance and automatic
   * parent membership, consider using SubClubManager.createSubClub() instead,
   * which enforces Requirements 4.1, 4.2, and 4.3.
   */
  async createClub(
    name: string,
    description: string,
    creatorId: string,
    parentClubId: string | null = null
  ): Promise<Club> {
    // Validate input data
    this.validateClubData(name, description);

    // If this is a sub-club, verify parent exists
    if (parentClubId) {
      const parentClub = await clubRepository.getClubById(parentClubId);
      if (!parentClub) {
        throw new Error('Parent club not found');
      }
    }

    // Create club data with creator as officer and member
    const clubData: Omit<Club, 'clubId'> = {
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
      category: 'General', // Default category for new clubs
      createdAt: Timestamp.now(),
    };

    return await clubRepository.createClub(clubData);
  }

  /**
   * Update club information
   * @param clubId - The ID of the club to update
   * @param updates - Partial club data to update
   * @returns Promise<void>
   */
  async updateClub(
    clubId: string,
    updates: {
      name?: string;
      description?: string;
      tierConfig?: Club['tierConfig'];
    }
  ): Promise<void> {
    // Verify club exists
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    // Validate updates
    if (updates.name !== undefined) {
      validateName(updates.name, 'Club name');
    }
    if (updates.description !== undefined) {
      if (!updates.description || updates.description.trim().length === 0) {
        throw new Error('Club description cannot be empty');
      }
      if (updates.description.trim().length > 1000) {
        throw new Error('Club description is too long (maximum 1000 characters)');
      }
    }

    // Prepare update data
    const updateData: Partial<Omit<Club, 'clubId'>> = {};
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description.trim();
    }
    if (updates.tierConfig !== undefined) {
      updateData.tierConfig = updates.tierConfig;
    }

    await clubRepository.updateClub(clubId, updateData);
  }

  /**
   * Delete a club
   * @param clubId - The ID of the club to delete
   * @returns Promise<void>
   */
  async deleteClub(clubId: string): Promise<void> {
    // Verify club exists
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    // Check if club has sub-clubs
    const subClubs = await clubRepository.getSubClubs(clubId);
    if (subClubs.length > 0) {
      throw new Error('Cannot delete club with existing sub-clubs');
    }

    await clubRepository.deleteClub(clubId);
  }

  /**
   * Add a member to a club
   * @param clubId - The ID of the club
   * @param userId - The ID of the user to add
   * @param role - The role to assign (defaults to MEMBER)
   * @returns Promise<void>
   */
  async addMember(
    clubId: string,
    userId: string,
    role: ClubRole = ClubRole.MEMBER
  ): Promise<void> {
    // Verify club exists
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    // Check if user is already a member
    if (club.memberIds.includes(userId)) {
      throw new Error('User is already a member of this club');
    }

    // Add user to member list and assign role
    const updatedMemberIds = [...club.memberIds, userId];
    const updatedMemberRoles = {
      ...club.memberRoles,
      [userId]: role,
    };

    // If role is an officer role, add to officer list
    const updatedOfficerIds = this.isOfficerRole(role)
      ? [...club.officerIds, userId]
      : club.officerIds;

    await clubRepository.updateClub(clubId, {
      memberIds: updatedMemberIds,
      memberRoles: updatedMemberRoles,
      officerIds: updatedOfficerIds,
    });
  }

  /**
   * Remove a member from a club
   * @param clubId - The ID of the club
   * @param userId - The ID of the user to remove
   * @returns Promise<void>
   */
  async removeMember(clubId: string, userId: string): Promise<void> {
    // Verify club exists
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    // Check if user is a member
    if (!club.memberIds.includes(userId)) {
      throw new Error('User is not a member of this club');
    }

    // Prevent removing the last officer
    if (club.officerIds.includes(userId) && club.officerIds.length === 1) {
      throw new Error('Cannot remove the last officer from the club');
    }

    // Remove user from member list, officer list, and roles
    const updatedMemberIds = club.memberIds.filter(id => id !== userId);
    const updatedOfficerIds = club.officerIds.filter(id => id !== userId);
    const updatedMemberRoles = { ...club.memberRoles };
    delete updatedMemberRoles[userId];

    await clubRepository.updateClub(clubId, {
      memberIds: updatedMemberIds,
      officerIds: updatedOfficerIds,
      memberRoles: updatedMemberRoles,
    });
  }

  /**
   * Assign or update a member's role in a club
   * @param clubId - The ID of the club
   * @param userId - The ID of the user
   * @param newRole - The new role to assign
   * @returns Promise<void>
   */
  async assignMemberRole(
    clubId: string,
    userId: string,
    newRole: ClubRole
  ): Promise<void> {
    // Verify club exists
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    // Check if user is a member
    if (!club.memberIds.includes(userId)) {
      throw new Error('User is not a member of this club');
    }

    const isCurrentlyOfficer = club.officerIds.includes(userId);
    const isNewRoleOfficer = this.isOfficerRole(newRole);

    // Prevent demoting the last officer to a non-officer role
    if (isCurrentlyOfficer && !isNewRoleOfficer && club.officerIds.length === 1) {
      throw new Error('Cannot demote the last officer to a non-officer role');
    }

    // Update member role
    const updatedMemberRoles = {
      ...club.memberRoles,
      [userId]: newRole,
    };

    // Update officer list based on new role
    let updatedOfficerIds = [...club.officerIds];
    if (isNewRoleOfficer && !isCurrentlyOfficer) {
      // Promote to officer
      updatedOfficerIds.push(userId);
    } else if (!isNewRoleOfficer && isCurrentlyOfficer) {
      // Demote from officer
      updatedOfficerIds = updatedOfficerIds.filter(id => id !== userId);
    }

    await clubRepository.updateClub(clubId, {
      memberRoles: updatedMemberRoles,
      officerIds: updatedOfficerIds,
    });
  }

  /**
   * Get a club by ID
   * @param clubId - The ID of the club
   * @returns Promise<Club | null> The club if found
   */
  async getClubById(clubId: string): Promise<Club | null> {
    return await clubRepository.getClubById(clubId);
  }

  /**
   * Get all clubs where a user is a member
   * @param userId - The ID of the user
   * @returns Promise<Club[]> Array of clubs
   */
  async getClubsByMember(userId: string): Promise<Club[]> {
    return await clubRepository.getClubsByMember(userId);
  }

  /**
   * Get all clubs where a user is an officer
   * @param userId - The ID of the user
   * @returns Promise<Club[]> Array of clubs
   */
  async getClubsByOfficer(userId: string): Promise<Club[]> {
    return await clubRepository.getClubsByOfficer(userId);
  }

  /**
   * Get all sub-clubs of a parent club
   * @param parentClubId - The ID of the parent club
   * @returns Promise<Club[]> Array of sub-clubs
   */
  async getSubClubs(parentClubId: string): Promise<Club[]> {
    return await clubRepository.getSubClubs(parentClubId);
  }

  /**
   * Check if a user is a member of a club
   * @param clubId - The ID of the club
   * @param userId - The ID of the user
   * @returns Promise<boolean> True if user is a member
   */
  async isMember(clubId: string, userId: string): Promise<boolean> {
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      return false;
    }
    return club.memberIds.includes(userId);
  }

  /**
   * Check if a user is an officer of a club
   * @param clubId - The ID of the club
   * @param userId - The ID of the user
   * @returns Promise<boolean> True if user is an officer
   */
  async isOfficer(clubId: string, userId: string): Promise<boolean> {
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      return false;
    }
    return club.officerIds.includes(userId);
  }

  /**
   * Get a member's role in a club
   * @param clubId - The ID of the club
   * @param userId - The ID of the user
   * @returns Promise<ClubRole | null> The user's role or null if not a member
   */
  async getMemberRole(clubId: string, userId: string): Promise<ClubRole | null> {
    const club = await clubRepository.getClubById(clubId);
    if (!club || !club.memberIds.includes(userId)) {
      return null;
    }
    return club.memberRoles[userId] || null;
  }

  /**
   * Validate club data
   * @param name - Club name
   * @param description - Club description
   * @throws Error if validation fails
   */
  private validateClubData(name: string, description: string): void {
    validateName(name, 'Club name');

    if (!description || description.trim().length === 0) {
      throw new Error('Club description cannot be empty');
    }
    if (description.trim().length > 1000) {
      throw new Error('Club description is too long (maximum 1000 characters)');
    }
  }

  /**
   * Check if a role is an officer role
   * @param role - The role to check
   * @returns boolean True if the role is an officer role
   */
  private isOfficerRole(role: ClubRole): boolean {
    return role === ClubRole.PRESIDENT ||
      role === ClubRole.VICE_PRESIDENT ||
      role === ClubRole.SECRETARY;
  }

  /**
   * Create an announcement for a club
   * @param clubId - The ID of the club
   * @param title - The announcement title
   * @param content - The announcement content
   * @param authorId - The ID of the user creating the announcement
   * @returns Promise<ClubAnnouncement> The created announcement
   */
  async createAnnouncement(
    clubId: string,
    title: string,
    content: string,
    authorId: string
  ): Promise<ClubAnnouncement> {
    // Verify club exists
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    // Verify author is an officer of the club
    if (!club.officerIds.includes(authorId)) {
      throw new Error('Only club officers can create announcements');
    }

    // Validate input
    if (!title || title.trim().length === 0) {
      throw new Error('Announcement title cannot be empty');
    }
    if (title.trim().length > 200) {
      throw new Error('Announcement title is too long (maximum 200 characters)');
    }
    if (!content || content.trim().length === 0) {
      throw new Error('Announcement content cannot be empty');
    }
    if (content.trim().length > 5000) {
      throw new Error('Announcement content is too long (maximum 5000 characters)');
    }

    // Create announcement in subcollection
    const announcementData = {
      clubId,
      title: title.trim(),
      content: content.trim(),
      authorId,
      createdAt: Timestamp.now(),
    };

    const announcementsRef = collection(db, 'clubs', clubId, 'announcements');
    const docRef = await addDoc(announcementsRef, announcementData);

    return {
      announcementId: docRef.id,
      ...announcementData,
    };
  }

  /**
   * Get announcements for a club with pagination
   * @param clubId - The ID of the club
   * @param pageSize - Number of announcements per page (default: 20)
   * @param lastDoc - Last document from previous page for pagination
   * @returns Promise with announcements array and last document
   */
  async getAnnouncements(
    clubId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{ announcements: ClubAnnouncement[]; lastDoc: DocumentSnapshot | null }> {
    // Verify club exists
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    const announcementsRef = collection(db, 'clubs', clubId, 'announcements');

    // Build query with pagination
    let q = query(
      announcementsRef,
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(
        announcementsRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const querySnapshot = await getDocs(q);

    const announcements: ClubAnnouncement[] = querySnapshot.docs.map(doc => ({
      announcementId: doc.id,
      clubId,
      ...doc.data(),
    } as ClubAnnouncement));

    const lastDocument = querySnapshot.docs.length > 0
      ? querySnapshot.docs[querySnapshot.docs.length - 1]
      : null;

    return { announcements, lastDoc: lastDocument };
  }
}

export const clubService = new ClubService();
