import { Badge, BadgeType, UserBadge } from '../types';
import { gamificationRepository } from '../repositories/gamificationRepository';
import { attendanceRepository } from '../repositories/attendanceRepository';
import { Timestamp } from 'firebase/firestore';

/**
 * Service for managing gamification logic (badges, leaderboards)
 */
export class GamificationService {
    /**
     * Check and award attendance-based badges for a user
     * @param userId - The ID of the user
     * @returns Promise<UserBadge[]> Any new badges awarded
     */
    async checkAttendanceBadges(userId: string): Promise<UserBadge[]> {
        try {
            // 1. Fetch user attendance records
            const attendance = await attendanceRepository.getAttendanceByUser(userId);
            const attendanceCount = attendance.length;

            // 2. Fetch all badge definitions
            const allBadges = await gamificationRepository.getAllBadges();
            const attendanceBadges = allBadges.filter(b => b.type === BadgeType.ATTENDANCE_MILESTONE);

            // 3. Fetch already earned badges
            const earnedBadges = await gamificationRepository.getUserBadges(userId);
            const earnedBadgeIds = new Set(earnedBadges.map(eb => eb.badgeId));

            // 4. Determine new badges to award
            const newBadgesAwarded: UserBadge[] = [];

            for (const badge of attendanceBadges) {
                if (attendanceCount >= badge.requiredCount && !earnedBadgeIds.has(badge.badgeId)) {
                    const newBadge: Omit<UserBadge, 'userBadgeId'> = {
                        userId,
                        badgeId: badge.badgeId,
                        earnedAt: Timestamp.now(),
                    };
                    const awarded = await gamificationRepository.awardBadge(newBadge);
                    newBadgesAwarded.push(awarded);
                }
            }

            // 5. Update leaderboard score (participation score += 10 per attendance)
            // This is a simplified score calculation
            // Fetch user name and update
            // await gamificationRepository.updateLeaderboardScore(userId, userName, score);

            return newBadgesAwarded;
        } catch (error) {
            console.error('Error checking attendance badges:', error);
            throw new Error('Failed to check and award badges');
        }
    }

    /**
     * Get all badges earned by a user
     * @param userId - The ID of the user
     * @returns Promise<Badge[]> The actual badge definitions for earned badges
     */
    async getUserBadgesWithDefinitions(userId: string): Promise<Badge[]> {
        try {
            const userBadges = await gamificationRepository.getUserBadges(userId);
            const allBadges = await gamificationRepository.getAllBadges();
            const badgeMap = new Map(allBadges.map(b => [b.badgeId, b]));

            return userBadges
                .map(ub => badgeMap.get(ub.badgeId))
                .filter((b): b is Badge => b !== undefined);
        } catch (error) {
            console.error('Error getting user badges with definitions:', error);
            throw new Error('Failed to get user badges');
        }
    }

    /**
     * Get the global leaderboard
     * @returns Promise
     */
    async getLeaderboard() {
        return gamificationRepository.getGlobalLeaderboard();
    }
}

export const gamificationService = new GamificationService();
