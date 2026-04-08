import { ref, set, serverTimestamp } from 'firebase/database';
import { Timestamp } from 'firebase/firestore';
import { realtimeDb } from './firebase';
import { notificationRepository } from '../repositories/notificationRepository';
import { Notification, NotificationType } from '../types';

/**
 * Service for delivering and managing notifications
 * Validates: Requirements 10.1, 10.4, 29.1, 29.2, 29.3, 29.4
 */
export class NotificationService {
    private readonly maxRetries = 3;

    /**
     * Create and deliver a notification to a user
     * Implements multi-channel delivery (Firestore + RTDB)
     * @param payload - Notification details
     */
    async createNotification(payload: {
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        data?: Record<string, string>;
    }): Promise<Notification> {
        const notificationData: Omit<Notification, 'notificationId'> = {
            userId: payload.userId,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            data: payload.data || {},
            isRead: false,
            createdAt: Timestamp.now(),
            retryCount: 0,
        };

        // 1. Persist to Firestore
        const notification = await notificationRepository.createNotification(notificationData);

        // 2. Deliver via Realtime Database for instant UI updates
        await this.deliverToRealtime(notification);

        return notification;
    }

    /**
     * Deliver notification to Realtime Database
     * Implements retry logic (Requirement 29.2)
     */
    private async deliverToRealtime(notification: Notification): Promise<void> {
        const userNotificationRef = ref(realtimeDb, `notifications/${notification.userId}/${notification.notificationId}`);

        let attempt = 0;
        while (attempt < this.maxRetries) {
            try {
                await set(userNotificationRef, {
                    ...notification,
                    createdAt: serverTimestamp(), // Use RTDB server timestamp
                });

                // Update Firestore with delivery time
                await notificationRepository.createNotification({
                    ...notification,
                    deliveredAt: Timestamp.now(),
                } as any); // Use create/update logic as needed

                return;
            } catch (error) {
                attempt++;
                if (attempt === this.maxRetries) {
                    console.error(`Failed to deliver notification ${notification.notificationId} after ${this.maxRetries} attempts`);
                    // Note: In a production system, this could trigger a dead-letter queue or background worker
                } else {
                    // Wait before retry (exponential backoff could be added)
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
    }

    /**
     * Mark a notification as read and update RTDB
     */
    async markAsRead(userId: string, notificationId: string): Promise<void> {
        await notificationRepository.markAsRead(notificationId);

        // Remove or update in RTDB
        const userNotificationRef = ref(realtimeDb, `notifications/${userId}/${notificationId}`);
        await set(userNotificationRef, null); // Clear from real-time once read/processed
    }

    /**
     * Mark all for a user as read
     */
    async markAllAsRead(userId: string): Promise<void> {
        await notificationRepository.markAllAsRead(userId);

        // Clear user's RTDB branch
        const userNotificationsRef = ref(realtimeDb, `notifications/${userId}`);
        await set(userNotificationsRef, null);
    }

    /**
     * Get notification count for grouping (Requirement 29.4)
     * If unread count > 50, UI should group them
     */
    async getUnreadCount(userId: string): Promise<number> {
        const { notifications } = await notificationRepository.getNotificationsByUser(userId, 100);
        return notifications.filter(n => !n.isRead).length;
    }
}

export const notificationService = new NotificationService();
