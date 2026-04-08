import { userRepository } from '../repositories/userRepository';
import { NotificationPreferences, NotificationType } from '../types';

/**
 * Service for managing user notification preferences
 * Validates: Requirements 29.5
 */
export class NotificationPreferenceManager {
    /**
     * Update notification preferences for a user
     */
    async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const updatedPreferences: NotificationPreferences = {
            ...user.preferences,
            ...preferences,
        };

        await userRepository.updateUser(userId, {
            preferences: updatedPreferences,
        });
    }

    /**
     * Check if a user should receive a specific type of notification
     */
    async shouldNotify(userId: string, type: NotificationType): Promise<boolean> {
        const user = await userRepository.getUserById(userId);
        if (!user) return false;

        const prefs = user.preferences;

        switch (type) {
            case NotificationType.EVENT_CREATED:
            case NotificationType.EVENT_UPDATED:
            case NotificationType.EVENT_CANCELLED:
                return prefs.emailNotifications || prefs.pushNotifications;

            case NotificationType.EVENT_REMINDER_24H:
            case NotificationType.EVENT_REMINDER_1H:
                return prefs.eventReminders;

            case NotificationType.ANNOUNCEMENT:
                return prefs.clubAnnouncements;

            default:
                return true; // Default to true for critical system notifications (membership, waitlist)
        }
    }
}

export const notificationPreferenceManager = new NotificationPreferenceManager();
