import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
    arrayUnion,
} from 'firebase/firestore';
import { dbConnectionManager } from '../services/databaseConnectionManager';
import { ForumThread, ForumReply } from '../types';

/**
 * Service for managing club forums
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4
 */
export class ForumService {
    private readonly threadCollection = 'forumThreads';
    private readonly replyCollection = 'forumReplies';

    /**
     * Create a new forum thread
     */
    async createThread(clubId: string, authorId: string, title: string, content: string): Promise<ForumThread> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const threadData: Omit<ForumThread, 'threadId'> = {
                clubId,
                authorId,
                title,
                content,
                isPinned: false,
                replyIds: [],
                createdAt: Timestamp.now(),
                lastActivityAt: Timestamp.now(),
            };

            const docRef = await addDoc(collection(connection, this.threadCollection), threadData);
            return { threadId: docRef.id, ...threadData } as ForumThread;
        });
    }

    /**
     * Post a reply to a thread
     */
    async postReply(threadId: string, authorId: string, content: string): Promise<ForumReply> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const replyData: Omit<ForumReply, 'replyId'> = {
                threadId,
                authorId,
                content,
                createdAt: Timestamp.now(),
            };

            const replyRef = await addDoc(collection(connection, this.replyCollection), replyData);
            const replyId = replyRef.id;

            // Update thread's reply list and last activity
            const threadRef = doc(connection, this.threadCollection, threadId);
            await updateDoc(threadRef, {
                replyIds: arrayUnion(replyId),
                lastActivityAt: Timestamp.now(),
            });

            return { replyId, ...replyData } as ForumReply;
        });
    }

    /**
     * Get all threads for a club, sorted by pin status and activity
     */
    async getClubThreads(clubId: string): Promise<ForumThread[]> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const q = query(
                collection(connection, this.threadCollection),
                where('clubId', '==', clubId),
                orderBy('isPinned', 'desc'),
                orderBy('lastActivityAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                threadId: doc.id,
                ...doc.data(),
            } as ForumThread));
        });
    }

    /**
     * Pin or unpin a thread
     */
    async setThreadPinned(threadId: string, isPinned: boolean): Promise<void> {
        return dbConnectionManager.executeWithRetry(async (connection) => {
            const threadRef = doc(connection, this.threadCollection, threadId);
            await updateDoc(threadRef, { isPinned });
        });
    }
}

export const forumService = new ForumService();
