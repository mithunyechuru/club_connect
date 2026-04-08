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
import { Certificate } from '../types';

/**
 * Repository for managing Certificate entities in Firestore
 */
export class CertificateRepository {
    private readonly collectionName = 'certificates';

    /**
     * Get a certificate by its ID
     * @param certificateId - The unique identifier of the certificate
     * @returns Promise<Certificate | null> The certificate if found, null otherwise
     */
    async getCertificateById(certificateId: string): Promise<Certificate | null> {
        try {
            const certDoc = await getDoc(doc(db, this.collectionName, certificateId));

            if (!certDoc.exists()) {
                return null;
            }

            return {
                certificateId: certDoc.id,
                ...certDoc.data(),
            } as Certificate;
        } catch (error) {
            console.error('Error getting certificate by ID:', error);
            throw new Error(`Failed to get certificate with ID ${certificateId}`);
        }
    }

    /**
     * Get all certificates for a specific student
     * @param studentId - The ID of the student
     * @returns Promise<Certificate[]> Array of certificates for the student
     */
    async getCertificatesByStudent(studentId: string): Promise<Certificate[]> {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('studentId', '==', studentId),
                orderBy('generatedAt', 'desc')
            );

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                certificateId: doc.id,
                ...doc.data(),
            } as Certificate));
        } catch (error) {
            console.error('Error getting certificates by student:', error);
            throw new Error(`Failed to get certificates for student ${studentId}`);
        }
    }

    /**
     * Get all certificates for a specific event
     * @param eventId - The ID of the event
     * @returns Promise<Certificate[]> Array of certificates for the event
     */
    async getCertificatesByEvent(eventId: string): Promise<Certificate[]> {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('eventId', '==', eventId)
            );

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                certificateId: doc.id,
                ...doc.data(),
            } as Certificate));
        } catch (error) {
            console.error('Error getting certificates by event:', error);
            throw new Error(`Failed to get certificates for event ${eventId}`);
        }
    }

    /**
     * Save a new certificate
     * @param certData - The certificate data (without certificateId)
     * @returns Promise<Certificate> The created certificate
     */
    async saveCertificate(certData: Omit<Certificate, 'certificateId'>): Promise<Certificate> {
        try {
            const docRef = await addDoc(collection(db, this.collectionName), {
                ...certData,
                generatedAt: certData.generatedAt || Timestamp.now(),
            });

            return {
                certificateId: docRef.id,
                ...certData,
            } as Certificate;
        } catch (error) {
            console.error('Error saving certificate:', error);
            throw new Error('Failed to save certificate');
        }
    }
}

export const certificateRepository = new CertificateRepository();
