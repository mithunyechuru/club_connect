import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Badge, UserBadge } from '../types';

export class BadgeRepository {
  private readonly badgesCollection = 'badges';
  private readonly userBadgesCollection = 'userBadges';

  async getAllAvailableBadges(): Promise<Badge[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.badgesCollection));
      return querySnapshot.docs.map(doc => ({
        badgeId: doc.id,
        ...doc.data(),
      } as Badge));
    } catch (error) {
      console.error('Error getting available badges:', error);
      throw error;
    }
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const q = query(
        collection(db, this.userBadgesCollection),
        where('userId', '==', userId),
        orderBy('earnedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        userBadgeId: doc.id,
        ...doc.data(),
      } as UserBadge));
    } catch (error) {
      console.error('Error getting user badges:', error);
      throw error;
    }
  }

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge> {
    try {
      // Check if already awarded
      const existingQuery = query(
        collection(db, this.userBadgesCollection),
        where('userId', '==', userId),
        where('badgeId', '==', badgeId)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        return { userBadgeId: existingSnapshot.docs[0].id, ...existingSnapshot.docs[0].data() } as UserBadge;
      }

      const userBadgeData: Omit<UserBadge, 'userBadgeId'> = {
        userId,
        badgeId,
        earnedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, this.userBadgesCollection), userBadgeData);
      return { userBadgeId: docRef.id, ...userBadgeData } as UserBadge;
    } catch (error) {
      console.error('Error awarding badge:', error);
      throw error;
    }
  }

  async getBadgeById(badgeId: string): Promise<Badge | null> {
    try {
      const docSnap = await getDoc(doc(db, this.badgesCollection, badgeId));
      if (!docSnap.exists()) return null;
      return { badgeId: docSnap.id, ...docSnap.data() } as Badge;
    } catch (error) {
      console.error('Error getting badge by ID:', error);
      throw error;
    }
  }
}

export const badgeRepository = new BadgeRepository();
