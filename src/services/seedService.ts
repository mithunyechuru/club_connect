import { clubRepository } from '../repositories/clubRepository';
import { eventRepository } from '../repositories/eventRepository';
import { userRepository } from '../repositories/userRepository';
import { venueRepository } from '../repositories/venueRepository';
import {
    UserRole,
    EventType,
    EventStatus,
    User,
    Club,
    Event as ClubEvent,
    Venue,
    ClubRole
} from '../types';
import { Timestamp } from 'firebase/firestore';

/**
 * Service to seed the database with initial sample data
 * USE ONLY FOR TESTING/DEMONSTRATION
 */
export class SeedService {
    /**
     * Seed a basic set of data for testing the UI
     */
    async seedInitialData(): Promise<void> {
        try {
            console.log('Seeding initial data...');

            // 1. Create a few Venues
            const venues: Venue[] = [
                {
                    venueId: 'v1',
                    name: 'Main Auditorium',
                    location: 'Building A, Floor 1',
                    capacity: 500,
                    equipment: ['Projector', 'Sound System', 'Stage Lights'],
                    features: ['Accessible'],
                    isAvailable: true
                },
                {
                    venueId: 'v2',
                    name: 'Tech Lab 101',
                    location: 'Building B, Floor 2',
                    capacity: 40,
                    equipment: ['Computers', 'Whiteboard'],
                    features: ['AC'],
                    isAvailable: true
                }
            ];

            for (const venue of venues) {
                await venueRepository.createVenue(venue);
            }

            // 2. Create an Admin User
            const admin: User = {
                userId: 'admin_id_001',
                email: 'admin@university.edu',
                passwordHash: 'hashed_pw', // In real system, this is handled by Auth
                role: UserRole.ADMINISTRATOR,
                profile: {
                    firstName: 'System',
                    lastName: 'Admin',
                    email: 'admin@university.edu'
                },
                preferences: {
                    emailNotifications: true,
                    pushNotifications: true,
                    eventReminders: true,
                    clubAnnouncements: true
                },
                createdAt: Timestamp.now(),
                lastLogin: Timestamp.now()
            };
            await userRepository.createUser(admin);

            // 3. Create a Club
            const club: Club = {
                clubId: 'c1',
                name: 'Tech Enthusiasts',
                description: 'A club for students passionate about software development and new technologies.',
                parentClubId: null,
                officerIds: ['admin_id_001'], // Admin is also an officer for seeding
                memberIds: ['admin_id_001'],
                memberRoles: {
                    'admin_id_001': ClubRole.PRESIDENT
                },
                managerId: null,
                documentIds: [],
                category: 'Tech',
                createdAt: Timestamp.now()
            };
            await clubRepository.createClub(club);

            // 4. Create an Event
            const event: ClubEvent = {
                eventId: 'e1',
                clubId: 'c1',
                name: 'Introduction to AI',
                description: 'An exciting workshop exploring the fundamentals of Artificial Intelligence.',
                type: EventType.WORKSHOP,
                startTime: Timestamp.fromDate(new Date(Date.now() + 86400000)), // Tomorrow
                endTime: Timestamp.fromDate(new Date(Date.now() + 86400000 + 7200000)), // 2 hours later
                venueId: 'v2',
                capacity: 30,
                registeredCount: 0,
                tags: ['AI', 'Tech', 'Workshop'],
                fee: 0,
                status: EventStatus.ACTIVE,
                location: 'Tech Lab 101',
                qrCodeData: 'event_e1_ai_workshop',
                createdAt: Timestamp.now()
            };
            await eventRepository.createEvent(event);

            console.log('Seeding complete successfully.');
        } catch (error) {
            console.error('Error during data seeding:', error);
            throw new Error('Failed to seed initial data');
        }
    }
}

export const seedService = new SeedService();
