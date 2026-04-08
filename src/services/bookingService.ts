import { Timestamp } from 'firebase/firestore';
import { bookingRepository } from '../repositories/bookingRepository';
import { venueRepository } from '../repositories/venueRepository';
import { conflictDetectionService } from './conflictDetectionService';
import { Booking, BookingStatus, Venue } from '../types';

/**
 * Service for managing venue bookings
 */
export class BookingService {
    /**
     * Create a new booking
     * @param venueId - The ID of the venue
     * @param eventId - The ID of the event
     * @param startTime - Start time
     * @param endTime - End time
     * @returns Promise<Booking> The created booking
     */
    async createBooking(
        venueId: string,
        eventId: string,
        startTime: Date,
        endTime: Date
    ): Promise<Booking> {
        // 1. Check if venue exists
        const venue = await venueRepository.getVenueById(venueId);
        if (!venue) {
            throw new Error('Venue not found');
        }

        if (!venue.isAvailable) {
            throw new Error('Venue is currently unavailable for bookings');
        }

        // 2. Check for conflicts
        const conflicts = await conflictDetectionService.detectConflicts(venueId, startTime, endTime);
        if (conflicts.length > 0) {
            throw new Error('Venue is already booked for the requested time slot');
        }

        // 3. Create booking
        const booking: Omit<Booking, 'bookingId'> = {
            venueId,
            eventId,
            startTime: Timestamp.fromDate(startTime),
            endTime: Timestamp.fromDate(endTime),
            status: BookingStatus.CONFIRMED,
            createdAt: Timestamp.now(),
        };

        return bookingRepository.createBooking(booking);
    }

    /**
     * Cancel a booking
     * @param bookingId - The ID of the booking to cancel
     */
    async cancelBooking(bookingId: string): Promise<void> {
        const booking = await bookingRepository.getBookingById(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        await bookingRepository.updateBooking(bookingId, {
            status: BookingStatus.CANCELLED,
        });
    }

    /**
     * Get available venues for a given time range and requirements
     * @param startTime - Requested start time
     * @param endTime - Requested end time
     * @param requirements - Optional requirements (capacity, features)
     * @returns Promise<Venue[]> Array of available venues
     */
    async getAvailableVenues(
        startTime: Date,
        endTime: Date,
        requirements: {
            minCapacity?: number;
            requiredEquipment?: string[];
            requiredFeatures?: string[];
        } = {}
    ): Promise<Venue[]> {
        const { venues } = await venueRepository.searchVenues({
            minCapacity: requirements.minCapacity,
            requiredEquipment: requirements.requiredEquipment,
            requiredFeatures: requirements.requiredFeatures,
            pageSize: 100,
        });

        const availableVenues: Venue[] = [];

        for (const venue of venues) {
            if (!venue.isAvailable) continue;

            const conflicts = await conflictDetectionService.detectConflicts(venue.venueId, startTime, endTime);
            if (conflicts.length === 0) {
                availableVenues.push(venue);
            }
        }

        return availableVenues;
    }

    /**
     * Get venue schedule for a specific date
     * @param venueId - The ID of the venue
     * @param date - The date to check
     * @returns Promise<Booking[]>
     */
    async getVenueSchedule(venueId: string, date: Date): Promise<Booking[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // This is simple but could be optimized if needed
        const bookings = await bookingRepository.getBookingsByVenue(venueId, startOfDay);

        return bookings.filter(b => {
            const bStart = (b.startTime as Timestamp).toDate();
            return bStart <= endOfDay && b.status === BookingStatus.CONFIRMED;
        });
    }
}

export const bookingService = new BookingService();
