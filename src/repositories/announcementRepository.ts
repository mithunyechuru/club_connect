import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { ClubAnnouncement } from '../types';

export class AnnouncementRepository {
  private getAnnouncementsRef(clubId: string) {
    return collection(db, 'clubs', clubId, 'announcements');
  }

  async createAnnouncement(announcementData: Omit<ClubAnnouncement, 'announcementId'>): Promise<ClubAnnouncement> {
    try {
      const docRef = await addDoc(this.getAnnouncementsRef(announcementData.clubId), {
        ...announcementData,
        createdAt: announcementData.createdAt || Timestamp.now(),
      });
      return { announcementId: docRef.id, ...announcementData } as ClubAnnouncement;
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  }

  async getAnnouncementsByClub(clubId: string): Promise<ClubAnnouncement[]> {
    try {
      const q = query(
        this.getAnnouncementsRef(clubId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        announcementId: doc.id,
        ...doc.data(),
      } as ClubAnnouncement));
    } catch (error) {
      console.error('Error getting announcements:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for club announcements
   */
  subscribeToAnnouncements(clubId: string, callback: (announcements: ClubAnnouncement[]) => void) {
    const q = query(
      this.getAnnouncementsRef(clubId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const announcements = snapshot.docs.map(doc => ({
        announcementId: doc.id,
        ...doc.data(),
      } as ClubAnnouncement));
      callback(announcements);
    });
  }

  async deleteAnnouncement(clubId: string, announcementId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'clubs', clubId, 'announcements', announcementId));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }
}

export const announcementRepository = new AnnouncementRepository();
