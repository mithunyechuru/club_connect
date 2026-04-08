import { Timestamp } from 'firebase/firestore';
import { eventRepository } from '../repositories/eventRepository';
import { userRepository } from '../repositories/userRepository';
import { clubRepository } from '../repositories/clubRepository';
import { Event, User, EventStatus } from '../types';

/**
 * Recommendation score for an event
 */
export interface EventRecommendation {
  event: Event;
  score: number;
  reason: string[];
}

/**
 * Service for generating personalized event recommendations
 * Analyzes student interests, past participation, and club memberships
 */
export class EventRecommendationEngine {
  /**
   * Generate personalized event recommendations for a student
   * @param studentId - The ID of the student
   * @param limit - Maximum number of recommendations to return (default: 10)
   * @returns Promise<EventRecommendation[]> Array of recommended events with scores
   */
  async generateRecommendations(studentId: string, limit: number = 10): Promise<EventRecommendation[]> {
    // Get student data
    const student = await userRepository.getUserById(studentId);
    if (!student) {
      throw new Error(`Student with ID ${studentId} not found`);
    }

    // Get student's clubs
    const studentClubs = await clubRepository.getClubsByMember(studentId);
    const studentClubIds = new Set(studentClubs.map(club => club.clubId));

    // Get all upcoming active events
    const upcomingEvents = await eventRepository.getUpcomingEvents({});

    // Score each event
    const recommendations: EventRecommendation[] = [];

    for (const event of upcomingEvents.events) {
      const { score, reasons } = this.scoreEvent(event, student, studentClubIds);

      if (score > 0) {
        recommendations.push({
          event,
          score,
          reason: reasons,
        });
      }
    }

    // Sort by score (highest first) and limit results
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(0, limit);
  }

  /**
   * Score an event for a student based on various factors
   * @param event - The event to score
   * @param student - The student
   * @param studentClubIds - Set of club IDs the student is a member of
   * @returns Object with score and reasons
   */
  private scoreEvent(
    event: Event,
    student: User,
    studentClubIds: Set<string>
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Event from student's club (highest priority)
    if (studentClubIds.has(event.clubId)) {
      score += 100;
      reasons.push('From your club');
    }

    // Factor 2: Interest matching
    const interests = student.profile.interests || [];
    const matchingInterests = this.matchInterests(event, interests);
    if (matchingInterests.length > 0) {
      score += matchingInterests.length * 20;
      reasons.push(`Matches interests: ${matchingInterests.join(', ')}`);
    }

    // Factor 3: Event type preference (based on interests)
    const typeScore = this.scoreEventType(event, interests);
    if (typeScore > 0) {
      score += typeScore;
      reasons.push('Matches your event type preferences');
    }

    // Factor 4: Event tags matching interests
    const matchingTags = this.matchTags(event, interests);
    if (matchingTags.length > 0) {
      score += matchingTags.length * 10;
      reasons.push(`Relevant tags: ${matchingTags.join(', ')}`);
    }

    // Factor 5: Event capacity (prefer events with available spots)
    if (event.registeredCount < event.capacity) {
      const availabilityRatio = (event.capacity - event.registeredCount) / event.capacity;
      score += availabilityRatio * 5;
      if (availabilityRatio > 0.5) {
        reasons.push('Plenty of spots available');
      }
    }

    // Factor 6: Event timing (prefer events happening soon but not too soon)
    const timingScore = this.scoreEventTiming(event);
    score += timingScore;

    return { score, reasons };
  }

  /**
   * Match event content with student interests
   * @param event - The event
   * @param interests - Student's interests
   * @returns Array of matching interests
   */
  private matchInterests(event: Event, interests: string[]): string[] {
    const matching: string[] = [];
    const eventText = `${event.name} ${event.description}`.toLowerCase();

    for (const interest of interests) {
      const interestLower = interest.toLowerCase();
      if (eventText.includes(interestLower)) {
        matching.push(interest);
      }
    }

    return matching;
  }

  /**
   * Score event type based on student interests
   * @param event - The event
   * @param interests - Student's interests
   * @returns Score for event type
   */
  private scoreEventType(event: Event, interests: string[]): number {
    const interestsLower = interests.map(i => i.toLowerCase());
    const eventType = event.type.toLowerCase();

    // Map event types to related interests
    const typeInterestMap: Record<string, string[]> = {
      workshop: ['learning', 'education', 'skill', 'training', 'development'],
      hackathon: ['coding', 'programming', 'technology', 'software', 'development', 'tech'],
      seminar: ['learning', 'education', 'knowledge', 'academic', 'research'],
      social_gathering: ['social', 'networking', 'community', 'friends', 'fun'],
      meeting: ['organization', 'planning', 'leadership', 'management'],
      competition: ['competitive', 'challenge', 'contest', 'sports', 'gaming'],
    };

    const relatedInterests = typeInterestMap[eventType] || [];

    for (const interest of interestsLower) {
      for (const related of relatedInterests) {
        if (interest.includes(related) || related.includes(interest)) {
          return 15;
        }
      }
    }

    return 0;
  }

