import { EventRepository } from './eventRepository';
import { Event, EventType, EventStatus } from '../types';
import { Timestamp } from 'firebase/firestore';
import {
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('../services/firebase', () => ({
  db: {},
}));

describe('EventRepository', () => {
  let eventRepository: EventRepository;

  const createTestEvent = (overrides?: Partial<Omit<Event, 'eventId'>>): Omit<Event, 'eventId'> => {
    return {
      clubId: 'club-123',
      name: 'Test Event',
      description: 'Test event description',
      type: EventType.WORKSHOP,
      startTime: Timestamp.fromDate(new Date('2024-06-01T10:00:00Z')),
      endTime: Timestamp.fromDate(new Date('2024-06-01T12:00:00Z')),
      venueId: 'venue-123',
      capacity: 50,
      registeredCount: 0,
      tags: ['tech', 'workshop'],
      fee: 0,
      status: EventStatus.ACTIVE,
      location: 'Test Location',
      qrCodeData: 'qr-code-data',
      createdAt: Timestamp.now(),
      ...overrides,
    };
  };

  beforeEach(() => {
    eventRepository = new EventRepository();
    jest.clearAllMocks();
  });

  describe('getEventById', () => {
    it('should return event when it exists', async () => {
      const mockEvent = createTestEvent();
      const mockDoc = {
        exists: () => true,
        id: 'event-123',
        data: () => mockEvent,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const result = await eventRepository.getEventById('event-123');

      expect(result).toEqual({
        eventId: 'event-123',
        ...mockEvent,
      });
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return null when event does not exist', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const result = await eventRepository.getEventById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when database operation fails', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(eventRepository.getEventById('event-123')).rejects.toThrow(
        'Failed to get event with ID event-123'
      );
    });
  });

  describe('getEventsByClub', () => {
    it('should return all events for a club', async () => {
      const mockEvents = [
        createTestEvent({ name: 'Event 1' }),
        createTestEvent({ name: 'Event 2' }),
      ];

      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getEventsByClub('club-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Event 1');
      expect(result[1].name).toBe('Event 2');
      expect(getDocs).toHaveBeenCalled();
    });

    it('should return empty array when club has no events', async () => {
      const mockSnapshot = {
        docs: [],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getEventsByClub('club-123');

      expect(result).toEqual([]);
    });

    it('should throw error when database operation fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(eventRepository.getEventsByClub('club-123')).rejects.toThrow(
        'Failed to get events for club club-123'
      );
    });
  });

  describe('createEvent', () => {
    it('should create event with valid data', async () => {
      const eventData = createTestEvent();
      const mockDocRef = { id: 'new-event-123' };

      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await eventRepository.createEvent(eventData);

      expect(result).toEqual({
        eventId: 'new-event-123',
        ...eventData,
      });
      expect(addDoc).toHaveBeenCalled();
    });

    it('should add createdAt timestamp if not provided', async () => {
      const eventData = createTestEvent();
      delete (eventData as any).createdAt;
      const mockDocRef = { id: 'new-event-123' };

      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      await eventRepository.createEvent(eventData);

      const addDocCall = (addDoc as jest.Mock).mock.calls[0][1];
      expect(addDocCall.createdAt).toBeDefined();
    });

    it('should throw error when creation fails', async () => {
      const eventData = createTestEvent();
      (addDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(eventRepository.createEvent(eventData)).rejects.toThrow(
        'Failed to create event'
      );
    });
  });

  describe('updateEvent', () => {
    it('should update event with valid data', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await eventRepository.updateEvent('event-123', {
        name: 'Updated Event',
        capacity: 100,
      });

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        eventRepository.updateEvent('event-123', { name: 'Updated' })
      ).rejects.toThrow('Failed to update event with ID event-123');
    });
  });

  describe('deleteEvent', () => {
    it('should delete event successfully', async () => {
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await eventRepository.deleteEvent('event-123');

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw error when deletion fails', async () => {
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(eventRepository.deleteEvent('event-123')).rejects.toThrow(
        'Failed to delete event with ID event-123'
      );
    });
  });

  describe('queryEvents', () => {
    it('should query events with default pagination', async () => {
      const mockEvents = [createTestEvent()];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.queryEvents();

      expect(result.events).toHaveLength(1);
      expect(result.lastDoc).toBe(mockDocs[0]);
    });

    it('should filter events by clubId', async () => {
      const mockEvents = [createTestEvent({ clubId: 'club-123' })];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.queryEvents({ clubId: 'club-123' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].clubId).toBe('club-123');
    });

    it('should filter events by type', async () => {
      const mockEvents = [createTestEvent({ type: EventType.HACKATHON })];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.queryEvents({ type: EventType.HACKATHON });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe(EventType.HACKATHON);
    });

    it('should filter events by status', async () => {
      const mockEvents = [createTestEvent({ status: EventStatus.ACTIVE })];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.queryEvents({ status: EventStatus.ACTIVE });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].status).toBe(EventStatus.ACTIVE);
    });

    it('should filter events by single tag', async () => {
      const mockEvents = [createTestEvent({ tags: ['tech', 'workshop'] })];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.queryEvents({ tags: ['tech'] });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].tags).toContain('tech');
    });

    it('should filter events by multiple tags in memory', async () => {
      const mockEvents = [
        createTestEvent({ tags: ['tech', 'workshop'] }),
        createTestEvent({ tags: ['tech', 'seminar'] }),
      ];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.queryEvents({ tags: ['tech', 'workshop'] });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].tags).toEqual(['tech', 'workshop']);
    });

    it('should return empty lastDoc when no results', async () => {
      const mockSnapshot = {
        docs: [],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.queryEvents();

      expect(result.events).toEqual([]);
      expect(result.lastDoc).toBeNull();
    });

    it('should throw error when query fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(eventRepository.queryEvents()).rejects.toThrow('Failed to query events');
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return upcoming active events', async () => {
      const futureDate = Timestamp.fromDate(new Date(Date.now() + 86400000)); // Tomorrow
      const mockEvents = [
        createTestEvent({
          startTime: futureDate,
          status: EventStatus.ACTIVE,
        }),
      ];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getUpcomingEvents();

      expect(result.events).toHaveLength(1);
      expect(result.events[0].status).toBe(EventStatus.ACTIVE);
    });

    it('should filter upcoming events by clubId', async () => {
      const futureDate = Timestamp.fromDate(new Date(Date.now() + 86400000));
      const mockEvents = [
        createTestEvent({
          clubId: 'club-123',
          startTime: futureDate,
          status: EventStatus.ACTIVE,
        }),
      ];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getUpcomingEvents({ clubId: 'club-123' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].clubId).toBe('club-123');
    });

    it('should throw error when query fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(eventRepository.getUpcomingEvents()).rejects.toThrow(
        'Failed to get upcoming events'
      );
    });
  });

  describe('getEventsByTag', () => {
    it('should return events with specified tag', async () => {
      const mockEvents = [createTestEvent({ tags: ['tech', 'workshop'] })];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getEventsByTag('tech');

      expect(result.events).toHaveLength(1);
      expect(result.events[0].tags).toContain('tech');
    });

    it('should support pagination', async () => {
      const mockEvents = [createTestEvent()];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getEventsByTag('tech', { pageSize: 10 });

      expect(result.events).toHaveLength(1);
      expect(result.lastDoc).toBe(mockDocs[0]);
    });

    it('should throw error when query fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(eventRepository.getEventsByTag('tech')).rejects.toThrow(
        'Failed to get events with tag tech'
      );
    });
  });

  describe('getEventsByType', () => {
    it('should return events of specified type', async () => {
      const mockEvents = [createTestEvent({ type: EventType.HACKATHON })];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getEventsByType(EventType.HACKATHON);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe(EventType.HACKATHON);
    });

    it('should support pagination', async () => {
      const mockEvents = [createTestEvent({ type: EventType.WORKSHOP })];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getEventsByType(EventType.WORKSHOP, {
        pageSize: 10,
      });

      expect(result.events).toHaveLength(1);
      expect(result.lastDoc).toBe(mockDocs[0]);
    });

    it('should throw error when query fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(eventRepository.getEventsByType(EventType.WORKSHOP)).rejects.toThrow(
        'Failed to get events of type WORKSHOP'
      );
    });
  });

  describe('getEventsByDateRange', () => {
    it('should return events within date range', async () => {
      const startDate = Timestamp.fromDate(new Date('2024-06-01'));
      const endDate = Timestamp.fromDate(new Date('2024-06-30'));
      const mockEvents = [
        createTestEvent({
          startTime: Timestamp.fromDate(new Date('2024-06-15')),
        }),
      ];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getEventsByDateRange(startDate, endDate);

      expect(result.events).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const startDate = Timestamp.fromDate(new Date('2024-06-01'));
      const endDate = Timestamp.fromDate(new Date('2024-06-30'));
      const mockEvents = [createTestEvent()];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getEventsByDateRange(startDate, endDate, {
        pageSize: 10,
      });

      expect(result.events).toHaveLength(1);
      expect(result.lastDoc).toBe(mockDocs[0]);
    });

    it('should throw error when query fails', async () => {
      const startDate = Timestamp.fromDate(new Date('2024-06-01'));
      const endDate = Timestamp.fromDate(new Date('2024-06-30'));
      (getDocs as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        eventRepository.getEventsByDateRange(startDate, endDate)
      ).rejects.toThrow('Failed to get events in date range');
    });
  });

  describe('getAllEvents', () => {
    it('should return all events', async () => {
      const mockEvents = [
        createTestEvent({ name: 'Event 1' }),
        createTestEvent({ name: 'Event 2' }),
        createTestEvent({ name: 'Event 3' }),
      ];
      const mockDocs = mockEvents.map((event, index) => ({
        id: `event-${index}`,
        data: () => event,
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getAllEvents();

      expect(result).toHaveLength(3);
    });

    it('should return empty array when no events exist', async () => {
      const mockSnapshot = {
        docs: [],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await eventRepository.getAllEvents();

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(eventRepository.getAllEvents()).rejects.toThrow('Failed to get all events');
    });
  });
});
