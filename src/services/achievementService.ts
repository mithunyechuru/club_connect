import { userRepository } from '../repositories/userRepository';
import { badgeRepository } from '../repositories/badgeRepository';
import { certificateRepository } from '../repositories/certificateRepository';
import { eventRepository } from '../repositories/eventRepository';
import { 
  POINT_VALUES, 
  BadgeType, 
  Timestamp, 
  Certificate 
} from '../types';

export class AchievementService {
  /**
   * Award points to a user and check for potential badges
   */
  async awardPoints(userId: string, action: keyof typeof POINT_VALUES): Promise<void> {
    try {
      const user = await userRepository.getUserById(userId);
      if (!user) return;

      const pointsToAdd = POINT_VALUES[action];
      const newTotalPoints = (user.totalPoints || 0) + pointsToAdd;
      
      const updates: any = {
        totalPoints: newTotalPoints,
      };

      if (action === 'ATTENDANCE') {
        updates.eventsAttendedCount = (user.eventsAttendedCount || 0) + 1;
      }

      await userRepository.updateUser(userId, updates);
      
      // Check for badges after updating points/counts
      await this.checkForBadges(userId);
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  }

  /**
   * Check if user qualifies for any new badges
   */
  async checkForBadges(userId: string): Promise<void> {
    try {
      const user = await userRepository.getUserById(userId);
      if (!user) return;

      const availableBadges = await badgeRepository.getAllAvailableBadges();
      const userBadges = await badgeRepository.getUserBadges(userId);
      const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

      for (const badge of availableBadges) {
        if (earnedBadgeIds.has(badge.badgeId)) continue;

        let qualifies = false;
        if (badge.type === BadgeType.ATTENDANCE_MILESTONE) {
          if ((user.eventsAttendedCount || 0) >= badge.requiredCount) {
            qualifies = true;
          }
        }
        // Add more badge type checks here as needed

        if (qualifies) {
          await badgeRepository.awardBadge(userId, badge.badgeId);
          // Award points for earning a badge
          await this.awardPoints(userId, 'BADGE_EARNED');
          
          // Increment badge count in user profile
          await userRepository.updateUser(userId, {
            badgesEarnedCount: (user.badgesEarnedCount || 0) + 1
          });
        }
      }
    } catch (error) {
      console.error('Error checking for badges:', error);
    }
  }

  /**
   * Generate a certificate for a user for a specific event
   */
  async generateCertificate(userId: string, eventId: string): Promise<Certificate | null> {
    try {
      const user = await userRepository.getUserById(userId);
      const event = await eventRepository.getEventById(eventId);
      
      if (!user || !event) return null;

      const certificateData: Omit<Certificate, 'certificateId'> = {
        studentId: userId,
        eventId: eventId,
        studentName: `${user.profile.firstName} ${user.profile.lastName}`,
        eventName: event.name,
        eventDate: event.startTime,
        organizerSignature: event.clubName || 'University Club',
        generatedAt: Timestamp.now(),
        pdfUrl: '', // This would be populated after actual PDF generation/upload
      };

      return await certificateRepository.saveCertificate(certificateData);
    } catch (error) {
      console.error('Error generating certificate:', error);
      return null;
    }
  }
}

export const achievementService = new AchievementService();