  /**
   * Match event tags with student interests
   * @param event - The event
   * @param interests - Student's interests
   * @returns Array of matching tags
   */
  private matchTags(event: Event, interests: string[]): string[] {
    const matching: string[] = [];
    const interestsLower = interests.map(i => i.toLowerCase());

    for (const tag of event.tags) {
      const tagLower = tag.toLowerCase();
      for (const interest of interestsLower) {
        if (tagLower.includes(interest) || interest.includes(tagLower)) {
          matching.push(tag);
          break;
        }
      }
    }

    return matching;
  }

  /**
   * Score event based on timing
   * @param event - The event
   * @returns Timing score
   */
  private scoreEventTiming(event: Event): number {
    const now = Date.now();
    const eventTime = this.getTimestampMillis(event.startTime);
    const daysUntilEvent = (eventTime - now) / (1000 * 60 * 60 * 24);

    // Prefer events 3-14 days away
    if (daysUntilEvent >= 3 && daysUntilEvent <= 14) {
      return 10;
    }
    // Events 1-3 days away
    else if (daysUntilEvent >= 1 && daysUntilEvent < 3) {
      return 5;
    }
    // Events 14-30 days away
    else if (daysUntilEvent > 14 && daysUntilEvent <= 30) {
      return 3;
    }
    // Events more than 30 days away
    else if (daysUntilEvent > 30) {
      return 1;
    }

    return 0;
  }

  /**
   * Helper to get milliseconds from a Timestamp
   * @param timestamp - Firestore Timestamp
   * @returns Milliseconds since epoch
   */
  private getTimestampMillis(timestamp: Timestamp): number {
    if (typeof timestamp.toMillis === 'function') {
      return timestamp.toMillis();
    }
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().getTime();
    }
    // Fallback for test mocks
    if (timestamp.seconds !== undefined) {
      return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
    }
    throw new Error('Invalid timestamp format');
  }

  /**
   * Get recommendations for events from student's clubs
   * @param studentId - The ID of the student
   * @param limit - Maximum number of recommendations to return (default: 5)
   * @returns Promise<Event[]> Array of events from student's clubs
   */
  async getClubEventRecommendations(studentId: string, limit: number = 5): Promise<Event[]> {
    // Get student's clubs
    const studentClubs = await clubRepository.getClubsByMember(studentId);

    if (studentClubs.length === 0) {
      return [];
    }

    // Get upcoming events from all student's clubs
    const clubEvents: Event[] = [];

    for (const club of studentClubs) {
      const events = await eventRepository.getEventsByClub(club.clubId);

      // Filter for upcoming active events
      const upcomingEvents = events.filter(event => {
        if (event.status !== EventStatus.ACTIVE) {
          return false;
        }

        const eventTime = this.getTimestampMillis(event.startTime);
        return eventTime > Date.now();
      });

      clubEvents.push(...upcomingEvents);
    }

    // Sort by start time (soonest first)
    clubEvents.sort((a, b) => {
      const aTime = this.getTimestampMillis(a.startTime);
      const bTime = this.getTimestampMillis(b.startTime);
      return aTime - bTime;
    });

    return clubEvents.slice(0, limit);
  }

  /**
   * Update recommendations when a new event is created
   * This method can be called by the event service when a new event is created
   * @param eventId - The ID of the newly created event
   * @returns Promise<void>
   */
  async updateRecommendationsForNewEvent(eventId: string): Promise<void> {
    // Get the event
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    // Get all members of the club that created the event
    const club = await clubRepository.getClubById(event.clubId);
    if (!club) {
      throw new Error(`Club with ID ${event.clubId} not found`);
    }

    // In a real implementation, this would:
    // 1. Invalidate cached recommendations for all club members
    // 2. Optionally pre-compute recommendations for active users
    // 3. Send notifications to highly-matched users

    // For now, we'll just log that recommendations should be updated
    console.log(`Recommendations updated for ${club.memberIds.length} members due to new event: ${event.name}`);

    // Note: In a production system, you might:
    // - Use a job queue to process recommendation updates asynchronously
    // - Cache recommendations in Redis or similar
    // - Use Firebase Cloud Functions to trigger updates
    // - Send push notifications to users with high match scores
  }
}

export const eventRecommendationEngine = new EventRecommendationEngine();
