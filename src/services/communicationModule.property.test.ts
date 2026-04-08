import fc from 'fast-check';
import { Timestamp } from 'firebase/firestore';
import { notificationService } from './notificationService';
import { directMessageService } from './directMessageService';
import { qrCodeScanner } from './qrCodeScanner';
import { notificationRepository } from '../repositories/notificationRepository';
import { eventRepository } from '../repositories/eventRepository';

// Mock Firebase and Repositories
jest.mock('firebase/firestore', () => ({
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn((d) => ({ toDate: () => d, toMillis: () => d.getTime() })),
    },
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
    orderBy: jest.fn(),
    writeBatch: jest.fn(),
    arrayUnion: jest.fn(),
}));

jest.mock('./firebase', () => ({
    db: {},
    realtimeDb: {},
}));

jest.mock('../repositories/notificationRepository');
jest.mock('../repositories/attendanceRepository');
jest.mock('../repositories/eventRepository');
jest.mock('../repositories/clubRepository');
jest.mock('../repositories/rsvpRepository');
jest.mock('../repositories/userRepository');

describe('Communication Module Property Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Property 65: Notification Grouping logic
    // Validates: Requirements 29.4
    describe('Property 65: Notification Grouping', () => {
        it('should return correct unread count for grouping', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
                    async (readStatuses) => {
                        const userId = 'test-user';
                        const mockNotifications = readStatuses.map((isRead, i) => ({
                            notificationId: `n-${i}`,
                            isRead,
                        }));

                        (notificationRepository.getNotificationsByUser as jest.Mock).mockResolvedValue({
                            notifications: mockNotifications,
                            lastDoc: null
                        });

                        const count = await notificationService.getUnreadCount(userId);
                        const expected = readStatuses.filter(r => !r).length;
                        expect(count).toBe(expected);
                    }
                )
            );
        });
    });

    // Property 29: Message Blocking Property
    // Validates: Requirements 12.1
    describe('Property 29: Message Blocking', () => {
        it('should never allow sending messages to a user who has blocked the sender', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.uuid(), fc.uuid(),
                    async (senderId, recipientId) => {
                        if (senderId === recipientId) return true;

                        // Mock recipient blocking sender
                        (directMessageService.isBlocked as any) = jest.fn().mockImplementation((blocker, blocked) => {
                            return blocker === recipientId && blocked === senderId;
                        });

                        await expect(directMessageService.sendMessage(senderId, recipientId, "Hello"))
                            .rejects.toThrow('cannot send messages');

                        return true;
                    }
                )
            );
        });
    });

    // Property 32: QR Code Attendance Validity
    // Validates: Requirements 14.2
    describe('Property 32: QR Code Attendance', () => {
        it('should reject attendance log if event is not today', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 2, max: 365 }), // Days from today
                    fc.boolean(), // Future or past
                    async (days, isFuture) => {
                        const eventDate = new Date();
                        const offset = days * 24 * 60 * 60 * 1000;
                        eventDate.setTime(eventDate.getTime() + (isFuture ? offset : -offset));

                        const eventId = 'event-1';
                        const studentId = 'student-1';

                        (eventRepository.getEventById as jest.Mock).mockResolvedValue({
                            eventId,
                            startTime: Timestamp.fromDate(eventDate)
                        });

                        await expect(qrCodeScanner.processScan(`${eventId}:token`, studentId))
                            .rejects.toThrow('not scheduled for today');

                        return true;
                    }
                )
            );
        });
    });
});
