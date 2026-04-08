import {
  collection,
  doc,
  getDoc,
  Timestamp,
  query,
  where,
  limit,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { User, UserRole } from '../types';

/**
 * Repository for managing User entities in Firestore
 * Provides CRUD operations and query methods with pagination
 */
export class UserRepository {
  private readonly collectionName = 'users';
  private readonly adminCollectionName = 'admins';

  /**
   * Check if a UID exists in the admins collection
   * @param userId - The UID to check
   * @returns Promise<boolean>
   */
  async isAdminId(userId: string): Promise<boolean> {
    try {
      const adminDoc = await getDoc(doc(db, this.adminCollectionName, userId));
      return adminDoc.exists();
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get an admin record from the admins collection
   * @param userId - The UID of the admin
   * @returns Promise<any | null>
   */
  async getUserFromAdminsCollection(userId: string): Promise<any | null> {
    try {
      const adminDoc = await getDoc(doc(db, this.adminCollectionName, userId));
      if (!adminDoc.exists()) return null;
      return { userId: adminDoc.id, ...adminDoc.data() };
    } catch (error) {
      console.error('Error getting admin doc:', error);
      return null;
    }
  }

  /**
   * Get a user by their ID
   * @param userId - The unique identifier of the user
   * @returns Promise<User | null> The user if found, null otherwise
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, this.collectionName, userId));

      if (!userDoc.exists()) {
        return null;
      }

      return {
        userId: userDoc.id,
        ...userDoc.data(),
      } as User;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error(`Failed to get user with ID ${userId}`);
    }
  }

  /**
   * Get a user by their email address
   * @param email - The email address of the user
   * @returns Promise<User | null> The user if found, null otherwise
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('email', '==', email),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return {
        userId: userDoc.id,
        ...userDoc.data(),
      } as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error(`Failed to get user with email ${email}`);
    }
  }

  /**
   * Create a new user with a specific ID (usually from Firebase Auth)
   * @param userData - The user data including userId
   * @returns Promise<User> The created user
   */
  async createUser(userData: User): Promise<User> {
    try {
      const { userId, ...data } = userData;
      await setDoc(doc(db, this.collectionName, userId), {
        ...data,
        createdAt: data.createdAt || Timestamp.now(),
        lastLogin: data.lastLogin || Timestamp.now(),
      });

      return userData;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update an existing user
   * @param userId - The ID of the user to update
   * @param updates - Partial user data to update
   * @returns Promise<void>
   */
  async updateUser(userId: string, updates: Partial<Omit<User, 'userId'>>): Promise<void> {
    try {
      const userRef = doc(db, this.collectionName, userId);
      await updateDoc(userRef, updates);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user with ID ${userId}`);
    }
  }

  /**
   * Delete a user
   * @param userId - The ID of the user to delete
   * @returns Promise<void>
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user with ID ${userId}`);
    }
  }

  /**
   * Query users with pagination
   * @param pageSize - Number of users per page
   * @param lastDoc - Last document from previous page (for pagination)
   * @param role - Optional role filter
   * @returns Promise with users array and last document
   */
  async queryUsers(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot,
    role?: UserRole
  ): Promise<{ users: User[]; lastDoc: DocumentSnapshot | null }> {
    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (role) {
        q = query(
          collection(db, this.collectionName),
          where('role', '==', role),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      }

      if (lastDoc) {
        q = query(
          collection(db, this.collectionName),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );

        if (role) {
          q = query(
            collection(db, this.collectionName),
            where('role', '==', role),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(pageSize)
          );
        }
      }

      const querySnapshot = await getDocs(q);

      const users: User[] = querySnapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data(),
      } as User));

      const lastDocument = querySnapshot.docs.length > 0
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;

      return { users, lastDoc: lastDocument };
    } catch (error) {
      console.error('Error querying users:', error);
      throw new Error('Failed to query users');
    }
  }

  /**
   * Get all users with a specific role
   * @param role - The role to filter by
   * @returns Promise<User[]> Array of users with the specified role
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('role', '==', role)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data(),
      } as User));
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw new Error(`Failed to get users with role ${role}`);
    }
  }

  /**
   * Get all users (without pagination) - use with caution
   * @returns Promise<User[]> Array of all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      return querySnapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data(),
      } as User));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to get all users');
    }
  }
}

export const userRepository = new UserRepository();
