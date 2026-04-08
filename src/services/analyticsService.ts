import { eventRepository } from '../repositories/eventRepository';
import { attendanceRepository } from '../repositories/attendanceRepository';
import { feedbackRepository } from '../repositories/feedbackRepository';
import { rsvpRepository } from '../repositories/rsvpRepository';
import { EventAnalytics } from '../types';

/**
 * Service for aggregating and calculating analytics data
 */
export class AnalyticsService {
    /**
     * Get analytics for a specific event
     * @param eventId - The ID of the event
     * @returns Promise<EventAnalytics> The aggregated analytics for the event
     */
    async getEventAnalytics(eventId: string): Promise<EventAnalytics> {
        try {
            // 1. Fetch event, RSVPs, attendance, and feedback
            const event = await eventRepository.getEventById(eventId);
            if (!event) {
                throw new Error('Event not found');
            }

            const rsvps = await rsvpRepository.getRSVPsByEvent(eventId);
            const attendance = await attendanceRepository.getAttendanceByEvent(eventId);
            const feedbackForm = await feedbackRepository.getFormByEvent(eventId);

            let averageRating: number | undefined;
            const feedbackSummary: Record<string, number> = {};

            if (feedbackForm) {
                const responses = await feedbackRepository.getResponsesByForm(feedbackForm.formId);
                if (responses.length > 0) {
                    const totalRating = responses.reduce((sum, res) => sum + res.overallRating, 0);
                    averageRating = totalRating / responses.length;

                    // Simple summary of ratings (e.g., { "1": 0, "2": 2, "3": 5, "4": 10, "5": 20 })
                    responses.forEach(res => {
                        const ratingStr = res.overallRating.toString();
                        feedbackSummary[ratingStr] = (feedbackSummary[ratingStr] || 0) + 1;
                    });
                }
            }

            // 2. Calculate rates
            const rsvpCount = rsvps.length;
            const attendanceCount = attendance.length;
            const attendanceRate = rsvpCount > 0 ? (attendanceCount / rsvpCount) * 100 : 0;
            const noShowRate = 100 - attendanceRate;

            return {
                eventId,
                rsvpCount,
                attendanceCount,
                attendanceRate,
                noShowRate,
                averageRating,
                feedbackSummary,
            };
        } catch (error) {
            console.error('Error calculating event analytics:', error);
            throw new Error('Failed to get event analytics');
        }
    }

    /**
     * Get aggregated analytics for a specific club
     * @param clubId - The ID of the club
     * @returns Promise aggregated club analytics
     */
    async getClubAnalytics(clubId: string) {
        try {
            const events = await eventRepository.getEventsByClub(clubId);

            const eventAnalyticsPromises = events.map(event => this.getEventAnalytics(event.eventId));
            const allEventAnalytics = await Promise.all(eventAnalyticsPromises);

            // Aggregate data
            const totalEvents = events.length;
            const totalAttendance = allEventAnalytics.reduce((sum, analytics) => sum + analytics.attendanceCount, 0);
            const totalRSVPs = allEventAnalytics.reduce((sum, analytics) => sum + analytics.rsvpCount, 0);
            const averageAttendanceRate = allEventAnalytics.length > 0
                ? allEventAnalytics.reduce((sum, analytics) => sum + analytics.attendanceRate, 0) / allEventAnalytics.length
                : 0;

            const ratingsWithData = allEventAnalytics.filter(a => a.averageRating !== undefined);
            const averageClubRating = ratingsWithData.length > 0
                ? ratingsWithData.reduce((sum, a) => sum + (a.averageRating || 0), 0) / ratingsWithData.length
                : undefined;

            return {
                clubId,
                totalEvents,
                totalAttendance,
                totalRSVPs,
                averageAttendanceRate,
                averageClubRating,
                eventBreakdown: allEventAnalytics,
            };
        } catch (error) {
            console.error('Error calculating club analytics:', error);
            throw new Error('Failed to get club analytics');
        }
    }
}

export const analyticsService = new AnalyticsService();
