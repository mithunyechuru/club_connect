import { bookingRepository } from '../repositories/bookingRepository';
import { venueRepository } from '../repositories/venueRepository';
import { Venue, Booking } from '../types';

/**
 * Service for detecting and resolving venue booking conflicts
 */
export class ConflictDetectionService {
    /**
     * Detect conflicts for a proposed booking
     * @param venueId - The ID of the venue
     * @param startTime - Proposed start time
     * @param endTime - Proposed end time
     * @param excludeBookingId - Optional ID to exclude
     * @returns Promise<Booking[]> Array of conflicting bookings
     */
    async detectConflicts(
        venueId: string,
        startTime: Date,
        endTime: Date,
        excludeBookingId?: string
    ): Promise<Booking[]> {
        return bookingRepository.findConflicts(venueId, startTime, endTime, excludeBookingId);
    }

    /**
     * Suggest alternative venues that meet requirements and are available
     * @param originalVenueId - The ID of the venue that has a conflict
     * @param startTime - Proposed start time
     * @param endTime - Proposed end time
     * @returns Promise<Venue[]> Array of available alternative venues
     */
    async getAlternativeVenues(
        originalVenueId: string,
        startTime: Date,
        endTime: Date
    ): Promise<Venue[]> {
        const originalVenue = await venueRepository.getVenueById(originalVenueId);
        if (!originalVenue) {
            throw new Error('Original venue not found');
        }

        // Find venues with similar or greater capacity
        const { venues } = await venueRepository.searchVenues({
            minCapacity: originalVenue.capacity,
            pageSize: 50,
        });

        const alternatives: Venue[] = [];

        for (const venue of venues) {
            if (venue.venueId === originalVenueId) continue;

            const conflicts = await this.detectConflicts(venue.venueId, startTime, endTime);
            if (conflicts.length === 0 && venue.isAvailable) {
                alternatives.push(venue);
            }

            if (alternatives.length >= 5) break; // Limit suggestions
        }

        return alternatives;
    }

    /**
     * Suggest alternative time slots for same venue
     * @param venueId - The ID of the venue
     * @param originalStartTime - The original requested start time
     * @param originalEndTime - The original requested end time
     * @returns Promise<{startTime: Date, endTime: Date}[]>
     */
    async getAlternativeSlots(
        venueId: string,
        originalStartTime: Date,
        originalEndTime: Date
    ): Promise<{ startTime: Date; endTime: Date }[]> {
        const durationMs = originalEndTime.getTime() - originalStartTime.getTime();
        const suggestions: { startTime: Date; endTime: Date }[] = [];

        // Check slots +/- 2, 4, 6 hours
        const offsets = [2, -2, 4, -4, 6, -6];

        for (const offset of offsets) {
            const newStart = new Date(originalStartTime.getTime() + offset * 60 * 60 * 1000);
            const newEnd = new Date(newStart.getTime() + durationMs);

            // Don't suggest slots in the past
            if (newStart.getTime() < Date.now()) continue;

            const conflicts = await this.detectConflicts(venueId, newStart, newEnd);
            if (conflicts.length === 0) {
                suggestions.push({ startTime: newStart, endTime: newEnd });
            }

            if (suggestions.length >= 3) break;
        }

        return suggestions;
    }
}

export const conflictDetectionService = new ConflictDetectionService();
