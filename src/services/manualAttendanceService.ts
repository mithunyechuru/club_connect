import { Timestamp } from 'firebase/firestore';
import { attendanceRepository } from '../repositories/attendanceRepository';

/**
 * Service for manual attendance management by officers
 * Validates: Requirements 14.4
 */
export class ManualAttendanceService {
    /**
     * Manually mark a student as present
     */
    async markPresent(eventId: string, studentId: string, officerId: string): Promise<void> {
        // Check if already present
        const alreadyPresent = await attendanceRepository.isPresent(eventId, studentId);
        if (alreadyPresent) {
            return; // Already marked
        }

        // Log attendance with officer reference
        await attendanceRepository.logAttendance({
            eventId,
            studentId,
            timestamp: Timestamp.now(),
            method: 'MANUAL',
            recordedBy: officerId,
        });
    }

    /**
     * Bulk mark attendance
     */
    async bulkMarkPresent(eventId: string, studentIds: string[], officerId: string): Promise<void> {
        const promises = studentIds.map(sid => this.markPresent(eventId, sid, officerId));
        await Promise.all(promises);
    }
}

export const manualAttendanceService = new ManualAttendanceService();
