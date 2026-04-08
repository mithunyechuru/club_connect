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
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Engagement } from '../types';

export class EngagementRepository {
  private readonly collectionName = 'engagements';

  async getEngagementById(engagementId: string): Promise<Engagement | null> {
    try {
      const docSnap = await getDoc(doc(db, this.collectionName, engagementId));
      if (!docSnap.exists()) return null;
      return { engagementId: docSnap.id, ...docSnap.data() } as Engagement;
    } catch (error) {
      console.error('Error getting engagement:', error);
      throw error;
    }
  }

  async getEngagementsByClub(clubId: string): Promise<Engagement[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('clubId', '==', clubId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        engagementId: doc.id,
        ...doc.data(),
      } as Engagement));
    } catch (error) {
      console.error('Error getting engagements by club:', error);
      throw error;
    }
  }

  async createEngagement(engagementData: Omit<Engagement, 'engagementId'>): Promise<Engagement> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...engagementData,
        createdAt: engagementData.createdAt || Timestamp.now(),
      });
      return { engagementId: docRef.id, ...engagementData } as Engagement;
    } catch (error) {
      console.error('Error creating engagement:', error);
      throw error;
    }
  }

  async updateEngagement(engagementId: string, updates: Partial<Engagement>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, engagementId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating engagement:', error);
      throw error;
    }
  }

  async deleteEngagement(engagementId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, engagementId));
    } catch (error) {
      console.error('Error deleting engagement:', error);
      throw error;
    }
  }

  async getAllEngagements(limitCount: number = 50): Promise<Engagement[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        engagementId: doc.id,
        ...doc.data(),
      } as Engagement));
    } catch (error) {
      console.error('Error getting all engagements:', error);
      throw error;
    }
  }
}

export const engagementRepository = new EngagementRepository();
