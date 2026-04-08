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
  limit,
  startAfter,
  orderBy,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Event, EventType, EventStatus } from '../types';

/**
 * Repository for managing Event entities in Firestore
 * Provides CRUD operations, event queries with filters, pagination, and composite indices
 */
export class EventRepository {
  private readonly collectionName = 'events';

  /**
   * Get an event by its ID
   * @param eventId - The unique identifier of the event
   * @returns Promise<Event | null> The event if found, null otherwise
   */
  async getEventById(eventId: string): Promise<Event | null> {
    try {
      const eventDoc = await getDoc(doc(db, this.collectionName, eventId));

      if (!eventDoc.exists()) {
        return null;
      }

      return {
        eventId: eventDoc.id,
        ...eventDoc.data(),
      } as Event;
    } catch (error) {
      console.error('Error getting event by ID:', error);
      throw new Error(`Failed to get event with ID ${eventId}`);
    }
  }

  /**
   * Get all events for a specific club
   * @param clubId - The ID of the club
   * @returns Promise<Event[]> Array of events for the club
   */
  async getEventsByClub(clubId: string): Promise<Event[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('clubId', '==', clubId),
        orderBy('startTime', 'desc')
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        eventId: doc.id,
        ...doc.data(),
      } as Event));
    } catch (error) {
      console.error('Error getting events by club:', error);
      throw new Error(`Failed to get events for club ${clubId}`);
    }
  }

  /**
   * Create a new event
   * @param eventData - The event data (without eventId)
   * @returns Promise<Event> The created event with generated ID
   */
  async createEvent(eventData: Omit<Event, 'eventId'>): Promise<Event> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...eventData,
        createdAt: eventData.createdAt || Timestamp.now(),
      });

      const createdEvent: Event = {
        eventId: docRef.id,
        ...eventData,
      };

      return createdEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  /**
   * Update an existing event
   * @param eventId - The ID of the event to update
   * @param updates - Partial event data to update
   * @returns Promise<void>
   */
  async updateEvent(eventId: string, updates: Partial<Omit<Event, 'eventId'>>): Promise<void> {
    try {
      const eventRef = doc(db, this.collectionName, eventId);
      await updateDoc(eventRef, updates);
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error(`Failed to update event with ID ${eventId}`);
    }
  }

  /**
   * Delete an event
   * @param eventId - The ID of the event to delete
   * @returns Promise<void>
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error(`Failed to delete event with ID ${eventId}`);
    }
  }

  /**
   * Query events with filters and pagination
   * Supports filtering by type, date range, tags, status, and club
   * @param options - Query options including filters and pagination
   * @returns Promise with events array and last document for pagination
   */
  async queryEvents(options: {
    pageSize?: number;
    lastDoc?: DocumentSnapshot;
    clubId?: string;
    type?: EventType;
    status?: EventStatus;
    tags?: string[];
    startTimeFrom?: Timestamp;
    startTimeTo?: Timestamp;
  } = {}): Promise<{ events: Event[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const pageSize = options.pageSize || 20;

      // Build query based on filters
      let q = query(collection(db, this.collectionName));

      // Apply filters
      if (options.clubId) {
        q = query(q, where('clubId', '==', options.clubId));
      }

      if (options.type) {
        q = query(q, where('type', '==', options.type));
      }

      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      // Tag filtering - Firestore supports array-contains for single tag
      if (options.tags && options.tags.length > 0) {
        // For single tag, use array-contains
        // For multiple tags, we'll need to filter in memory after fetching
        q = query(q, where('tags', 'array-contains', options.tags[0]));
      }

      // Date range filtering
      if (options.startTimeFrom) {
        q = query(q, where('startTime', '>=', options.startTimeFrom));
      }

      if (options.startTimeTo) {
        q = query(q, where('startTime', '<=', options.startTimeTo));
      }

      // Add ordering and pagination
      q = query(q, orderBy('startTime', 'desc'), limit(pageSize));

      if (options.lastDoc) {
        q = query(q, startAfter(options.lastDoc));
      }

      const querySnapshot = await getDocs(q);

      let events: Event[] = querySnapshot.docs.map(doc => ({
        eventId: doc.id,
        ...doc.data(),
      } as Event));

      // If multiple tags specified, filter in memory
      if (options.tags && options.tags.length > 1) {
        events = events.filter(event =>
          options.tags!.every(tag => event.tags.includes(tag))
        );
      }

      const lastDocument = querySnapshot.docs.length > 0
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;

      return { events, lastDoc: lastDocument };
    } catch (error) {
      console.error('Error querying events:', error);
      throw new Error('Failed to query events');
    }
  }

  /**
   * Get upcoming events (events with start time in the future)
   * @param options - Query options including pagination
   * @returns Promise with events array and last document
   */
  async getUpcomingEvents(options: {
    pageSize?: number;
    lastDoc?: DocumentSnapshot;
    clubId?: string;
  } = {}): Promise<{ events: Event[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const pageSize = options.pageSize || 20;
      const now = Timestamp.now();

      // Fetch all and filter in-memory — avoids composite index requirements
      const snap = await getDocs(collection(db, this.collectionName));
      let events: Event[] = snap.docs
        .map(d => ({ eventId: d.id, ...d.data() } as Event))
        .filter(e => {
          const startTime = e.startTime as any;
          const startMs = startTime?.toMillis?.() ?? 0;
          const nowMs = now.toMillis();
          const isUpcoming = startMs > nowMs;
          const isActive = e.status === EventStatus.ACTIVE;
          const matchesClub = options.clubId ? e.clubId === options.clubId : true;
          return isUpcoming && isActive && matchesClub;
        })
        .sort((a, b) => {
          const aT = (a.startTime as any)?.toMillis?.() ?? 0;
          const bT = (b.startTime as any)?.toMillis?.() ?? 0;
          return aT - bT; // ascending
        })
        .slice(0, pageSize);

      return { events, lastDoc: null };
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw new Error('Failed to get upcoming events');
    }
  }

  /**
   * Get events by tag
   * @param tag - The tag to search for
   * @param options - Query options including pagination
   * @returns Promise with events array and last document
   */
  async getEventsByTag(
    tag: string,
    options: {
      pageSize?: number;
      lastDoc?: DocumentSnapshot;
    } = {}
  ): Promise<{ events: Event[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const pageSize = options.pageSize || 20;

      let q = query(
        collection(db, this.collectionName),
        where('tags', 'array-contains', tag),
        orderBy('startTime', 'desc'),
        limit(pageSize)
      );

      if (options.lastDoc) {
        q = query(q, startAfter(options.lastDoc));
      }

      const querySnapshot = await getDocs(q);

      const events: Event[] = querySnapshot.docs.map(doc => ({
        eventId: doc.id,
        ...doc.data(),
      } as Event));

      const lastDocument = querySnapshot.docs.length > 0
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;

      return { events, lastDoc: lastDocument };
    } catch (error) {
      console.error('Error getting events by tag:', error);
      throw new Error(`Failed to get events with tag ${tag}`);
    }
  }

  /**
   * Get events by type
   * @param type - The event type
   * @param options - Query options including pagination
   * @returns Promise with events array and last document
   */
  async getEventsByType(
    type: EventType,
    options: {
      pageSize?: number;
      lastDoc?: DocumentSnapshot;
    } = {}
  ): Promise<{ events: Event[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const pageSize = options.pageSize || 20;

      let q = query(
        collection(db, this.collectionName),
        where('type', '==', type),
        orderBy('startTime', 'desc'),
        limit(pageSize)
      );

      if (options.lastDoc) {
        q = query(q, startAfter(options.lastDoc));
      }

      const querySnapshot = await getDocs(q);

      const events: Event[] = querySnapshot.docs.map(doc => ({
        eventId: doc.id,
        ...doc.data(),
      } as Event));

      const lastDocument = querySnapshot.docs.length > 0
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;

      return { events, lastDoc: lastDocument };
    } catch (error) {
      console.error('Error getting events by type:', error);
      throw new Error(`Failed to get events of type ${type}`);
    }
  }

  /**
   * Get events within a date range
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param options - Query options including pagination
   * @returns Promise with events array and last document
   */
  async getEventsByDateRange(
    startDate: Timestamp,
    endDate: Timestamp,
    options: {
      pageSize?: number;
      lastDoc?: DocumentSnapshot;
    } = {}
  ): Promise<{ events: Event[]; lastDoc: DocumentSnapshot | null }> {
    try {
      const pageSize = options.pageSize || 20;

      let q = query(
        collection(db, this.collectionName),
        where('startTime', '>=', startDate),
        where('startTime', '<=', endDate),
        orderBy('startTime', 'asc'),
        limit(pageSize)
      );

      if (options.lastDoc) {
        q = query(q, startAfter(options.lastDoc));
      }

      const querySnapshot = await getDocs(q);

      const events: Event[] = querySnapshot.docs.map(doc => ({
        eventId: doc.id,
        ...doc.data(),
      } as Event));

      const lastDocument = querySnapshot.docs.length > 0
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;

      return { events, lastDoc: lastDocument };
    } catch (error) {
      console.error('Error getting events by date range:', error);
      throw new Error('Failed to get events in date range');
    }
  }

  /**
   * Get all events (without pagination) - use with caution
   * @returns Promise<Event[]> Array of all events
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));

      return querySnapshot.docs.map(doc => ({
        eventId: doc.id,
        ...doc.data(),
      } as Event));
    } catch (error) {
      console.error('Error getting all events:', error);
      throw new Error('Failed to get all events');
    }
  }

  /**
   * Search events by name (case-insensitive partial match)
   * @param searchTerm - The search term
   * @returns Promise<Event[]> Array of matching events
   */
  async searchEventsByName(searchTerm: string): Promise<Event[]> {
    try {
      const allEvents = await this.getAllEvents();
      const lowerSearchTerm = searchTerm.toLowerCase();

      return allEvents.filter(event =>
        event.name.toLowerCase().includes(lowerSearchTerm) ||
        event.description.toLowerCase().includes(lowerSearchTerm)
      );
    } catch (error) {
      console.error('Error searching events by name:', error);
      throw new Error('Failed to search events');
    }
  }
}

export const eventRepository = new EventRepository();
