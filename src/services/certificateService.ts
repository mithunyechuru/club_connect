import { jsPDF } from 'jspdf';
import { Certificate } from '../types';
import { certificateRepository } from '../repositories/certificateRepository';
import { userRepository } from '../repositories/userRepository';
import { eventRepository } from '../repositories/eventRepository';
import { Timestamp } from 'firebase/firestore';

/**
 * Service for generating event participation certificates
 */
export class CertificateService {
    /**
     * Generate a certificate for a student who attended an event
     * @param studentId - The ID of the student
     * @param eventId - The ID of the event
     * @returns Promise<Certificate> The generated certificate metadata
     */
    async generateCertificate(studentId: string, eventId: string): Promise<Certificate> {
        try {
            // 1. Fetch student and event details
            const student = await userRepository.getUserById(studentId);
            const event = await eventRepository.getEventById(eventId);

            if (!student || !event) {
                throw new Error('Student or Event not found');
            }

            // 2. Generate PDF using jsPDF
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            });

            const studentName = `${student.profile.firstName} ${student.profile.lastName}`;
            const eventName = event.name;
            const eventDate = event.startTime.toDate().toLocaleDateString();

            // --- Draw Certificate Content ---
            // Border
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(2);
            doc.rect(10, 10, 277, 190);

            // Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(30);
            doc.text('CERTIFICATE OF PARTICIPATION', 148.5, 40, { align: 'center' });

            doc.setFontSize(15);
            doc.setFont('helvetica', 'normal');
            doc.text('This is to certify that', 148.5, 60, { align: 'center' });

            // Student Name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(25);
            doc.text(studentName, 148.5, 80, { align: 'center' });

            doc.setFontSize(15);
            doc.setFont('helvetica', 'normal');
            doc.text('has successfully participated in the event', 148.5, 100, { align: 'center' });

            // Event Name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text(eventName, 148.5, 120, { align: 'center' });

            // Date
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Held on ${eventDate}`, 148.5, 140, { align: 'center' });

            // Signature (Placeholder)
            doc.text('_________________________', 148.5, 170, { align: 'center' });
            doc.text('Club Officer Signature', 148.5, 180, { align: 'center' });

            // 3. Save PDF as Blob or DataURL (In a real app, upload to Firebase Storage)
            // For this implementation, we'll use a placeholder URL and return metadata
            const pdfDataUrl = doc.output('datauristring');

            // 4. Save metadata to Repository
            const certMetadata: Omit<Certificate, 'certificateId'> = {
                studentId,
                eventId,
                studentName,
                eventName,
                eventDate: event.startTime,
                organizerSignature: 'Digital Signature',
                pdfUrl: pdfDataUrl, // In production, this would be a link to Firebase Storage
                generatedAt: Timestamp.now(),
            };

            return await certificateRepository.saveCertificate(certMetadata);
        } catch (error) {
            console.error('Error generating certificate:', error);
            throw new Error('Failed to generate certificate');
        }
    }

    /**
     * Get all certificates for a student
     * @param studentId - The ID of the student
     * @returns Promise<Certificate[]>
     */
    async getUserCertificates(studentId: string): Promise<Certificate[]> {
        return certificateRepository.getCertificatesByStudent(studentId);
    }
}

export const certificateService = new CertificateService();
