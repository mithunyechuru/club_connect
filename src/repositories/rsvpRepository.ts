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
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { RSVP, RSVPStatus } from '../types';

/**
 * Repository for managing RSVP entities in Firestore
 * Provides CRUD operations, event/student queries, and waitlist management
 */
export class RSVPRepository {
  private readonly collectionName = 'rsvps';

  /**
   * Get an RSVP by its ID
   * @param rsvpId - The unique identifier of the RSVP
   * @returns Promise<RSVP | null> The RSVP if found, null otherwise
   */
  async getRSVPById(rsvpId: string): Promise<RSVP | null> {
    try {
      const rsvpDoc = await getDoc(doc(db, this.collectionName, rsvpId));
      
      if (!rsvpDoc.exists()) {
        return null;
      }

      return {
        rsvpId: rsvpDoc.id,
        ...rsvpDoc.data(),
      } as RSVP;
    } catch (error) {
      console.error('Error getting RSVP by ID:', error);
      throw new Error(`Failed to get RSVP with ID ${rsvpId}`);
    }
  }

  /**
   * Get all RSVPs for a specific event
   * @param eventId - The ID of the event
   * @param status - Optional status filter
   * @returns Promise<RSVP[]> Array of RSVPs for the event
   */
  async getRSVPsByEvent(eventId: string, status?: RSVPStatus): Promise<RSVP[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('eventId', '==', eventId)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const querySnapshot = await getDocs(q);
      
      const rsvps = querySnapshot.docs.map(doc => ({
        rsvpId: doc.id,
        ...doc.data(),
      } as RSVP));

      // Sort in-memory to avoid index requirement
      return rsvps.sort((a, b) => {
        const aT = (a.registeredAt as any)?.toMillis?.() ?? 0;
        const bT = (b.registeredAt as any)?.toMillis?.() ?? 0;
        return aT - bT;
      });
    } catch (error) {
      console.error('Error getting RSVPs by event:', error);
      throw new Error(`Failed to get RSVPs for event ${eventId}`);
    }
  }

  /**
   * Get all RSVPs for a specific student
   * @param studentId - The ID of the student
   * @param status - Optional status filter
   * @returns Promise<RSVP[]> Array of RSVPs for the student
   */
  async getRSVPsByStudent(studentId: string, status?: RSVPStatus): Promise<RSVP[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('studentId', '==', studentId)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const querySnapshot = await getDocs(q);
      
      const rsvps = querySnapshot.docs.map(doc => ({
        rsvpId: doc.id,
        ...doc.data(),
      } as RSVP));

      // Sort in-memory to avoid index requirement
      return rsvps.sort((a, b) => {
        const aT = (a.registeredAt as any)?.toMillis?.() ?? 0;
        const bT = (b.registeredAt as any)?.toMillis?.() ?? 0;
        return bT - aT; // desc
      });
    } catch (error) {
      console.error('Error getting RSVPs by student:', error);
      throw new Error(`Failed to get RSVPs for student ${studentId}`);
    }
  }

  /**
   * Get waitlisted RSVPs for an event, ordered by waitlist position
   * @param eventId - The ID of the event
   * @returns Promise<RSVP[]> Array of waitlisted RSVPs ordered by position
   */
  async getWaitlistByEvent(eventId: string): Promise<RSVP[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('eventId', '==', eventId),
        where('status', '==', RSVPStatus.WAITLISTED),
        where('status', '==', RSVPStatus.WAITLISTED)
      );
      
      const querySnapshot = await getDocs(q);
      
      const rsvps = querySnapshot.docs.map(doc => ({
        rsvpId: doc.id,
        ...doc.data(),
      } as RSVP));

      return rsvps.sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));
    } catch (error) {
      console.error('Error getting waitlist by event:', error);
      throw new Error(`Failed to get waitlist for event ${eventId}`);
    }
  }

  /**
   * Get the first waitlisted RSVP for an event (lowest position number)
   * @param eventId - The ID of the event
   * @returns Promise<RSVP | null> The first waitlisted RSVP or null if waitlist is empty
   */
  async getFirstWaitlistedRSVP(eventId: string): Promise<RSVP | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('eventId', '==', eventId),
        where('status', '==', RSVPStatus.WAITLISTED)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const rsvps = querySnapshot.docs.map(doc => ({
        rsvpId: doc.id,
        ...doc.data(),
      } as RSVP));

      return rsvps.sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0))[0];
    } catch (error) {
      console.error('Error getting first waitlisted RSVP:', error);
      throw new Error(`Failed to get first waitlisted RSVP for event ${eventId}`);
    }
  }

  /**
   * Create a new RSVP
   * @param rsvpData - The RSVP data (without rsvpId)
   * @returns Promise<RSVP> The created RSVP with generated ID
   */
  async createRSVP(rsvpData: Omit<RSVP, 'rsvpId'>): Promise<RSVP> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...rsvpData,
        registeredAt: rsvpData.registeredAt || Timestamp.now(),
      });

      const createdRSVP: RSVP = {
        rsvpId: docRef.id,
        ...rsvpData,
      };

      return createdRSVP;
    } catch (error) {
      console.error('Error creating RSVP:', error);
      throw new Error('Failed to create RSVP');
    }
  }

  /**
   * Update an existing RSVP
   * @param rsvpId - The ID of the RSVP to update
   * @param updates - Partial RSVP data to update
   * @returns Promise<void>
   */
  async updateRSVP(rsvpId: string, updates: Partial<Omit<RSVP, 'rsvpId'>>): Promise<void> {
    try {
      const rsvpRef = doc(db, this.collectionName, rsvpId);
      await updateDoc(rsvpRef, updates);
    } catch (error) {
      console.error('Error updating RSVP:', error);
      throw new Error(`Failed to update RSVP with ID ${rsvpId}`);
    }
  }

  /**
   * Delete an RSVP
   * @param rsvpId - The ID of the RSVP to delete
   * @returns Promise<void>
   */
  async deleteRSVP(rsvpId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, rsvpId));
    } catch (error) {
      console.error('Error deleting RSVP:', error);
      throw new Error(`Failed to delete RSVP with ID ${rsvpId}`);
    }
  }

  /**
   * Get confirmed RSVPs for an event
   * @param eventId - The ID of the event
   * @returns Promise<RSVP[]> Array of confirmed RSVPs
   */
  async getConfirmedRSVPs(eventId: string): Promise<RSVP[]> {
    return this.getRSVPsByEvent(eventId, RSVPStatus.CONFIRMED);
  }

  /**
   * Get an RSVP for a specific student and event
   * @param studentId - The ID of the student
   * @param eventId - The ID of the event
   * @returns Promise<RSVP | null> The RSVP if found, null otherwise
   */
  async getRSVPByStudentAndEvent(studentId: string, eventId: string): Promise<RSVP | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('studentId', '==', studentId),
        where('eventId', '==', eventId),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const rsvpDoc = querySnapshot.docs[0];
      return {
        rsvpId: rsvpDoc.id,
        ...rsvpDoc.data(),
      } as RSVP;
    } catch (error) {
      console.error('Error getting RSVP by student and event:', error);
      throw new Error(`Failed to get RSVP for student ${studentId} and event ${eventId}`);
    }
  }

  /**
   * Count RSVPs for an event by status
   * @param eventId - The ID of the event
   * @param status - The RSVP status to count
   * @returns Promise<number> The count of RSVPs with the specified status
   */
  async countRSVPsByStatus(eventId: string, status: RSVPStatus): Promise<number> {
    try {
      const rsvps = await this.getRSVPsByEvent(eventId, status);
      return rsvps.length;
    } catch (error) {
      console.error('Error counting RSVPs by status:', error);
      throw new Error(`Failed to count RSVPs for event ${eventId} with status ${status}`);
    }
  }

  /**
   * Get all RSVPs (without pagination) - use with caution
   * @returns Promise<RSVP[]> Array of all RSVPs
   */
  async getAllRSVPs(): Promise<RSVP[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      
      return querySnapshot.docs.map(doc => ({
        rsvpId: doc.id,
        ...doc.data(),
      } as RSVP));
    } catch (error) {
      console.error('Error getting all RSVPs:', error);
      throw new Error('Failed to get all RSVPs');
    }
  }
}

export const rsvpRepository = new RSVPRepository();
