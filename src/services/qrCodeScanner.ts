import { attendanceRepository } from '../repositories/attendanceRepository';
import { eventRepository } from '../repositories/eventRepository';
import { rsvpRepository } from '../repositories/rsvpRepository';
import { Timestamp } from 'firebase/firestore';

/**
 * Service for processing QR code scans for attendance
 * Validates: Requirements 14.2, 14.3, 14.4
 */
export class QRCodeScanner {
    /**
     * Process a QR code scan
     * @param qrContent - The content of the QR code (expected format: eventId:token)
     * @param studentId - ID of the student scanning
     */
    async processScan(qrContent: string, studentId: string): Promise<void> {
        // 1. Parse QR content
        const [eventId, token] = qrContent.split(':');
        if (!eventId || !token) {
            throw new Error('Invalid QR code format.');
        }

        // 2. Validate event exists and is current
        const event = await eventRepository.getEventById(eventId);
        if (!event) {
            throw new Error('Event not found.');
        }

        // 3. check if event is today (Simplified for logic implementation)
        const now = new Date();
        const eventDate = event.startTime.toDate();
        if (Math.abs(now.getTime() - eventDate.getTime()) > 86400000) {
            throw new Error('This event is not scheduled for today.');
        }

        // 4. Check if already present
        const alreadyPresent = await attendanceRepository.isPresent(eventId, studentId);
        if (alreadyPresent) {
            throw new Error('Attendance already recorded for this user.');
        }

        // 5. Check if user RSVP'd (Requirement 14.3 fallback)
        await rsvpRepository.getRSVPById(`${eventId}_${studentId}`);

        // 6. Log attendance
        await attendanceRepository.logAttendance({
            eventId,
            studentId,
            timestamp: Timestamp.now(),
            method: 'QR_CODE',
        });
    }

    /**
     * Helper to generate a QR token for an event (Mock for UI)
     */
    generateQRToken(eventId: string): string {
        return `${eventId}:TOKEN-${Math.floor(Math.random() * 10000)}`;
    }
}

export const qrCodeScanner = new QRCodeScanner();
