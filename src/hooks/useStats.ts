import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { EventAnalytics, ClubAnalytics } from '../types';

/**
 * Hook for fetching event analytics
 */
export const useEventStats = (eventId: string | undefined) => {
    const [stats, setStats] = useState<EventAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!eventId) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await analyticsService.getEventAnalytics(eventId);
                setStats(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch event stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [eventId]);

    return { stats, loading, error };
};

/**
 * Hook for fetching club analytics
 */
export const useClubStats = (clubId: string | undefined) => {
    const [stats, setStats] = useState<ClubAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!clubId) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await analyticsService.getClubAnalytics(clubId);
                setStats(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch club stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [clubId]);

    return { stats, loading, error };
};
