import { notificationService } from './notificationService';
import { clubRepository } from '../repositories/clubRepository';
import { rsvpRepository } from '../repositories/rsvpRepository';
import { Event, NotificationType } from '../types';

/**
 * Service for sending event-specific notifications
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5, 10.6
 */
export class EventNotificationService {
    /**
     * Notify all club members about a new event
     */
    async notifyEventCreated(event: Event): Promise<void> {
        const club = await clubRepository.getClubById(event.clubId);
        if (!club) return;

        const memberIds = club.memberIds;

        // Batch processing or individual calls depending on volume
        // For MVP, individual calls with safety checks
        const notificationPromises = memberIds.map(userId =>
            notificationService.createNotification({
                userId,
                type: NotificationType.EVENT_CREATED,
                title: `New Event: ${event.name}`,
                message: `${club.name} has scheduled a new ${event.type.toLowerCase()}: ${event.name}.`,
                data: { eventId: event.eventId, clubId: event.clubId },
            })
        );

        await Promise.all(notificationPromises);
    }

    /**
     * Notify all attendees about event updates
     */
    async notifyEventUpdated(event: Event, changes: string): Promise<void> {
        const rsvps = await rsvpRepository.getRSVPsByEvent(event.eventId);
        const attendeeIds = rsvps.map(r => r.studentId);

        const notificationPromises = attendeeIds.map(userId =>
            notificationService.createNotification({
                userId,
                type: NotificationType.EVENT_UPDATED,
                title: `Update: ${event.name}`,
                message: `There are updates for ${event.name}: ${changes}`,
                data: { eventId: event.eventId },
            })
        );

        await Promise.all(notificationPromises);
    }

    /**
     * Notify all attendees about event cancellation
     */
    async notifyEventCancelled(event: Event, reason?: string): Promise<void> {
        const rsvps = await rsvpRepository.getRSVPsByEvent(event.eventId);
        const attendeeIds = rsvps.map(r => r.studentId);

        const notificationPromises = attendeeIds.map(userId =>
            notificationService.createNotification({
                userId,
                type: NotificationType.EVENT_CANCELLED,
                title: `Cancelled: ${event.name}`,
                message: `The event ${event.name} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
                data: { eventId: event.eventId },
            })
        );

        await Promise.all(notificationPromises);
    }

    /**
     * Send 24-hour reminder
     */
    async send24hReminder(event: Event): Promise<void> {
        const rsvps = await rsvpRepository.getRSVPsByEvent(event.eventId);
        const attendeeIds = rsvps.map(r => r.studentId);

        const notificationPromises = attendeeIds.map(userId =>
            notificationService.createNotification({
                userId,
                type: NotificationType.EVENT_REMINDER_24H,
                title: `Reminder: ${event.name} tomorrow`,
                message: `Don't forget! ${event.name} starts in 24 hours at ${event.startTime.toDate().toLocaleTimeString()}.`,
                data: { eventId: event.eventId },
            })
        );

        await Promise.all(notificationPromises);
    }

    /**
     * Send 1-hour reminder
     */
    async send1hReminder(event: Event): Promise<void> {
        const rsvps = await rsvpRepository.getRSVPsByEvent(event.eventId);
        const attendeeIds = rsvps.map(r => r.studentId);

        const notificationPromises = attendeeIds.map(userId =>
            notificationService.createNotification({
                userId,
                type: NotificationType.EVENT_REMINDER_1H,
                title: `Starting soon: ${event.name}`,
                message: `${event.name} begins in 1 hour. See you there!`,
                data: { eventId: event.eventId },
            })
        );

        await Promise.all(notificationPromises);
    }
}

export const eventNotificationService = new EventNotificationService();
