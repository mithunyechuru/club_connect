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
    limit,
    orderBy,
    startAfter,
    DocumentSnapshot,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { dbConnectionManager } from '../services/databaseConnectionManager';
import { Notification } from '../types';

/**
 * Repository for managing Notification entities in Firestore
 * Provides CRUD operations and batch updates
 */
export class NotificationRepository {
    private readonly collectionName = 'notifications';

    /**
     * Get a notification by ID
     * @param notificationId - Unique ID of the notification
     * @returns Promise<Notification | null>
     */
    async getNotificationById(notificationId: string): Promise<Notification | null> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const notificationDoc = await getDoc(doc(connection, this.collectionName, notificationId));

            if (!notificationDoc.exists()) {
                return null;
            }

            return {
                notificationId: notificationDoc.id,
                ...notificationDoc.data(),
            } as Notification;
        });
    }

    /**
     * Get notifications for a user with pagination
     * @param userId - ID of the user
     * @param pageSize - Number of notifications per page
     * @param lastDoc - For pagination
     * @returns Promise with notifications array and last document
     */
    async getNotificationsByUser(
        userId: string,
        pageSize: number = 20,
        lastDoc?: DocumentSnapshot
    ): Promise<{ notifications: Notification[]; lastDoc: DocumentSnapshot | null }> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            let q = query(
                collection(connection, this.collectionName),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(pageSize)
            );

            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const querySnapshot = await getDocs(q);
            const notifications = querySnapshot.docs.map(doc => ({
                notificationId: doc.id,
                ...doc.data(),
            } as Notification));

            const lastDocument = querySnapshot.docs.length > 0
                ? querySnapshot.docs[querySnapshot.docs.length - 1]
                : null;

            return { notifications, lastDoc: lastDocument };
        });
    }

    /**
     * Create a new notification record
     * @param notificationData - Data for the new notification
     * @returns Promise<Notification>
     */
    async createNotification(notificationData: Omit<Notification, 'notificationId'>): Promise<Notification> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const docRef = await addDoc(collection(connection, this.collectionName), {
                ...notificationData,
                createdAt: notificationData.createdAt || Timestamp.now(),
                isRead: notificationData.isRead ?? false,
                retryCount: notificationData.retryCount ?? 0,
            });

            return {
                notificationId: docRef.id,
                ...notificationData,
            } as Notification;
        });
    }

    /**
     * Mark a notification as read
     * @param notificationId - ID of the notification
     */
    async markAsRead(notificationId: string): Promise<void> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const notificationRef = doc(connection, this.collectionName, notificationId);
            await updateDoc(notificationRef, { isRead: true });
        });
    }

    /**
     * Mark all notifications as read for a user
     * @param userId - ID of the user
     */
    async markAllAsRead(userId: string): Promise<void> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const q = query(
                collection(connection, this.collectionName),
                where('userId', '==', userId),
                where('isRead', '==', false)
            );

            const unreadDocs = await getDocs(q);
            if (unreadDocs.empty) return;

            const batch = writeBatch(connection);
            unreadDocs.docs.forEach((d) => {
                batch.update(d.ref, { isRead: true });
            });

            await batch.commit();
        });
    }

    /**
     * Delete a notification
     * @param notificationId - ID of the notification
     */
    async deleteNotification(notificationId: string): Promise<void> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            await deleteDoc(doc(connection, this.collectionName, notificationId));
        });
    }
}

export const notificationRepository = new NotificationRepository();
