import React, { useEffect, useState } from 'react';
import { Grid, Typography, Box, Skeleton, Divider } from '@mui/material';
import {
    EmojiEvents as TrophyIcon,
    CalendarMonth as CalendarIcon,
    MilitaryTech as BadgeIcon,
    Leaderboard as LeaderboardIcon,
    Event as EventIcon,
} from '@mui/icons-material';
import { GlassCard, GradientButton, StatIconBox } from '../shared/DesignSystem';
import { eventRepository } from '../../repositories/eventRepository';
import { leaderboardRepository } from '../../repositories/leaderboardRepository';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Event } from '../../types';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    variant: 'points' | 'events' | 'badges' | 'rank';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, variant }) => (
    <GlassCard sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        border: `1.5px solid var(--border-card)`,
        '&:hover': { borderColor: 'var(--border-light)' },
    }}>
        <StatIconBox variant={variant}>
            {icon}
        </StatIconBox>
        <Box>
            <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, mb: 0.3 }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {value}
            </Typography>
        </Box>
    </GlassCard>
);

export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [rank, setRank] = useState<string | number>('N/A');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const [eventRes, leaderboard] = await Promise.all([
                    eventRepository.getUpcomingEvents({ pageSize: 5 }),
                    leaderboardRepository.getTopStudents('OVERALL', 100)
                ]);
                setEvents(eventRes.events);
                
                const userRank = leaderboard.find(e => e.userId === user.userId)?.rank;
                if (userRank) setRank(userRank);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    return (
        <Box>
            {/* Page Heading */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, color: 'var(--text-main)' }}>
                    Welcome back!
                </Typography>
                <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Here's what's happening in your clubs today.
                </Typography>
            </Box>

            {/* Stat Cards */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        icon={<TrophyIcon fontSize="inherit" />}
                        label="Your Points"
                        value={user?.totalPoints || 0}
                        variant="points"
                    />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        icon={<CalendarIcon fontSize="inherit" />}
                        label="Events Attended"
                        value={user?.eventsAttendedCount || 0}
                        variant="events"
                    />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        icon={<BadgeIcon fontSize="inherit" />}
                        label="Badges Earned"
                        value={user?.badgesEarnedCount || 0}
                        variant="badges"
                    />
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                    <StatCard
                        icon={<LeaderboardIcon fontSize="inherit" />}
                        label="Leaderboard Rank"
                        value={rank}
                        variant="rank"
                    />
                </Grid>
            </Grid>

            {/* Main Content */}
            <Grid container spacing={3}>
                {/* Upcoming Events */}
                <Grid item xs={12} md={8}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 2, color: 'var(--text-main)' }}>
                        Upcoming Events
                    </Typography>
                    <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
                        {loading ? (
                            <Box sx={{ p: 3 }}>
                                {[1, 2, 3].map(i => <Skeleton key={i} height={60} sx={{ mb: 1, borderRadius: 1 }} />)}
                            </Box>
                        ) : events.length > 0 ? (
                            <Box>
                                {events.map((event, idx) => (
                                    <React.Fragment key={event.eventId}>
                                        <Box sx={{
                                            display: 'flex', alignItems: 'center', gap: 2,
                                            p: 2.5, px: 3,
                                            '&:hover': { backgroundColor: 'var(--bg-page)' },
                                            transition: 'background 0.15s ease',
                                            cursor: 'pointer',
                                        }}>
                                            <Box sx={{
                                                width: 44, height: 44, borderRadius: '10px',
                                                background: 'rgba(107,15,26,0.08)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <EventIcon sx={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                                    {event.name}
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-muted)', mt: 0.2 }}>
                                                    {event.startTime.toDate().toLocaleDateString('en-US', {
                                                        weekday: 'short', month: 'short', day: 'numeric'
                                                    })} · {event.startTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            </Box>
                                            <Box sx={{
                                                px: 1.5, py: 0.4, borderRadius: '6px', fontSize: '0.72rem',
                                                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                                                background: 'rgba(107,15,26,0.08)', color: 'var(--primary)',
                                            }}>
                                                {event.type}
                                            </Box>
                                        </Box>
                                        {idx < events.length - 1 && (
                                            <Divider sx={{ mx: 3, borderColor: 'var(--border-card)' }} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                py: 6, px: 4,
                            }}>
                                {/* Calendar Illustration */}
                                <Box sx={{
                                    width: 90, height: 90, borderRadius: '50%',
                                    background: 'rgba(107,15,26,0.07)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    mb: 2.5,
                                }}>
                                    <CalendarIcon sx={{ fontSize: '2.5rem', color: 'var(--primary)' }} />
                                </Box>
                                <Typography sx={{ fontWeight: 600, color: 'var(--text-secondary)', mb: 0.5, fontSize: '0.95rem' }}>
                                    No upcoming events found.
                                </Typography>
                                <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    Join some clubs to see more!
                                </Typography>
                            </Box>
                        )}
                    </GlassCard>
                </Grid>

                {/* Recent Achievements */}
                <Grid item xs={12} md={4}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 2, color: 'var(--text-main)' }}>
                        Recent Achievements
                    </Typography>
                    <GlassCard>
                        <Box sx={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', textAlign: 'center', py: 2,
                        }}>
                            {/* Trophy Circle */}
                            <Box sx={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mb: 2.5,
                                boxShadow: '0 4px 16px rgba(201,151,58,0.35)',
                            }}>
                                <TrophyIcon sx={{ color: 'white', fontSize: '2rem' }} />
                            </Box>

                            <Typography sx={{ fontSize: '0.88rem', color: 'var(--text-secondary)', mb: 2.5, lineHeight: 1.5 }}>
                                {user?.badgesEarnedCount && user.badgesEarnedCount > 0 
                                    ? `Great job! You've earned ${user.badgesEarnedCount} badges so far.`
                                    : 'Earn your first badge by attending an event!'}
                            </Typography>

                            <GradientButton fullWidth onClick={() => navigate('/achievements')}>
                                View All Achievements
                            </GradientButton>
                        </Box>
                    </GlassCard>

                    {/* Quick Links */}
                    <GlassCard sx={{ mt: 2.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', mb: 2, color: 'var(--text-main)' }}>
                            Quick Actions
                        </Typography>
                        {[
                            { label: 'Browse Events', color: 'var(--stat-events)', path: '/events' },
                            { label: 'Join a Club', color: 'var(--primary)', path: '/clubs' },
                            { label: 'Leaderboard', color: 'var(--accent-gold)', path: '/leaderboard' },
                            { label: 'My Certificates', color: 'var(--stat-badges)', path: '/achievements' },
                        ].map((item) => (
                            <Box
                                key={item.label}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                    py: 1.2, cursor: 'pointer',
                                    '&:hover .quick-label': { color: item.color },
                                    '&:not(:last-child)': { borderBottom: '1px solid var(--border-card)' },
                                }}
                                onClick={() => navigate(item.path)}
                            >
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                                <Typography
                                    className="quick-label"
                                    sx={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.15s ease' }}
                                >
                                    {item.label}
                                </Typography>
                            </Box>
                        ))}
                    </GlassCard>
                </Grid>
            </Grid>
        </Box>
    );
};
