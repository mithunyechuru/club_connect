import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Certificate } from '../types';

export class CertificateRepository {
  private readonly collectionName = 'certificates';

  async getCertificatesByStudent(userId: string): Promise<Certificate[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('studentId', '==', userId),
        orderBy('generatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        certificateId: doc.id,
        ...doc.data(),
      } as Certificate));
    } catch (error) {
      console.error('Error getting user certificates:', error);
      throw error;
    }
  }

  async saveCertificate(certificateData: Omit<Certificate, 'certificateId'>): Promise<Certificate> {
    try {
      // Check if certificate for this event and student already exists
      const existingQuery = query(
        collection(db, this.collectionName),
        where('studentId', '==', certificateData.studentId),
        where('eventId', '==', certificateData.eventId)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        return { certificateId: existingSnapshot.docs[0].id, ...existingSnapshot.docs[0].data() } as Certificate;
      }

      const docRef = await addDoc(collection(db, this.collectionName), certificateData);
      return { certificateId: docRef.id, ...certificateData } as Certificate;
    } catch (error) {
      console.error('Error creating certificate:', error);
      throw error;
    }
  }
}

export const certificateRepository = new CertificateRepository();
