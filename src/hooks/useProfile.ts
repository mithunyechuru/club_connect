import { useState, useEffect } from 'react';
import { userRepository } from '../repositories/userRepository';
import { User } from '../types';

/**
 * Hook for managing user profile data
 * @param userId - The ID of the user to fetch
 */
export const useProfile = (userId: string | undefined) => {
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        const fetchProfile = async () => {
            setLoading(true);
            try {
                const data = await userRepository.getUserById(userId);
                setProfile(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userId]);

    const updateProfile = async (updates: Partial<User>) => {
        if (!userId) return;

        setLoading(true);
        try {
            await userRepository.updateUser(userId, updates);
            setProfile(prev => prev ? { ...prev, ...updates } : null);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { profile, loading, error, updateProfile };
};
