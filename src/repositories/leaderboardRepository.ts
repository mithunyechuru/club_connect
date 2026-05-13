import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { LeaderboardEntry, User } from '../types';

export class LeaderboardRepository {
  private readonly usersCollection = 'users';

  async getTopStudents(timeframe: 'WEEKLY' | 'MONTHLY' | 'OVERALL' = 'OVERALL', limitCount: number = 50): Promise<LeaderboardEntry[]> {
    try {
      // In a real app, WEEKLY and MONTHLY would use a separate collection or aggregated scores
      // For this implementation, we will use totalPoints from the users collection for OVERALL
      // and filter by createdAt for recent users (as a simplification)
      
      let q = query(
        collection(db, this.usersCollection),
        orderBy('totalPoints', 'desc'),
        limit(limitCount)
      );

      // Simple timeframe logic for demonstration
      if (timeframe !== 'OVERALL') {
        const now = new Date();
        const pastDate = new Date();
        if (timeframe === 'WEEKLY') pastDate.setDate(now.getDate() - 7);
        if (timeframe === 'MONTHLY') pastDate.setMonth(now.getMonth() - 1);
        
        // This is a simplification. Ideally you'd have a 'weeklyPoints' field.
        // We will just fetch top users who were active in this timeframe.
        q = query(
          collection(db, this.usersCollection),
          where('lastLogin', '>=', Timestamp.fromDate(pastDate)),
          orderBy('totalPoints', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc, index) => {
        const data = doc.data() as User;
        return {
          userId: doc.id,
          userName: `${data.profile.firstName} ${data.profile.lastName}`,
          userAvatar: data.photoURL,
          participationScore: data.totalPoints || 0,
          eventsAttended: data.eventsAttendedCount || 0,
          badgesEarned: data.badgesEarnedCount || 0,
          rank: index + 1,
        };
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  async searchLeaderboard(searchTerm: string): Promise<LeaderboardEntry[]> {
    try {
      // Basic search by fetching and filtering (Firestore limited search capabilities)
      const q = query(
        collection(db, this.usersCollection),
        orderBy('totalPoints', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map((doc, index) => {
        const data = doc.data() as User;
        return {
          userId: doc.id,
          userName: `${data.profile.firstName} ${data.profile.lastName}`,
          userAvatar: data.photoURL,
          participationScore: data.totalPoints || 0,
          eventsAttended: data.eventsAttendedCount || 0,
          badgesEarned: data.badgesEarnedCount || 0,
          rank: index + 1,
        };
      });

      return results.filter(entry => 
        entry.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching leaderboard:', error);
      throw error;
    }
  }
}

export const leaderboardRepository = new LeaderboardRepository();
