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
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { MembershipRequest, RequestStatus } from '../types';

/**
 * Repository for managing MembershipRequest entities in Firestore
 * Provides CRUD operations and queries for membership requests
 */
export class MembershipRequestRepository {
  private readonly collectionName = 'membershipRequests';

  /**
   * Subscribe to membership requests for a specific student (real-time)
   */
  subscribeToRequestsByStudent(studentId: string, callback: (requests: MembershipRequest[]) => void) {
    const q = query(
      collection(db, this.collectionName),
      where('studentId', '==', studentId),
      orderBy('requestedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        requestId: doc.id,
        ...doc.data(),
      } as MembershipRequest));
      callback(requests);
    });
  }

  /**
   * Subscribe to pending membership requests for a specific club (real-time)
   */
  subscribeToPendingRequestsByClub(clubId: string, callback: (requests: MembershipRequest[]) => void) {
    const q = query(
      collection(db, this.collectionName),
      where('clubId', '==', clubId),
      where('status', '==', RequestStatus.PENDING),
      orderBy('requestedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        requestId: doc.id,
        ...doc.data(),
      } as MembershipRequest));
      callback(requests);
    });
  }

  /**
   * Get a membership request by its ID
   * @param requestId - The unique identifier of the request
   * @returns Promise<MembershipRequest | null> The request if found, null otherwise
   */
  async getRequestById(requestId: string): Promise<MembershipRequest | null> {
    try {
      const requestDoc = await getDoc(doc(db, this.collectionName, requestId));
      
      if (!requestDoc.exists()) {
        return null;
      }

      return {
        requestId: requestDoc.id,
        ...requestDoc.data(),
      } as MembershipRequest;
    } catch (error) {
      console.error('Error getting membership request by ID:', error);
      throw new Error(`Failed to get membership request with ID ${requestId}`);
    }
  }

  /**
   * Get all pending membership requests for a club
   * @param clubId - The ID of the club
   * @returns Promise<MembershipRequest[]> Array of pending requests
   */
  async getPendingRequestsByClub(clubId: string): Promise<MembershipRequest[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('clubId', '==', clubId),
        where('status', '==', RequestStatus.PENDING),
        orderBy('requestedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        requestId: doc.id,
        ...doc.data(),
      } as MembershipRequest));
    } catch (error) {
      console.error('Error getting pending requests by club:', error);
      throw new Error(`Failed to get pending requests for club ${clubId}`);
    }
  }

  /**
   * Get all membership requests by a student
   * @param studentId - The ID of the student
   * @returns Promise<MembershipRequest[]> Array of requests
   */
  async getRequestsByStudent(studentId: string): Promise<MembershipRequest[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('studentId', '==', studentId),
        orderBy('requestedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        requestId: doc.id,
        ...doc.data(),
      } as MembershipRequest));
    } catch (error) {
      console.error('Error getting requests by student:', error);
      throw new Error(`Failed to get requests for student ${studentId}`);
    }
  }

  /**
   * Check if a student has a pending request for a club
   * @param studentId - The ID of the student
   * @param clubId - The ID of the club
   * @returns Promise<MembershipRequest | null> The pending request if exists
   */
  async getPendingRequestByStudentAndClub(
    studentId: string,
    clubId: string
  ): Promise<MembershipRequest | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('studentId', '==', studentId),
        where('clubId', '==', clubId),
        where('status', '==', RequestStatus.PENDING)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        requestId: doc.id,
        ...doc.data(),
      } as MembershipRequest;
    } catch (error) {
      console.error('Error checking pending request:', error);
      throw new Error(`Failed to check pending request for student ${studentId} and club ${clubId}`);
    }
  }

  /**
   * Create a new membership request
   * @param requestData - The request data (without requestId)
   * @returns Promise<MembershipRequest> The created request with generated ID
   */
  async createRequest(requestData: Omit<MembershipRequest, 'requestId'>): Promise<MembershipRequest> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...requestData,
        requestedAt: requestData.requestedAt || Timestamp.now(),
      });

      const createdRequest: MembershipRequest = {
        requestId: docRef.id,
        ...requestData,
      };

      return createdRequest;
    } catch (error) {
      console.error('Error creating membership request:', error);
      throw new Error('Failed to create membership request');
    }
  }

  /**
   * Update an existing membership request
   * @param requestId - The ID of the request to update
   * @param updates - Partial request data to update
   * @returns Promise<void>
   */
  async updateRequest(
    requestId: string,
    updates: Partial<Omit<MembershipRequest, 'requestId'>>
  ): Promise<void> {
    try {
      const requestRef = doc(db, this.collectionName, requestId);
      await updateDoc(requestRef, updates);
    } catch (error) {
      console.error('Error updating membership request:', error);
      throw new Error(`Failed to update membership request with ID ${requestId}`);
    }
  }

  /**
   * Delete a membership request
   * @param requestId - The ID of the request to delete
   * @returns Promise<void>
   */
  async deleteRequest(requestId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, requestId));
    } catch (error) {
      console.error('Error deleting membership request:', error);
      throw new Error(`Failed to delete membership request with ID ${requestId}`);
    }
  }

  /**
   * Get all requests for a club (all statuses)
   * @param clubId - The ID of the club
   * @returns Promise<MembershipRequest[]> Array of all requests
   */
  async getAllRequestsByClub(clubId: string): Promise<MembershipRequest[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('clubId', '==', clubId),
        orderBy('requestedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        requestId: doc.id,
        ...doc.data(),
      } as MembershipRequest));
    } catch (error) {
      console.error('Error getting all requests by club:', error);
      throw new Error(`Failed to get all requests for club ${clubId}`);
    }
  }
}

export const membershipRequestRepository = new MembershipRequestRepository();
