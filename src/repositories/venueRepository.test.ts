import { venueRepository } from './venueRepository';
import { bookingRepository } from './bookingRepository';
import { Venue, Booking, BookingStatus } from '../types';
import { Timestamp } from 'firebase/firestore';

jest.mock('../services/firebase', () => ({
    db: {},
}));

jest.mock('../services/databaseConnectionManager', () => ({
    dbConnectionManager: {
        executeWithRetry: jest.fn((callback) => callback({})),
    },
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
    startAfter: jest.fn(),
    orderBy: jest.fn(),
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn((d) => ({ toDate: () => d, toMillis: () => d.getTime() })),
    },
}));

import {
    getDoc,
    addDoc,
    getDocs
} from 'firebase/firestore';

describe('VenueRepository', () => {
    const mockVenue: Omit<Venue, 'venueId'> = {
        name: 'Multipurpose Hall - Floor 1',
        type: 'Multipurpose',
        floor: 1,
        building: 'Main Block',
        capacity: 100,
        facilities: ['Projector'],
        description: 'Test Description',
        status: 'active',
        createdBy: 'test-user',
        createdAt: Timestamp.now() as any,
        location: 'Building A',
        equipment: ['Projector'],
        features: ['AC'],
        isAvailable: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should get venue by ID', async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            id: 'venue-1',
            data: () => mockVenue,
        });

        const result = await venueRepository.getVenueById('venue-1');
        expect(result).toEqual({ venueId: 'venue-1', ...mockVenue });
    });

    it('should create a venue', async () => {
        (addDoc as jest.Mock).mockResolvedValue({ id: 'new-venue' });

        const result = await venueRepository.createVenue(mockVenue);
        expect(result.venueId).toBe('new-venue');
    });
});

describe('BookingRepository', () => {
    const mockBooking: Omit<Booking, 'bookingId'> = {
        venueId: 'venue-1',
        eventId: 'event-1',
        startTime: Timestamp.fromDate(new Date()) as any,
        endTime: Timestamp.fromDate(new Date()) as any,
        status: BookingStatus.CONFIRMED,
        createdAt: Timestamp.now() as any,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should find conflicts', async () => {
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 3600000);

        (getDocs as jest.Mock).mockResolvedValue({
            docs: [
                {
                    id: 'booking-1',
                    data: () => ({
                        ...mockBooking,
                        startTime: Timestamp.fromDate(new Date(startTime.getTime() - 1800000)),
                        endTime: Timestamp.fromDate(new Date(startTime.getTime() + 1800000)),
                    }),
                },
            ],
        });

        const conflicts = await bookingRepository.findConflicts('venue-1', startTime, endTime);
        expect(conflicts.length).toBe(1);
    });
});
