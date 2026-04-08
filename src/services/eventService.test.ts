import { Timestamp } from 'firebase/firestore';
import { EventService, EventValidationError } from './eventService';
import { eventRepository } from '../repositories/eventRepository';
import { Event, EventType, EventStatus } from '../types';

// Mock the event repository
jest.mock('../repositories/eventRepository');

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

// Mock Timestamp to add missing methods
jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    Timestamp: {
      ...actual.Timestamp,
      fromDate: (date: Date) => ({
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: (date.getTime() % 1000) * 1000000,
        toDate: () => date,
        toMillis: () => date.getTime(),
      }),
      fromMillis: (millis: number) => ({
        seconds: Math.floor(millis / 1000),
        nanoseconds: (millis % 1000) * 1000000,
        toDate: () => new Date(millis),
        toMillis: () => millis,
      }),
      now: () => {
        const date = new Date();
        return {
          seconds: Math.floor(date.getTime() / 1000),
          nanoseconds: (date.getTime() % 1000) * 1000000,
          toDate: () => date,
          toMillis: () => date.getTime(),
        };
      },
    },
  };
});

describe('EventService', () => {
  let eventService: EventService;
  let mockEventRepository: jest.Mocked<typeof eventRepository>;

  // Helper to create timestamps
  const createTimestamp = (dateString: string) => Timestamp.fromDate(new Date(dateString));

  beforeEach(() => {
    eventService = new EventService();
    mockEventRepository = eventRepository as jest.Mocked<typeof eventRepository>;
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create an event with valid data', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const eventData = {
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        tags: ['tech', 'workshop'],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
      };

      const createdEvent: Event = {
        eventId: 'event123',
        ...eventData,
        registeredCount: 0,
        qrCodeData: '',
        createdAt: now,
      };

      const updatedEvent: Event = {
        ...createdEvent,
        qrCodeData: 'EVENT_CHECK_IN|event123|1234567890|mock-uuid-1234',
      };

      mockEventRepository.createEvent.mockResolvedValue(createdEvent);
      mockEventRepository.updateEvent.mockResolvedValue(undefined);
      mockEventRepository.getEventById.mockResolvedValue(updatedEvent);

      const result = await eventService.createEvent(eventData);

      expect(result).toEqual(updatedEvent);
      expect(mockEventRepository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          ...eventData,
          registeredCount: 0,
          qrCodeData: '',
        })
      );
      // Verify QR code was generated and event was updated
      expect(mockEventRepository.updateEvent).toHaveBeenCalledWith(
        'event123',
        expect.objectContaining({
          qrCodeData: expect.stringContaining('EVENT_CHECK_IN'),
        })
      );
      expect(mockEventRepository.getEventById).toHaveBeenCalledWith('event123');
    });

    it('should throw error if end time is before start time', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const pastTime = createTimestamp('2024-06-01T09:00:00Z'); // 1 hour earlier

      const eventData = {
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: pastTime, // Invalid: end before start
        venueId: 'venue123',
        capacity: 50,
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
      };

      await expect(eventService.createEvent(eventData)).rejects.toThrow(EventValidationError);
      await expect(eventService.createEvent(eventData)).rejects.toThrow('Event end time must be after start time');
    });

    it('should throw error if end time equals start time', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');

      const eventData = {
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: now, // Invalid: end equals start
        venueId: 'venue123',
        capacity: 50,
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
      };

      await expect(eventService.createEvent(eventData)).rejects.toThrow(EventValidationError);
      await expect(eventService.createEvent(eventData)).rejects.toThrow('Event end time must be after start time');
    });

    it('should throw error if capacity is zero', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const eventData = {
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 0, // Invalid: zero capacity
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
      };

      await expect(eventService.createEvent(eventData)).rejects.toThrow(EventValidationError);
      await expect(eventService.createEvent(eventData)).rejects.toThrow('Event capacity must be a positive number');
    });

    it('should throw error if capacity is negative', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const eventData = {
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: -10, // Invalid: negative capacity
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
      };

      await expect(eventService.createEvent(eventData)).rejects.toThrow(EventValidationError);
      await expect(eventService.createEvent(eventData)).rejects.toThrow('Event capacity must be a positive number');
    });

    it('should throw error if capacity is not an integer', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const eventData = {
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50.5, // Invalid: non-integer capacity
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
      };

      await expect(eventService.createEvent(eventData)).rejects.toThrow(EventValidationError);
      await expect(eventService.createEvent(eventData)).rejects.toThrow('Event capacity must be an integer');
    });

    it('should throw error if event name is empty', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const eventData = {
        clubId: 'club123',
        name: '   ', // Invalid: empty name
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
      };

      await expect(eventService.createEvent(eventData)).rejects.toThrow(EventValidationError);
      await expect(eventService.createEvent(eventData)).rejects.toThrow('Event name cannot be empty');
    });

    it('should throw error if fee is negative', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const eventData = {
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        tags: [],
        fee: -10, // Invalid: negative fee
        status: EventStatus.ACTIVE,
        location: 'Test Location',
      };

      await expect(eventService.createEvent(eventData)).rejects.toThrow(EventValidationError);
      await expect(eventService.createEvent(eventData)).rejects.toThrow('Event fee cannot be negative');
    });
  });

  describe('updateEvent', () => {
    it('should update an event and notify attendees', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const existingEvent: Event = {
        eventId: 'event123',
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        registeredCount: 10,
        tags: ['tech'],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
        qrCodeData: 'QR_CODE',
        createdAt: now,
      };

      const updates = {
        name: 'Updated Event Name',
        description: 'Updated description',
      };

      const updatedEvent: Event = {
        ...existingEvent,
        ...updates,
      };

      mockEventRepository.getEventById.mockResolvedValueOnce(existingEvent);
      mockEventRepository.updateEvent.mockResolvedValue(undefined);
      mockEventRepository.getEventById.mockResolvedValueOnce(updatedEvent);

      const result = await eventService.updateEvent('event123', updates);

      expect(result).toEqual(updatedEvent);
      expect(mockEventRepository.updateEvent).toHaveBeenCalledWith('event123', updates);
    });

    it('should throw error if event not found', async () => {
      mockEventRepository.getEventById.mockResolvedValue(null);

      await expect(eventService.updateEvent('nonexistent', { name: 'New Name' })).rejects.toThrow(EventValidationError);
      await expect(eventService.updateEvent('nonexistent', { name: 'New Name' })).rejects.toThrow('Event with ID nonexistent not found');
    });

    it('should validate dates when updating start or end time', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');
      const pastTime = createTimestamp('2024-06-01T09:00:00Z');

      const existingEvent: Event = {
        eventId: 'event123',
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        registeredCount: 10,
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
        qrCodeData: 'QR_CODE',
        createdAt: now,
      };

      mockEventRepository.getEventById.mockResolvedValue(existingEvent);

      // Try to update end time to before start time
      await expect(eventService.updateEvent('event123', { endTime: pastTime })).rejects.toThrow(EventValidationError);
      await expect(eventService.updateEvent('event123', { endTime: pastTime })).rejects.toThrow('Event end time must be after start time');
    });

    it('should validate capacity when updating', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const existingEvent: Event = {
        eventId: 'event123',
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        registeredCount: 10,
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
        qrCodeData: 'QR_CODE',
        createdAt: now,
      };

      mockEventRepository.getEventById.mockResolvedValue(existingEvent);

      // Try to update capacity to invalid value
      await expect(eventService.updateEvent('event123', { capacity: -5 })).rejects.toThrow(EventValidationError);
      await expect(eventService.updateEvent('event123', { capacity: -5 })).rejects.toThrow('Event capacity must be a positive number');
    });
  });

  describe('cancelEvent', () => {
    it('should cancel an event and notify attendees', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const existingEvent: Event = {
        eventId: 'event123',
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        registeredCount: 10,
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
        qrCodeData: 'QR_CODE',
        createdAt: now,
      };

      const cancelledEvent: Event = {
        ...existingEvent,
        status: EventStatus.CANCELLED,
      };

      mockEventRepository.getEventById.mockResolvedValueOnce(existingEvent);
      mockEventRepository.updateEvent.mockResolvedValue(undefined);
      mockEventRepository.getEventById.mockResolvedValueOnce(cancelledEvent);

      const result = await eventService.cancelEvent('event123');

      expect(result.status).toBe(EventStatus.CANCELLED);
      expect(mockEventRepository.updateEvent).toHaveBeenCalledWith('event123', {
        status: EventStatus.CANCELLED,
      });
    });

    it('should throw error if event not found', async () => {
      mockEventRepository.getEventById.mockResolvedValue(null);

      await expect(eventService.cancelEvent('nonexistent')).rejects.toThrow(EventValidationError);
      await expect(eventService.cancelEvent('nonexistent')).rejects.toThrow('Event with ID nonexistent not found');
    });
  });

  describe('addTags', () => {
    it('should add tags to an event', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const existingEvent: Event = {
        eventId: 'event123',
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        registeredCount: 10,
        tags: ['tech'],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
        qrCodeData: 'QR_CODE',
        createdAt: now,
      };

      const updatedEvent: Event = {
        ...existingEvent,
        tags: ['tech', 'workshop', 'beginner'],
      };

      mockEventRepository.getEventById.mockResolvedValueOnce(existingEvent);
      mockEventRepository.updateEvent.mockResolvedValue(undefined);
      mockEventRepository.getEventById.mockResolvedValueOnce(updatedEvent);

      const result = await eventService.addTags('event123', ['workshop', 'beginner']);

      expect(result.tags).toContain('tech');
      expect(result.tags).toContain('workshop');
      expect(result.tags).toContain('beginner');
    });

    it('should not add duplicate tags', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const existingEvent: Event = {
        eventId: 'event123',
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        registeredCount: 10,
        tags: ['tech', 'workshop'],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
        qrCodeData: 'QR_CODE',
        createdAt: now,
      };

      const updatedEvent: Event = {
        ...existingEvent,
        tags: ['tech', 'workshop', 'beginner'],
      };

      mockEventRepository.getEventById.mockResolvedValueOnce(existingEvent);
      mockEventRepository.updateEvent.mockResolvedValue(undefined);
      mockEventRepository.getEventById.mockResolvedValueOnce(updatedEvent);

      await eventService.addTags('event123', ['tech', 'beginner']); // 'tech' is duplicate

      expect(mockEventRepository.updateEvent).toHaveBeenCalledWith('event123', {
        tags: expect.arrayContaining(['tech', 'workshop', 'beginner']),
      });
    });
  });

  describe('removeTags', () => {
    it('should remove tags from an event', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const existingEvent: Event = {
        eventId: 'event123',
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        registeredCount: 10,
        tags: ['tech', 'workshop', 'beginner'],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
        qrCodeData: 'QR_CODE',
        createdAt: now,
      };

      const updatedEvent: Event = {
        ...existingEvent,
        tags: ['tech'],
      };

      mockEventRepository.getEventById.mockResolvedValueOnce(existingEvent);
      mockEventRepository.updateEvent.mockResolvedValue(undefined);
      mockEventRepository.getEventById.mockResolvedValueOnce(updatedEvent);

      const result = await eventService.removeTags('event123', ['workshop', 'beginner']);

      expect(result.tags).toEqual(['tech']);
      expect(result.tags).not.toContain('workshop');
      expect(result.tags).not.toContain('beginner');
    });
  });

  describe('updateEventType', () => {
    it('should update event type', async () => {
      const now = createTimestamp('2024-06-01T10:00:00Z');
      const futureTime = createTimestamp('2024-06-01T12:00:00Z');

      const existingEvent: Event = {
        eventId: 'event123',
        clubId: 'club123',
        name: 'Test Event',
        description: 'A test event',
        type: EventType.WORKSHOP,
        startTime: now,
        endTime: futureTime,
        venueId: 'venue123',
        capacity: 50,
        registeredCount: 10,
        tags: [],
        fee: 0,
        status: EventStatus.ACTIVE,
        location: 'Test Location',
        qrCodeData: 'QR_CODE',
        createdAt: now,
      };

      const updatedEvent: Event = {
        ...existingEvent,
        type: EventType.SEMINAR,
      };

      mockEventRepository.getEventById.mockResolvedValueOnce(existingEvent);
      mockEventRepository.updateEvent.mockResolvedValue(undefined);
      mockEventRepository.getEventById.mockResolvedValueOnce(updatedEvent);

      const result = await eventService.updateEventType('event123', EventType.SEMINAR);

      expect(result.type).toBe(EventType.SEMINAR);
      expect(mockEventRepository.updateEvent).toHaveBeenCalledWith('event123', { type: EventType.SEMINAR });
    });
  });
});
