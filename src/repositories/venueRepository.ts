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
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { dbConnectionManager } from '../services/databaseConnectionManager';
import { Venue } from '../types';

/**
 * Repository for managing Venue entities in Firestore
 * Provides CRUD operations and search methods
 */
export class VenueRepository {
  private readonly collectionName = 'venues';

  /**
   * Get a venue by its ID
   * @param venueId - The unique identifier of the venue
   * @returns Promise<Venue | null> The venue if found, null otherwise
   */
  async getVenueById(venueId: string): Promise<Venue | null> {
    return dbConnectionManager.executeWithRetry(async (connection) => {
      const venueDoc = await getDoc(doc(connection, this.collectionName, venueId));

      if (!venueDoc.exists()) {
        return null;
      }

      return {
        venueId: venueDoc.id,
        ...venueDoc.data(),
      } as Venue;
    });
  }

  /**
   * Get all venues
   * @returns Promise<Venue[]> Array of all venues
   */
  async getAllVenues(): Promise<Venue[]> {
    return dbConnectionManager.executeWithRetry(async (connection) => {
      const querySnapshot = await getDocs(collection(connection, this.collectionName));

      return querySnapshot.docs.map(doc => ({
        venueId: doc.id,
        ...doc.data(),
      } as Venue));
    });
  }

  /**
   * Subscribe to real-time venue updates
   * @param callback - Function called with updated venues list
   * @returns Unsubscribe function
   */
  subscribeToVenues(callback: (venues: Venue[]) => void): () => void {
    const q = query(collection(db, this.collectionName), orderBy('floor'), orderBy('name'));
    
    return onSnapshot(q, (snapshot) => {
      const venues = snapshot.docs.map(doc => ({
        venueId: doc.id,
        ...doc.data(),
      } as Venue));
      callback(venues);
    }, (error) => {
      console.error('Error subscribing to venues:', error);
    });
  }

  /**
   * Create a new venue
   * @param venueData - The venue data (without venueId)
   * @returns Promise<Venue> The created venue with generated ID
   */
  async createVenue(venueData: Omit<Venue, 'venueId'>): Promise<Venue> {
    return dbConnectionManager.executeWithRetry(async (connection) => {
      const docRef = await addDoc(collection(connection, this.collectionName), {
        ...venueData,
        isAvailable: venueData.isAvailable ?? true,
        status: venueData.status ?? 'active',
        building: venueData.building ?? 'Main Block',
        createdAt: venueData.createdAt || Timestamp.now(),
      });

      return {
        venueId: docRef.id,
        ...venueData,
      } as Venue;
    });
  }

  /**
   * Update an existing venue
   * @param venueId - The ID of the venue to update
   * @param updates - Partial venue data to update
   * @returns Promise<void>
   */
  async updateVenue(venueId: string, updates: Partial<Omit<Venue, 'venueId'>>): Promise<void> {
    return dbConnectionManager.executeWithRetry(async (connection) => {
      const venueRef = doc(connection, this.collectionName, venueId);
      await updateDoc(venueRef, updates);
    });
  }

  /**
   * Delete a venue
   * @param venueId - The ID of the venue to delete
   * @returns Promise<void>
   */
  async deleteVenue(venueId: string): Promise<void> {
    return dbConnectionManager.executeWithRetry(async (connection) => {
      await deleteDoc(doc(connection, this.collectionName, venueId));
    });
  }

  /**
   * Search venues with filters and pagination
   * @param options - Search options including capacity, equipment, and features
   * @returns Promise with venues array and last document
   */
  async searchVenues(options: {
    minCapacity?: number;
    requiredEquipment?: string[];
    requiredFeatures?: string[];
    pageSize?: number;
    lastDoc?: DocumentSnapshot;
  } = {}): Promise<{ venues: Venue[]; lastDoc: DocumentSnapshot | null }> {
    return dbConnectionManager.executeWithRetry(async (connection) => {
      const pageSize = options.pageSize || 20;

      let q = query(
        collection(connection, this.collectionName),
        orderBy('name'),
        limit(pageSize)
      );

      // Filtering in Firestore is limited for multiple array-contains and range queries on different fields.
      // We'll apply basic filters here and more complex ones in memory if necessary, 
      // or implement advanced indexing if requirements demand.

      if (options.minCapacity !== undefined) {
        q = query(q, where('capacity', '>=', options.minCapacity));
      }

      if (options.lastDoc) {
        q = query(q, startAfter(options.lastDoc));
      }

      const querySnapshot = await getDocs(q);
      let venues = querySnapshot.docs.map(doc => ({
        venueId: doc.id,
        ...doc.data(),
      } as Venue));

      // In-memory filter for multiple equipment/features if needed
      if (options.requiredEquipment && options.requiredEquipment.length > 0) {
        venues = venues.filter(v =>
          options.requiredEquipment!.every(req => (v.equipment || []).includes(req))
        );
      }

      if (options.requiredFeatures && options.requiredFeatures.length > 0) {
        venues = venues.filter(v =>
          options.requiredFeatures!.every(req => (v.features || []).includes(req))
        );
      }

      const lastDocument = querySnapshot.docs.length > 0
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;

      return { venues, lastDoc: lastDocument };
    });
  }
}

export const venueRepository = new VenueRepository();
