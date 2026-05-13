import { Timestamp } from 'firebase/firestore';
import { EventRecommendationEngine } from './eventRecommendationEngine';
import { eventRepository } from '../repositories/eventRepository';
import { userRepository } from '../repositories/userRepository';
import { clubRepository } from '../repositories/clubRepository';
import { Event, User, Club, EventType, EventStatus, UserRole } from '../types';

// Mock the repositories
jest.mock('../repositories/eventRepository');
jest.mock('../repositories/userRepository');
jest.mock('../repositories/clubRepository');

describe('EventRecommendationEngine', () => {
  let engine: EventRecommendationEngine;
  let mockStudent: User;
  let mockClub: Club;
  let mockEvent: Event;

  beforeEach(() => {
    engine = new EventRecommendationEngine();
    jest.clearAllMocks();

    // Create mock student
    mockStudent = {
      userId: 'student1',
      email: 'student@test.com',
      passwordHash: 'hash',
      role: UserRole.STUDENT,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'student@test.com',
        interests: ['programming', 'technology', 'hackathons'],
      },
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        eventReminders: true,
        clubAnnouncements: true,
      },
      totalPoints: 0,
      eventsAttendedCount: 0,
      badgesEarnedCount: 0,
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
    };

    // Create mock club
    mockClub = {
      clubId: 'club1',
      name: 'Tech Club',
      description: 'A club for tech enthusiasts',
      parentClubId: null,
      officerIds: ['officer1'],
      memberIds: ['student1'],
      memberRoles: { student1: 'MEMBER' as any },
      managerId: null,
      documentIds: [],
      category: 'Tech',
      createdAt: Timestamp.now(),
    };

    // Create mock event
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

    mockEvent = {
      eventId: 'event1',
      clubId: 'club1',
      name: 'Programming Workshop',
      description: 'Learn advanced programming techniques',
      type: EventType.WORKSHOP,
      startTime: Timestamp.fromDate(futureDate),
      endTime: Timestamp.fromDate(new Date(futureDate.getTime() + 2 * 60 * 60 * 1000)),
      venueId: 'venue1',
      capacity: 50,
      registeredCount: 10,
      tags: ['programming', 'coding', 'workshop'],
      fee: 0,
      status: EventStatus.ACTIVE,
      location: 'Test Location',
      qrCodeData: 'qr-code-data',
      createdAt: Timestamp.now(),
    };
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for a student', async () => {
      // Setup mocks
      (userRepository.getUserById as jest.Mock).mockResolvedValue(mockStudent);
      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([mockClub]);
      (eventRepository.getUpcomingEvents as jest.Mock).mockResolvedValue({
        events: [mockEvent],
        lastDoc: null,
      });

      // Execute
      const recommendations = await engine.generateRecommendations('student1');

      // Verify
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].event).toEqual(mockEvent);
      expect(recommendations[0].score).toBeGreaterThan(0);
      expect(recommendations[0].reason).toContain('From your club');
    });

    it('should throw error if student not found', async () => {
      (userRepository.getUserById as jest.Mock).mockResolvedValue(null);

      await expect(engine.generateRecommendations('nonexistent')).rejects.toThrow(
        'Student with ID nonexistent not found'
      );
    });

    it('should prioritize events from student clubs', async () => {
      const nonClubEvent = {
        ...mockEvent,
        eventId: 'event2',
        clubId: 'club2',
        name: 'Other Event',
      };

      (userRepository.getUserById as jest.Mock).mockResolvedValue(mockStudent);
      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([mockClub]);
      (eventRepository.getUpcomingEvents as jest.Mock).mockResolvedValue({
        events: [mockEvent, nonClubEvent],
        lastDoc: null,
      });

      const recommendations = await engine.generateRecommendations('student1');

      // Club event should be ranked higher
      expect(recommendations[0].event.eventId).toBe('event1');
      expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);
    });

    it('should match events based on student interests', async () => {
      const matchingEvent = {
        ...mockEvent,
        eventId: 'event2',
        clubId: 'club2',
        name: 'Hackathon 2024',
        description: 'Annual hackathon event for programming enthusiasts',
        tags: ['hackathon', 'coding', 'technology'],
      };

      (userRepository.getUserById as jest.Mock).mockResolvedValue(mockStudent);
      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([]);
      (eventRepository.getUpcomingEvents as jest.Mock).mockResolvedValue({
        events: [matchingEvent],
        lastDoc: null,
      });

      const recommendations = await engine.generateRecommendations('student1');

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].score).toBeGreaterThan(0);
      // Should match interests (hackathons, programming, technology)
      const hasInterestMatch = recommendations[0].reason.some(r =>
        r.toLowerCase().includes('interest') || r.toLowerCase().includes('tag')
      );
      expect(hasInterestMatch).toBe(true);
    });

    it('should limit recommendations to specified limit', async () => {
      const events = Array.from({ length: 20 }, (_, i) => ({
        ...mockEvent,
        eventId: `event${i}`,
        name: `Event ${i}`,
      }));

      (userRepository.getUserById as jest.Mock).mockResolvedValue(mockStudent);
      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([mockClub]);
      (eventRepository.getUpcomingEvents as jest.Mock).mockResolvedValue({
        events,
        lastDoc: null,
      });

      const recommendations = await engine.generateRecommendations('student1', 5);

      expect(recommendations).toHaveLength(5);
    });

    it('should score events with available capacity higher', async () => {
      const fullEvent = {
        ...mockEvent,
        eventId: 'event2',
        clubId: 'club2',
        capacity: 10,
        registeredCount: 10,
      };

      const availableEvent = {
        ...mockEvent,
        eventId: 'event3',
        clubId: 'club3',
        capacity: 50,
        registeredCount: 5,
      };

      (userRepository.getUserById as jest.Mock).mockResolvedValue(mockStudent);
      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([]);
      (eventRepository.getUpcomingEvents as jest.Mock).mockResolvedValue({
        events: [fullEvent, availableEvent],
        lastDoc: null,
      });

      const recommendations = await engine.generateRecommendations('student1');

      // Event with more availability should score higher (all else being equal)
      const fullEventRec = recommendations.find(r => r.event.eventId === 'event2');
      const availableEventRec = recommendations.find(r => r.event.eventId === 'event3');

      expect(availableEventRec!.score).toBeGreaterThan(fullEventRec!.score);
    });

    it('should return empty array if no upcoming events', async () => {
      (userRepository.getUserById as jest.Mock).mockResolvedValue(mockStudent);
      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([mockClub]);
      (eventRepository.getUpcomingEvents as jest.Mock).mockResolvedValue({
        events: [],
        lastDoc: null,
      });

      const recommendations = await engine.generateRecommendations('student1');

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('getClubEventRecommendations', () => {
    it('should return events from student clubs', async () => {
      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([mockClub]);
      (eventRepository.getEventsByClub as jest.Mock).mockResolvedValue([mockEvent]);

      const recommendations = await engine.getClubEventRecommendations('student1');

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toEqual(mockEvent);
    });

    it('should return empty array if student has no clubs', async () => {
      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([]);

      const recommendations = await engine.getClubEventRecommendations('student1');

      expect(recommendations).toHaveLength(0);
    });

    it('should filter out past events', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

      const pastEvent = {
        ...mockEvent,
        eventId: 'event2',
        startTime: Timestamp.fromDate(pastDate),
      };

      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([mockClub]);
      (eventRepository.getEventsByClub as jest.Mock).mockResolvedValue([mockEvent, pastEvent]);

      const recommendations = await engine.getClubEventRecommendations('student1');

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].eventId).toBe('event1');
    });

    it('should filter out cancelled events', async () => {
      const cancelledEvent = {
        ...mockEvent,
        eventId: 'event2',
        status: EventStatus.CANCELLED,
      };

      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([mockClub]);
      (eventRepository.getEventsByClub as jest.Mock).mockResolvedValue([mockEvent, cancelledEvent]);

      const recommendations = await engine.getClubEventRecommendations('student1');

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].eventId).toBe('event1');
    });

    it('should sort events by start time', async () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 3);

      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 10);

      const event1 = {
        ...mockEvent,
        eventId: 'event1',
        startTime: Timestamp.fromDate(futureDate2),
      };

      const event2 = {
        ...mockEvent,
        eventId: 'event2',
        startTime: Timestamp.fromDate(futureDate1),
      };

      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([mockClub]);
      (eventRepository.getEventsByClub as jest.Mock).mockResolvedValue([event1, event2]);

      const recommendations = await engine.getClubEventRecommendations('student1');

      expect(recommendations[0].eventId).toBe('event2'); // Sooner event first
      expect(recommendations[1].eventId).toBe('event1');
    });

    it('should limit results to specified limit', async () => {
      const events = Array.from({ length: 10 }, (_, i) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i + 1);
        return {
          ...mockEvent,
          eventId: `event${i}`,
          startTime: Timestamp.fromDate(futureDate),
        };
      });

      (clubRepository.getClubsByMember as jest.Mock).mockResolvedValue([mockClub]);
      (eventRepository.getEventsByClub as jest.Mock).mockResolvedValue(events);

      const recommendations = await engine.getClubEventRecommendations('student1', 3);

      expect(recommendations).toHaveLength(3);
    });
  });

  describe('updateRecommendationsForNewEvent', () => {
    it('should update recommendations when new event is created', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(mockClub);

      await engine.updateRecommendationsForNewEvent('event1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recommendations updated for 1 members')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error if event not found', async () => {
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(null);

      await expect(engine.updateRecommendationsForNewEvent('nonexistent')).rejects.toThrow(
        'Event with ID nonexistent not found'
      );
    });

    it('should throw error if club not found', async () => {
      (eventRepository.getEventById as jest.Mock).mockResolvedValue(mockEvent);
      (clubRepository.getClubById as jest.Mock).mockResolvedValue(null);

      await expect(engine.updateRecommendationsForNewEvent('event1')).rejects.toThrow(
        'Club with ID club1 not found'
      );
    });
  });
});
