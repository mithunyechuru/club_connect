import { eventRepository } from '../repositories/eventRepository';
import { clubRepository } from '../repositories/clubRepository';
import { Event, Club, EventType, EventStatus } from '../types';

/**
 * Service for unified search and discovery
 */
export class SearchService {
    /**
     * Search for clubs and events based on a query string
     * @param query - The search term
     * @returns Promise<{ clubs: Club[], events: Event[] }>
     */
    async globalSearch(query: string): Promise<{ clubs: Club[], events: Event[] }> {
        if (!query.trim()) {
            return { clubs: [], events: [] };
        }

        const [clubs, events] = await Promise.all([
            clubRepository.searchClubsByName(query),
            eventRepository.searchEventsByName(query)
        ]);

        return { clubs, events };
    }

    /**
     * Discover events with advanced filtering
     * @param filters - Filtering options
     * @returns Promise<Event[]>
     */
    async discoverEvents(filters: {
        type?: EventType;
        status?: EventStatus;
        tags?: string[];
        clubId?: string;
    }): Promise<Event[]> {
        const { events } = await eventRepository.queryEvents({
            type: filters.type,
            status: filters.status,
            tags: filters.tags,
            clubId: filters.clubId,
            pageSize: 50 // Fetch a larger set for discovery
        });

        return events;
    }

    /**
     * Discover clubs by category
     * @param category - Club category (e.g., 'Sports', 'Tech')
     * @returns Promise<Club[]>
     */
    async discoverClubsByCategory(category: string): Promise<Club[]> {
        const allClubs = await clubRepository.getAllClubs();
        return allClubs.filter(club => club.category === category);
    }

    /**
     * Get trending tags from recent events
     * @returns Promise<string[]>
     */
    async getTrendingTags(): Promise<string[]> {
        const allEvents = await eventRepository.getAllEvents();
        const tagCounts: Record<string, number> = {};

        allEvents.forEach(event => {
            event.tags?.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        return Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([tag]) => tag);
    }
}

export const searchService = new SearchService();
