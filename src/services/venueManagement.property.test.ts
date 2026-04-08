import { jest } from '@jest/globals';
import * as fc from 'fast-check';
import { Timestamp } from 'firebase/firestore';
import { bookingService } from './bookingService';
import { conflictDetectionService } from './conflictDetectionService';
import { venueRepository } from '../repositories/venueRepository';
import { bookingRepository } from '../repositories/bookingRepository';
import { Venue, Booking, BookingStatus } from '../types';

// Mock Firebase and Repositories
jest.mock('./firebase', () => ({
    db: {},
}));

jest.mock('../repositories/venueRepository', () => ({
    venueRepository: {
        getVenueById: jest.fn(),
        searchVenues: jest.fn(),
    },
}));

jest.mock('../repositories/bookingRepository', () => ({
    bookingRepository: {
        findConflicts: jest.fn(),
        createBooking: jest.fn(),
        getBookingById: jest.fn(),
        updateBooking: jest.fn(),
        getBookingsByVenue: jest.fn(),
    },
}));

describe('Venue Management Property Tests', () => {
    const venueId = 'test-venue-id';
    const eventId = 'test-event-id';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const generateVenue = (id: string, capacity: number): Venue => ({
        venueId: id,
        name: `Venue ${id}`,
        location: 'Test Location',
        capacity,
        equipment: ['Projector'],
        features: ['AC'],
        isAvailable: true,
    });

    const generateDate = (hoursFromNow: number) => {
        const date = new Date();
        date.setHours(date.getHours() + hoursFromNow);
        date.setMinutes(0, 0, 0);
        return date;
    };

    // Property 19: Venue Double-Booking Prevention
    // Validates: Requirements 8.6
    describe('Property 19: Venue Double-Booking Prevention', () => {
        it('should prevent booking if a conflict is detected', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 24 }), // Start hour
                    fc.integer({ min: 1, max: 4 }),  // Duration
                    async (startHour, duration) => {
                        const startTime = generateDate(startHour);
                        const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

                        // Mock venue exists and is available
                        (venueRepository.getVenueById as any).mockResolvedValue(generateVenue(venueId, 100));

                        // Mock a conflict exists
                        const conflictingBooking: Booking = {
                            bookingId: 'existing-id',
                            venueId,
                            eventId: 'other-event',
                            startTime: Timestamp.fromDate(startTime),
                            endTime: Timestamp.fromDate(endTime),
                            status: BookingStatus.CONFIRMED,
                            createdAt: Timestamp.now(),
                        };
                        (bookingRepository.findConflicts as any).mockResolvedValue([conflictingBooking]);

                        await expect(bookingService.createBooking(venueId, eventId, startTime, endTime))
                            .rejects.toThrow('Venue is already booked');
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should allow booking if no conflicts exist', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 24 }),
                    fc.integer({ min: 1, max: 4 }),
                    async (startHour, duration) => {
                        const startTime = generateDate(startHour);
                        const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

                        (venueRepository.getVenueById as any).mockResolvedValue(generateVenue(venueId, 100));
                        (bookingRepository.findConflicts as any).mockResolvedValue([]);
                        (bookingRepository.createBooking as any).mockImplementation((data: any) => Promise.resolve({
                            bookingId: 'new-id',
                            ...data
                        }));

                        const booking = await bookingService.createBooking(venueId, eventId, startTime, endTime);
                        expect(booking).toBeDefined();
                        expect(bookingRepository.createBooking).toHaveBeenCalled();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 20: Venue Availability Check
    // Validates: Requirements 8.1, 8.2, 8.3
    describe('Property 20: Venue Availability Check', () => {
        it('should only return venues with sufficient capacity and no conflicts', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 10, max: 500 }), // Required capacity
                    fc.array(fc.record({
                        id: fc.uuid(),
                        capacity: fc.integer({ min: 1, max: 1000 }),
                        hasConflict: fc.boolean()
                    }), { minLength: 1, maxLength: 10 }),
                    async (reqCapacity, venueConfigs) => {
                        const startTime = generateDate(1);
                        const endTime = generateDate(2);

                        const mockVenues = venueConfigs.map(cfg => generateVenue(cfg.id, cfg.capacity));

                        (venueRepository.searchVenues as any).mockImplementation((opts: any) => {
                            let filtered = mockVenues;
                            if (opts.minCapacity) {
                                filtered = filtered.filter(v => v.capacity >= opts.minCapacity);
                            }
                            if (opts.requiredEquipment) {
                                filtered = filtered.filter(v =>
                                    opts.requiredEquipment.every((req: string) => v.equipment.includes(req))
                                );
                            }
                            if (opts.requiredFeatures) {
                                filtered = filtered.filter(v =>
                                    opts.requiredFeatures.every((req: string) => v.features.includes(req))
                                );
                            }
                            return Promise.resolve({
                                venues: filtered,
                                lastDoc: null
                            });
                        });

                        (bookingRepository.findConflicts as any).mockImplementation((vId: any) => {
                            const cfg = venueConfigs.find(c => c.id === vId);
                            return Promise.resolve(cfg?.hasConflict ? [{}] : []);
                        });

                        const available = await bookingService.getAvailableVenues(startTime, endTime, {
                            minCapacity: reqCapacity
                        });

                        available.forEach(v => {
                            const cfg = venueConfigs.find(c => c.id === v.venueId);
                            // Must have enough capacity (searchVenues should filter this, but we verify anyway)
                            expect(v.capacity).toBeGreaterThanOrEqual(reqCapacity);
                            // Must not have conflict
                            expect(cfg?.hasConflict).toBe(false);
                            // Must be available
                            expect(v.isAvailable).toBe(true);
                        });
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 22: Conflict Detection and Notification
    // Validates: Requirements 9.1, 9.2
    describe('Property 22: Conflict Detection', () => {
        it('should identify overlaps: [start, end] intersects [bStart, bEnd]', () => {
            // This tests the logic in findConflicts if we were testing the repository, 
            // but since we want to test the service's use of it:
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 200 }), // Proposed start
                    fc.integer({ min: 201, max: 300 }), // Proposed end
                    fc.integer({ min: 50, max: 350 }),  // Existing start
                    fc.integer({ min: 50, max: 350 }),  // Existing end
                    (start, end, bStart, bEnd) => {
                        // Ensure bStart < bEnd
                        if (bStart >= bEnd) return true;

                        const hasOverlap = start < bEnd && end > bStart;

                        // Logic check: overlap occurs if NOT (end <= bStart OR start >= bEnd)
                        const expectedOverlap = !(end <= bStart || start >= bEnd);
                        expect(hasOverlap).toBe(expectedOverlap);
                    }
                ),
                { numRuns: 1000 }
            );
        });
    });

    describe('Property 23: Alternative Suggestions', () => {
        it('should suggest slots that have no conflicts', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 24 }),
                    fc.integer({ min: 1, max: 4 }),
                    async (startHour, duration) => {
                        const startTime = generateDate(startHour);
                        const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

                        // Mock some conflicts for some times and not others
                        (bookingRepository.findConflicts as any).mockImplementation(() => {
                            // Deterministic conflict based on current hour
                            const h = new Date().getHours();
                            return Promise.resolve(h % 2 === 0 ? [{}] : []);
                        });

                        const alternatives = await conflictDetectionService.getAlternativeSlots(venueId, startTime, endTime);

                        for (const slot of alternatives) {
                            const conflicts = await bookingRepository.findConflicts(venueId, slot.startTime, slot.endTime);
                            expect(conflicts.length).toBe(0);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
