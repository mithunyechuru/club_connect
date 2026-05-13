import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { SystemSettings, UserAppSettings, AppTheme } from '../types';

const SYSTEM_SETTINGS_COLLECTION = 'systemSettings';
const SYSTEM_SETTINGS_DOC_ID = 'global';

/**
 * Repository for managing application-wide and per-user settings in Firestore.
 */
export class SettingsRepository {

  // ─── System Settings (Admin) ─────────────────────────────────────────────

  /**
   * Get the global system settings document.
   */
  async getSystemSettings(): Promise<SystemSettings | null> {
    try {
      const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC_ID);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { settingsId: snap.id, ...snap.data() } as SystemSettings;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      return null;
    }
  }

  /**
   * Update (merge) the global system settings document.
   */
  async updateSystemSettings(
    updates: Partial<Omit<SystemSettings, 'settingsId'>>,
    updatedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC_ID);
      const snap = await getDoc(docRef);
      const payload = {
        ...updates,
        updatedAt: Timestamp.now(),
        updatedBy,
      };
      if (snap.exists()) {
        await updateDoc(docRef, payload);
      } else {
        // Create with defaults on first save
        await setDoc(docRef, {
          universityName: '',
          universityLogoUrl: '',
          defaultEventDurationHours: 2,
          maxParticipantsPerEvent: 100,
          ...payload,
        });
      }
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw new Error('Failed to update system settings');
    }
  }

  // ─── Per-User App Settings (Theme, etc.) ─────────────────────────────────

  /**
   * Get per-user app settings (stored at users/{userId}/appSettings/prefs).
   */
  async getUserAppSettings(userId: string): Promise<UserAppSettings | null> {
    try {
      const docRef = doc(db, 'users', userId, 'appSettings', 'prefs');
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return snap.data() as UserAppSettings;
    } catch (error) {
      console.error('Error fetching user app settings:', error);
      return null;
    }
  }

  /**
   * Update per-user app settings.
   */
  async updateUserAppSettings(userId: string, theme: AppTheme): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'appSettings', 'prefs');
      await setDoc(docRef, {
        theme,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    } catch (error) {
      console.error('Error updating user app settings:', error);
      throw new Error('Failed to update user app settings');
    }
  }
}

export const settingsRepository = new SettingsRepository();
