import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { AuditLog } from '../types';

/**
 * Repository for managing Audit Logs in Firestore
 */
export class AuditRepository {
    private readonly collectionName = 'auditLogs';

    /**
     * Create a new audit log entry
     * @param logData - The log data (without logId)
     * @returns Promise<AuditLog>
     */
    async logAction(logData: Omit<AuditLog, 'logId'>): Promise<AuditLog> {
        try {
            const docRef = await addDoc(collection(db, this.collectionName), {
                ...logData,
                timestamp: logData.timestamp || Timestamp.now(),
            });

            return {
                logId: docRef.id,
                ...logData,
            } as AuditLog;
        } catch (error) {
            console.error('Error creating audit log:', error);
            throw new Error('Failed to create audit log');
        }
    }

    /**
     * Get audit logs for a specific resource
     * @param resourceType - The type of resource (CLUB, EVENT, etc.)
     * @param resourceId - The ID of the resource
     * @returns Promise<AuditLog[]>
     */
    async getLogsByResource(
        resourceType: 'CLUB' | 'EVENT' | 'USER' | 'SYSTEM',
        resourceId: string
    ): Promise<AuditLog[]> {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('resourceType', '==', resourceType),
                where('resourceId', '==', resourceId),
                orderBy('timestamp', 'desc')
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                logId: doc.id,
                ...doc.data(),
            } as AuditLog));
        } catch (error) {
            console.error('Error getting resource logs:', error);
            throw new Error(`Failed to get logs for ${resourceType} ${resourceId}`);
        }
    }

    /**
     * Get recent system logs
     * @param limitCount - Number of logs to fetch
     * @returns Promise<AuditLog[]>
     */
    async getRecentLogs(limitCount: number = 50): Promise<AuditLog[]> {
        try {
            const q = query(
                collection(db, this.collectionName),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                logId: doc.id,
                ...doc.data(),
            } as AuditLog));
        } catch (error) {
            console.error('Error getting recent logs:', error);
            throw new Error('Failed to get recent logs');
        }
    }
}

export const auditRepository = new AuditRepository();
