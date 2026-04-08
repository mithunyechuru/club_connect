import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    Timestamp,
    limit,
} from 'firebase/firestore';
import { dbConnectionManager } from '../services/databaseConnectionManager';
import { DirectMessage, BlockedUser } from '../types';

/**
 * Service for direct messaging between users
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4
 */
export class DirectMessageService {
    private readonly messageCollection = 'directMessages';
    private readonly blockCollection = 'blockedUsers';

    /**
     * Send a direct message
     */
    async sendMessage(senderId: string, recipientId: string, content: string): Promise<DirectMessage> {
        // 1. Check if blocked
        const isBlocked = await this.isBlocked(recipientId, senderId);
        if (isBlocked) {
            throw new Error('You cannot send messages to this user.');
        }

        return dbConnectionManager.executeWithRetry(async (connection) => {
            const messageData: Omit<DirectMessage, 'messageId'> = {
                senderId,
                recipientId,
                content,
                isRead: false,
                sentAt: Timestamp.now(),
            };

            const docRef = await addDoc(collection(connection, this.messageCollection), messageData);
            return { messageId: docRef.id, ...messageData } as DirectMessage;
        });
    }

    /**
     * Get message history between two users
     */
    async getMessageHistory(userId1: string, userId2: string, pageSize: number = 50): Promise<DirectMessage[]> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            // In Firestore, we need to query for both directions
            const q1 = query(
                collection(connection, this.messageCollection),
                where('senderId', '==', userId1),
                where('recipientId', '==', userId2),
                orderBy('sentAt', 'desc'),
                limit(pageSize)
            );

            const q2 = query(
                collection(connection, this.messageCollection),
                where('senderId', '==', userId2),
                where('recipientId', '==', userId1),
                orderBy('sentAt', 'desc'),
                limit(pageSize)
            );

            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            const allMessages = [
                ...snap1.docs.map(d => ({ messageId: d.id, ...d.data() } as DirectMessage)),
                ...snap2.docs.map(d => ({ messageId: d.id, ...d.data() } as DirectMessage))
            ].sort((a, b) => (b.sentAt as Timestamp).toMillis() - (a.sentAt as Timestamp).toMillis());

            return allMessages.slice(0, pageSize);
        });
    }

    /**
     * Block a user
     */
    async blockUser(blockerId: string, blockedUserId: string): Promise<void> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const blockData: Omit<BlockedUser, 'blockId'> = {
                blockerId,
                blockedUserId,
                blockedAt: Timestamp.now(),
            };

            await addDoc(collection(connection, this.blockCollection), blockData);
        });
    }

    /**
     * Check if user is blocked
     */
    async isBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const q = query(
                collection(connection, this.blockCollection),
                where('blockerId', '==', blockerId),
                where('blockedUserId', '==', blockedUserId),
                limit(1)
            );

            const snap = await getDocs(q);
            return !snap.empty;
        });
    }
}

export const directMessageService = new DirectMessageService();
