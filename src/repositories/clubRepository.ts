import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  startAfter,
  orderBy,
  DocumentSnapshot,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Club } from '../types';

/**
 * Repository for managing Club entities in Firestore
 * Provides CRUD operations, sub-club queries, pagination, and filtering
 */
export class ClubRepository {
  private readonly collectionName = 'clubs';

  /**
   * Get a club by its ID
   * @param clubId - The unique identifier of the club
   * @returns Promise<Club | null> The club if found, null otherwise
   */
  async getClubById(clubId: string): Promise<Club | null> {
    try {
      const clubDoc = await getDoc(doc(db, this.collectionName, clubId));

      if (!clubDoc.exists()) {
        return null;
      }

      return {
        clubId: clubDoc.id,
        ...clubDoc.data(),
      } as Club;
    } catch (error) {
      console.error('Error getting club by ID:', error);
      throw new Error(`Failed to get club with ID ${clubId}`);
    }
  }

  /**
   * Get a club by its name (exact match)
   * @param name - The name of the club
   * @returns Promise<Club | null>
   */
  async getClubByName(name: string): Promise<Club | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('name', '==', name),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      return {
        clubId: doc.id,
        ...doc.data(),
      } as Club;
    } catch (error) {
      console.error('Error getting club by name:', error);
      return null;
    }
  }

  /**
   * Get all clubs where a user is a member
   * @param userId - The ID of the user
   * @returns Promise<Club[]> Array of clubs where the user is a member
   */
  async getClubsByMember(userId: string): Promise<Club[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('memberIds', 'array-contains', userId)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        clubId: doc.id,
        ...doc.data(),
      } as Club));
    } catch (error) {
      console.error('Error getting clubs by member:', error);
      throw new Error(`Failed to get clubs for user ${userId}`);
    }
  }

  /**
   * Get all sub-clubs of a parent club
   * @param parentClubId - The ID of the parent club
   * @returns Promise<Club[]> Array of sub-clubs
   */
  async getSubClubs(parentClubId: string): Promise<Club[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('parentClubId', '==', parentClubId)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        clubId: doc.id,
        ...doc.data(),
      } as Club));
    } catch (error) {
      console.error('Error getting sub-clubs:', error);
      throw new Error(`Failed to get sub-clubs for parent ${parentClubId}`);
    }
  }

  /**
   * Create a new club
   * @param clubData - The club data (without clubId)
   * @returns Promise<Club> The created club with generated ID
   */
  async createClub(clubData: Omit<Club, 'clubId'>): Promise<Club> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...clubData,
        createdAt: clubData.createdAt || Timestamp.now(),
      });

      const createdClub: Club = {
        clubId: docRef.id,
        ...clubData,
      };

      return createdClub;
    } catch (error) {
      console.error('Error creating club:', error);
      throw new Error('Failed to create club');
    }
  }

  /**
   * Update an existing club
   * @param clubId - The ID of the club to update
   * @param updates - Partial club data to update
   * @returns Promise<void>
   */
  async updateClub(clubId: string, updates: Partial<Omit<Club, 'clubId'>> | any): Promise<void> {
    try {
      const clubRef = doc(db, this.collectionName, clubId);
      await updateDoc(clubRef, updates);
    } catch (error) {
      console.error('Error updating club:', error);
      throw new Error(`Failed to update club with ID ${clubId}`);
    }
  }

  /**
   * Delete a club
   * @param clubId - The ID of the club to delete
   * @returns Promise<void>
   */
  async deleteClub(clubId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, clubId));
    } catch (error) {
      console.error('Error deleting club:', error);
      throw new Error(`Failed to delete club with ID ${clubId}`);
    }
  }

  /**
   * Query clubs with pagination and optional filtering
   * @param options - Query options including pagination and filters
   * @returns Promise with clubs array and last document
   */
  async queryClubs(options: {
    pageSize?: number;
    lastDoc?: DocumentSnapshot;
    parentClubId?: string | null;
    hasParent?: boolean;
  } = {}): Promise<{ clubs: Club[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const pageSize = options.pageSize || 20;
      let q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      // Filter by parent club relationship
      if (options.parentClubId !== undefined) {
        q = query(
          collection(db, this.collectionName),
          where('parentClubId', '==', options.parentClubId),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      } else if (options.hasParent !== undefined) {
        // Filter for clubs with or without parents
        if (options.hasParent) {
          q = query(
            collection(db, this.collectionName),
            where('parentClubId', '!=', null),
            orderBy('parentClubId'),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
          );
        } else {
          q = query(
            collection(db, this.collectionName),
            where('parentClubId', '==', null),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
          );
        }
      }

      // Add pagination
      if (options.lastDoc) {
        // Rebuild query with startAfter
        if (options.parentClubId !== undefined) {
          q = query(
            collection(db, this.collectionName),
            where('parentClubId', '==', options.parentClubId),
            orderBy('createdAt', 'desc'),
            startAfter(options.lastDoc),
            limit(pageSize)
          );
        } else if (options.hasParent !== undefined) {
          if (options.hasParent) {
            q = query(
              collection(db, this.collectionName),
              where('parentClubId', '!=', null),
              orderBy('parentClubId'),
              orderBy('createdAt', 'desc'),
              startAfter(options.lastDoc),
              limit(pageSize)
            );
          } else {
            q = query(
              collection(db, this.collectionName),
              where('parentClubId', '==', null),
              orderBy('createdAt', 'desc'),
              startAfter(options.lastDoc),
              limit(pageSize)
            );
          }
        } else {
          q = query(
            collection(db, this.collectionName),
            orderBy('createdAt', 'desc'),
            startAfter(options.lastDoc),
            limit(pageSize)
          );
        }
      }

      const querySnapshot = await getDocs(q);

      const clubs: Club[] = querySnapshot.docs.map(doc => ({
        clubId: doc.id,
        ...doc.data(),
      } as Club));

      const lastDocument = querySnapshot.docs.length > 0
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;

      return { clubs, lastDoc: lastDocument };
    } catch (error) {
      console.error('Error querying clubs:', error);
      throw new Error('Failed to query clubs');
    }
  }

  /**
   * Get all clubs (without pagination) - use with caution
   * @returns Promise<Club[]> Array of all clubs
   */
  async getAllClubs(): Promise<Club[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));

      return querySnapshot.docs.map(doc => ({
        clubId: doc.id,
        ...doc.data(),
      } as Club));
    } catch (error) {
      console.error('Error getting all clubs:', error);
      throw new Error('Failed to get all clubs');
    }
  }

  /**
   * Search clubs by name (case-insensitive partial match)
   * @param searchTerm - The search term
   * @returns Promise<Club[]> Array of matching clubs
   */
  async searchClubsByName(searchTerm: string): Promise<Club[]> {
    try {
      // Note: Firestore doesn't support case-insensitive or partial text search natively
      // This implementation fetches all clubs and filters in memory
      // For production, consider using Algolia or Elasticsearch for better search
      const allClubs = await this.getAllClubs();
      const lowerSearchTerm = searchTerm.toLowerCase();

      return allClubs.filter(club =>
        club.name.toLowerCase().includes(lowerSearchTerm) ||
        club.description.toLowerCase().includes(lowerSearchTerm)
      );
    } catch (error) {
      console.error('Error searching clubs by name:', error);
      throw new Error('Failed to search clubs');
    }
  }

  /**
   * Get clubs where a user is an officer
   * @param userId - The ID of the user
   * @returns Promise<Club[]> Array of clubs where the user is an officer
   */
  async getClubsByOfficer(userId: string): Promise<Club[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('officerIds', 'array-contains', userId)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        clubId: doc.id,
        ...doc.data(),
      } as Club));
    } catch (error) {
      console.error('Error getting clubs by officer:', error);
      throw new Error(`Failed to get clubs for officer ${userId}`);
    }
  }

  /**
   * Add a member to a club
   * @param clubId - The ID of the club
   * @param userId - The ID of the user to add
   */
  async addMember(clubId: string, userId: string): Promise<void> {
    try {
      const clubRef = doc(db, this.collectionName, clubId);
      await updateDoc(clubRef, {
        memberIds: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error adding member to club:', error);
      throw new Error(`Failed to add member ${userId} to club ${clubId}`);
    }
  }
}

export const clubRepository = new ClubRepository();
