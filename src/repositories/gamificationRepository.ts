import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Badge, UserBadge, LeaderboardEntry } from '../types';

/**
 * Repository for managing Gamification entities in Firestore
 */
export class GamificationRepository {
    private readonly badgeCollection = 'badges';
    private readonly userBadgeCollection = 'userBadges';
    private readonly leaderboardCollection = 'leaderboards';

    /**
     * Get all badge definitions
     * @returns Promise<Badge[]>
     */
    async getAllBadges(): Promise<Badge[]> {
        try {
            const querySnapshot = await getDocs(collection(db, this.badgeCollection));
            return querySnapshot.docs.map(doc => ({
                badgeId: doc.id,
                ...doc.data(),
            } as Badge));
        } catch (error) {
            console.error('Error getting all badges:', error);
            throw new Error('Failed to get badges');
        }
    }

    /**
     * Award a badge to a user
     * @param userBadge - The user badge data (without userBadgeId)
     * @returns Promise<UserBadge>
     */
    async awardBadge(userBadge: Omit<UserBadge, 'userBadgeId'>): Promise<UserBadge> {
        try {
            const docRef = await addDoc(collection(db, this.userBadgeCollection), {
                ...userBadge,
                earnedAt: userBadge.earnedAt || Timestamp.now(),
            });

            return {
                userBadgeId: docRef.id,
                ...userBadge,
            } as UserBadge;
        } catch (error) {
            console.error('Error awarding badge:', error);
            throw new Error('Failed to award badge');
        }
    }

    /**
     * Get all badges earned by a user
     * @param userId - The ID of the user
     * @returns Promise<UserBadge[]>
     */
    async getUserBadges(userId: string): Promise<UserBadge[]> {
        try {
            const q = query(
                collection(db, this.userBadgeCollection),
                where('userId', '==', userId)
            );

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                userBadgeId: doc.id,
                ...doc.data(),
            } as UserBadge));
        } catch (error) {
            console.error('Error getting user badges:', error);
            throw new Error(`Failed to get badges for user ${userId}`);
        }
    }

    /**
     * Get the global leaderboard
     * @param limit - Optional limit for the number of entries
     * @returns Promise<LeaderboardEntry[]>
     */
    async getGlobalLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
        try {
            // In a real app, this would be a pre-calculated collection or an aggregate query
            // For this implementation, we'll fetch from a dedicated collection
            const q = query(
                collection(db, this.leaderboardCollection),
                orderBy('participationScore', 'desc'),
                where('rank', '<=', limit)
            );

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                ...doc.data(),
            } as LeaderboardEntry));
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw new Error('Failed to get leaderboard');
        }
    }

    /**
     * Update a user's leaderboard score
     * @param category - The category for the leaderboard score
     * @param score - The new participation score
     * @returns Promise<void>
     */
    async updateLeaderboardScore(_category: string, _score: number): Promise<void> {
        try {
            // Logic for updating/upserting leaderboard entry
            // This is simplified for implementation
            // setDoc or updateDoc depending on if it exists
        } catch (error) {
            console.error('Error updating leaderboard score:', error);
        }
    }
}

export const gamificationRepository = new GamificationRepository();
