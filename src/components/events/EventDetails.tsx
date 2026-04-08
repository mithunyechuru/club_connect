import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Box, Grid, CircularProgress, Alert, Divider, Avatar, Chip, Link } from '@mui/material';
import { Groups, Payments, EmojiEvents, Info } from '@mui/icons-material';
import { GlassCard, Badge, GradientButton } from '../shared/DesignSystem';
import { eventRepository } from '../../repositories/eventRepository';
import { clubRepository } from '../../repositories/clubRepository';
import { rsvpRepository } from '../../repositories/rsvpRepository';
import { useAuth } from '../../context/AuthContext';
import { Event, Club, RSVP, RSVPStatus } from '../../types';

export const EventDetails: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [event, setEvent] = useState<Event | null>(null);
    const [club, setClub] = useState<Club | null>(null);
    const [rsvp, setRsvp] = useState<RSVP | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!eventId) return;
            try {
                const eventData = await eventRepository.getEventById(eventId);
                if (!eventData) {
                    setLoading(false);
                    return;
                }
                setEvent(eventData);

                const clubData = await clubRepository.getClubById(eventData.clubId);
                setClub(clubData);

                if (user) {
                    const userRsvp = await rsvpRepository.getRSVPByStudentAndEvent(user.userId, eventId);
                    setRsvp(userRsvp);
                }
            } catch (error) {
                console.error('Error fetching event details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [eventId, user]);

    const handleRSVP = async () => {
        if (!user || !eventId || !event) return;
        setActionLoading(true);
        try {
            const isWaitlisted = event.registeredCount >= event.capacity;
            const res = await rsvpRepository.createRSVP({
                eventId,
                studentId: user.userId,
                status: isWaitlisted ? RSVPStatus.WAITLISTED : RSVPStatus.CONFIRMED,
                waitlistPosition: isWaitlisted ? 1 : 0,
                registeredAt: new Date() as any,
                paymentCompleted: event.fee === 0
            } as any);
            setRsvp(res);
            setEvent({ ...event, registeredCount: event.registeredCount + 1 });
        } catch (error) {
            console.error('Error creating RSVP:', error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress color="primary" /></Box>;
    if (!event) return <Alert severity="error">Event not found.</Alert>;

    return (
        <Box>
            <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                    <Box sx={{ mb: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Badge color="secondary">{event.type}</Badge>
                            <Typography variant="body2" sx={{ color: 'var(--text-dim)' }}>
                                Created {event.createdAt.toDate().toLocaleDateString()}
                            </Typography>
                        </Box>
                        <Typography variant="h2" sx={{ fontWeight: 800, mb: 2 }}>{event.name}</Typography>

                        <Grid container spacing={4} sx={{ mb: 4 }}>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="subtitle2" color="var(--text-dim)">DATE</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.startTime.toDate().toLocaleDateString()}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="subtitle2" color="var(--text-dim)">TIME</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {event.startTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="var(--text-dim)">LOCATION</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.location}</Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    <GlassCard sx={{ p: 4, mb: 4 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>About this Event</Typography>
                        <Typography variant="body1" sx={{ color: 'var(--text-muted)', lineHeight: 1.8, mb: 4 }}>
                            {event.description}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {event.tags.map(tag => (
                                <Chip
                                    key={tag}
                                    label={`#${tag}`}
                                    sx={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600, border: '1px solid var(--primary)' }}
                                />
                            ))}
                        </Box>
                    </GlassCard>

                    <GlassCard sx={{ p: 4 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Organizer</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Avatar
                                onClick={() => club && navigate(`/clubs/${club.clubId}`)}
                                sx={{ width: 80, height: 80, fontSize: '2rem', bgcolor: 'var(--primary)', cursor: 'pointer' }}
                            >
                                {club?.name[0]}
                            </Avatar>
                            <Box>
                                <Typography
                                    variant="h5"
                                    onClick={() => club && navigate(`/clubs/${club.clubId}`)}
                                    sx={{ fontWeight: 700, cursor: 'pointer', '&:hover': { color: 'var(--primary)' } }}
                                >
                                    {club?.name}
                                </Typography>
                                <Typography variant="body2" color="var(--text-muted)">Official University Club</Typography>
                            </Box>
                        </Box>
                    </GlassCard>
                </Grid>

                <Grid item xs={12} md={4}>
                    <GlassCard sx={{ p: 4, position: 'sticky', top: 24 }}>
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="subtitle2" color="var(--text-dim)" sx={{ mb: 1 }}>REGISTRATION FEE</Typography>
                            <Typography variant="h3" sx={{ fontWeight: 800, color: 'var(--primary)' }}>
                                {event.fee === 0 ? 'FREE' : `$${event.fee}`}
                            </Typography>
                        </Box>

                        <Divider sx={{ mb: 4, borderColor: 'var(--border-glass)' }} />

                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Groups sx={{ color: 'var(--secondary)' }} />
                                    <Box>
                                        <Typography variant="body2" color="var(--text-muted)">Capacity</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.registeredCount} / {event.capacity}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Payments sx={{ color: 'var(--accent)' }} />
                                    <Box>
                                        <Typography variant="body2" color="var(--text-muted)">Format</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.fee === 0 ? 'Open Attendance' : 'Ticketed Event'}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>

                        {!rsvp ? (
                            <GradientButton
                                fullWidth
                                size="large"
                                onClick={handleRSVP}
                                disabled={actionLoading || event.registeredCount >= event.capacity + 10}
                            >
                                {actionLoading ? 'Processing...' : (event.registeredCount >= event.capacity ? 'Join Waitlist' : 'RSVP Now')}
                            </GradientButton>
                        ) : (
                            <Box sx={{ textAlign: 'center' }}>
                                <Box
                                    sx={{
                                        p: 3,
                                        borderRadius: 3,
                                        background: rsvp.status === RSVPStatus.CONFIRMED ? 'var(--secondary-glow)' : 'var(--primary-glow)',
                                        color: rsvp.status === RSVPStatus.CONFIRMED ? 'var(--secondary)' : 'var(--primary)',
                                        border: '1px solid currentColor',
                                        mb: 3
                                    }}
                                >
                                    <EmojiEvents sx={{ fontSize: 40, mb: 1 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {rsvp.status === RSVPStatus.CONFIRMED ? 'Spot Confirmed!' : 'Waitlisted'}
                                    </Typography>
                                    <Typography variant="body2">
                                        {rsvp.status === RSVPStatus.CONFIRMED ? 'You are all set to attend.' : `Position: ${rsvp.waitlistPosition}`}
                                    </Typography>
                                </Box>
                                <Link component="button" variant="body2" sx={{ color: 'var(--text-dim)' }}>
                                    Cancel RSVP
                                </Link>
                            </Box>
                        )}

                        <Box sx={{ mt: 4, p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Info fontSize="small" sx={{ color: 'var(--primary)' }} />
                            <Typography variant="caption" color="var(--text-dim)">
                                RSVP closing in 2 days. Early bird benefits may apply.
                            </Typography>
                        </Box>
                    </GlassCard>
                </Grid>
            </Grid>
        </Box>
    );
};
