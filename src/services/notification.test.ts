import { notificationRepository } from '../repositories/notificationRepository';
import { notificationService } from './notificationService';
import { Timestamp, NotificationType } from '../types';

jest.mock('./firebase', () => ({
    db: {},
    realtimeDb: {},
}));

jest.mock('firebase/database', () => ({
    ref: jest.fn(),
    set: jest.fn(),
    serverTimestamp: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
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
    writeBatch: jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn(),
    })),
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn((d) => ({ toDate: () => d })),
    },
}));

import { addDoc, getDoc } from 'firebase/firestore';

describe('Notification Service & Repository', () => {
    const userId = 'user-1';
    const notificationId = 'notif-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('NotificationRepository', () => {
        it('should create a notification', async () => {
            (addDoc as jest.Mock).mockResolvedValue({ id: notificationId });

            const res = await notificationRepository.createNotification({
                userId,
                type: NotificationType.ANNOUNCEMENT,
                title: 'Title',
                message: 'Message',
                data: {},
                isRead: false,
                createdAt: Timestamp.now(),
                retryCount: 0,
            });

            expect(res.notificationId).toBe(notificationId);
        });

        it('should get notification by id', async () => {
            (getDoc as jest.Mock).mockResolvedValue({
                exists: () => true,
                id: notificationId,
                data: () => ({ userId, title: 'Title' }),
            });

            const res = await notificationRepository.getNotificationById(notificationId);
            expect(res?.notificationId).toBe(notificationId);
        });
    });

    describe('NotificationService', () => {
        it('should create and deliver notification', async () => {
            jest.spyOn(notificationRepository, 'createNotification').mockResolvedValue({
                notificationId,
                userId,
            } as any);

            const res = await notificationService.createNotification({
                userId,
                type: NotificationType.ANNOUNCEMENT,
                title: 'Title',
                message: 'Message',
            });

            expect(res.notificationId).toBe(notificationId);
        });
    });
});
