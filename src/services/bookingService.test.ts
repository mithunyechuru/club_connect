import { bookingService } from './bookingService';
import { venueRepository } from '../repositories/venueRepository';
import { bookingRepository } from '../repositories/bookingRepository';
import { conflictDetectionService } from './conflictDetectionService';
import { BookingStatus, Venue } from '../types';
import { Timestamp } from 'firebase/firestore';

jest.mock('../repositories/venueRepository');
jest.mock('../repositories/bookingRepository');
jest.mock('./conflictDetectionService');

describe('BookingService', () => {
    const venueId = 'venue-1';
    const eventId = 'event-1';
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 3600000);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockVenue: Venue = {
        venueId,
        name: 'Hall',
        location: 'A',
        capacity: 100,
        equipment: [],
        features: [],
        isAvailable: true,
    };

    it('should create a booking successfully when there are no conflicts', async () => {
        (venueRepository.getVenueById as jest.Mock).mockResolvedValue(mockVenue);
        (conflictDetectionService.detectConflicts as jest.Mock).mockResolvedValue([]);
        (bookingRepository.createBooking as jest.Mock).mockResolvedValue({
            bookingId: 'booking-1',
            venueId,
            eventId,
            startTime: Timestamp.fromDate(startTime),
            endTime: Timestamp.fromDate(endTime),
            status: BookingStatus.CONFIRMED,
        });

        const result = await bookingService.createBooking(venueId, eventId, startTime, endTime);

        expect(result.bookingId).toBe('booking-1');
        expect(bookingRepository.createBooking).toHaveBeenCalled();
    });

    it('should throw error if venue is unavailable', async () => {
        (venueRepository.getVenueById as jest.Mock).mockResolvedValue({
            ...mockVenue,
            isAvailable: false,
        });

        await expect(bookingService.createBooking(venueId, eventId, startTime, endTime))
            .rejects.toThrow('Venue is currently unavailable');
    });

    it('should throw error if conflict exists', async () => {
        (venueRepository.getVenueById as jest.Mock).mockResolvedValue(mockVenue);
        (conflictDetectionService.detectConflicts as jest.Mock).mockResolvedValue([{ bookingId: 'conflict' }]);

        await expect(bookingService.createBooking(venueId, eventId, startTime, endTime))
            .rejects.toThrow('already booked');
    });
});
