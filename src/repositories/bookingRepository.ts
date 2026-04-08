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
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { dbConnectionManager } from '../services/databaseConnectionManager';
import { Booking, BookingStatus } from '../types';

/**
 * Repository for managing Booking entities in Firestore
 * Provides CRUD operations and conflict detection queries
 */
export class BookingRepository {
    private readonly collectionName = 'bookings';

    /**
     * Get a booking by its ID
     * @param bookingId - The unique identifier of the booking
     * @returns Promise<Booking | null> The booking if found, null otherwise
     */
    async getBookingById(bookingId: string): Promise<Booking | null> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const bookingDoc = await getDoc(doc(connection, this.collectionName, bookingId));

            if (!bookingDoc.exists()) {
                return null;
            }

            return {
                bookingId: bookingDoc.id,
                ...bookingDoc.data(),
            } as Booking;
        });
    }

    /**
     * Get all bookings for a specific venue
     * @param venueId - The ID of the venue
     * @param startTime - Optional filter for bookings starting after this time
     * @returns Promise<Booking[]> Array of bookings
     */
    async getBookingsByVenue(venueId: string, startTime?: Date): Promise<Booking[]> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            let q = query(
                collection(connection, this.collectionName),
                where('venueId', '==', venueId),
                orderBy('startTime', 'asc')
            );

            if (startTime) {
                q = query(q, where('startTime', '>=', Timestamp.fromDate(startTime)));
            }

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                bookingId: doc.id,
                ...doc.data(),
            } as Booking));
        });
    }

    /**
     * Get all bookings for a specific event
     * @param eventId - The ID of the event
     * @returns Promise<Booking[]> Array of bookings (usually one per event)
     */
    async getBookingsByEvent(eventId: string): Promise<Booking[]> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const q = query(
                collection(connection, this.collectionName),
                where('eventId', '==', eventId)
            );

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                bookingId: doc.id,
                ...doc.data(),
            } as Booking));
        });
    }

    /**
     * Create a new booking
     * @param bookingData - The booking data (without bookingId)
     * @returns Promise<Booking> The created booking with generated ID
     */
    async createBooking(bookingData: Omit<Booking, 'bookingId'>): Promise<Booking> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const docRef = await addDoc(collection(connection, this.collectionName), {
                ...bookingData,
                createdAt: bookingData.createdAt || Timestamp.now(),
            });

            return {
                bookingId: docRef.id,
                ...bookingData,
            } as Booking;
        });
    }

    /**
     * Update an existing booking
     * @param bookingId - The ID of the booking to update
     * @param updates - Partial booking data to update
     * @returns Promise<void>
     */
    async updateBooking(bookingId: string, updates: Partial<Omit<Booking, 'bookingId'>>): Promise<void> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const bookingRef = doc(connection, this.collectionName, bookingId);
            await updateDoc(bookingRef, updates);
        });
    }

    /**
     * Delete a booking
     * @param bookingId - The ID of the booking to delete
     * @returns Promise<void>
     */
    async deleteBooking(bookingId: string): Promise<void> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            await deleteDoc(doc(connection, this.collectionName, bookingId));
        });
    }

    /**
     * Find conflicting bookings for a given venue and time range
     * @param venueId - The ID of the venue to check
     * @param startTime - The proposed start time
     * @param endTime - The proposed end time
     * @param excludeBookingId - Optional ID to exclude (e.g., when updating an existing booking)
     * @returns Promise<Booking[]> Array of conflicting bookings
     */
    async findConflicts(
        venueId: string,
        startTime: Date,
        endTime: Date,
        excludeBookingId?: string
    ): Promise<Booking[]> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            // Conflicts occur if:
            // 1. Proposed start is during an existing booking
            // 2. Proposed end is during an existing booking
            // 3. Proposed booking overlaps an entire existing booking

            // Firestore doesn't support complex range queries with OR logic well.
            // We'll fetch all active bookings for the venue and filter in memory for efficiency
            // if the volume is low, or use multiple queries if necessary.

            const q = query(
                collection(connection, this.collectionName),
                where('venueId', '==', venueId),
                where('status', '==', BookingStatus.CONFIRMED)
            );

            const querySnapshot = await getDocs(q);
            const startTimestamp = Timestamp.fromDate(startTime).toMillis();
            const endTimestamp = Timestamp.fromDate(endTime).toMillis();

            return querySnapshot.docs
                .map(doc => ({
                    bookingId: doc.id,
                    ...doc.data(),
                } as Booking))
                .filter(booking => {
                    if (booking.bookingId === excludeBookingId) return false;

                    const bStart = (booking.startTime as Timestamp).toMillis();
                    const bEnd = (booking.endTime as Timestamp).toMillis();

                    // Check for overlap: [start, end] intersects [bStart, bEnd]
                    return startTimestamp < bEnd && endTimestamp > bStart;
                });
        });
    }
}

export const bookingRepository = new BookingRepository();
