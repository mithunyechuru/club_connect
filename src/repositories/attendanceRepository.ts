import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    Timestamp,
    orderBy,
} from 'firebase/firestore';
import { dbConnectionManager } from '../services/databaseConnectionManager';
import { AttendanceRecord } from '../types';

/**
 * Repository for managing Attendance records in Firestore
 * Validates: Requirements 14.1
 */
export class AttendanceRepository {
    private readonly collectionName = 'attendance';

    /**
     * Log attendance for a student at an event
     */
    async logAttendance(attendanceData: Omit<AttendanceRecord, 'attendanceId'>): Promise<AttendanceRecord> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const docRef = await addDoc(collection(connection, this.collectionName), {
                ...attendanceData,
                timestamp: attendanceData.timestamp || Timestamp.now(),
            });

            return { attendanceId: docRef.id, ...attendanceData } as AttendanceRecord;
        });
    }

    /**
     * Get attendance records for an event
     */
    async getAttendanceByEvent(eventId: string): Promise<AttendanceRecord[]> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const q = query(
                collection(connection, this.collectionName),
                where('eventId', '==', eventId),
                orderBy('timestamp', 'desc')
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                attendanceId: doc.id,
                ...doc.data(),
            } as AttendanceRecord));
        });
    }

    /**
     * Check if a student has already been marked as present
     */
    async isPresent(eventId: string, studentId: string): Promise<boolean> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const q = query(
                collection(connection, this.collectionName),
                where('eventId', '==', eventId),
                where('studentId', '==', studentId)
            );

            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        });
    }

    /**
     * Get attendance records for a student
     */
    async getAttendanceByUser(studentId: string): Promise<AttendanceRecord[]> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const q = query(
                collection(connection, this.collectionName),
                where('studentId', '==', studentId),
                orderBy('timestamp', 'desc')
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                attendanceId: doc.id,
                ...doc.data(),
            } as AttendanceRecord));
        });
    }
}

export const attendanceRepository = new AttendanceRepository();
