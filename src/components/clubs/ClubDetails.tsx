import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Box, Grid, Divider, List, ListItem, ListItemAvatar, ListItemText, Avatar, CircularProgress, Alert } from '@mui/material';
import { VerifiedUser, CalendarMonth, Info } from '@mui/icons-material';
import { GlassCard, Badge, GradientButton } from '../shared/DesignSystem';
import { clubRepository } from '../../repositories/clubRepository';
import { eventRepository } from '../../repositories/eventRepository';
import { membershipRequestRepository } from '../../repositories/membershipRequestRepository';
import { useAuth } from '../../context/AuthContext';
import { Club, Event, User, RequestStatus } from '../../types';
import { userRepository } from '../../repositories/userRepository';

export const ClubDetails: React.FC = () => {
    const { clubId } = useParams<{ clubId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [club, setClub] = useState<Club | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [officers, setOfficers] = useState<User[]>([]);
    const [membershipStatus, setMembershipStatus] = useState<'NONE' | 'PENDING' | 'MEMBER' | 'OFFICER'>('NONE');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!clubId) return;
            try {
                const clubData = await clubRepository.getClubById(clubId);
                if (!clubData) {
                    setLoading(false);
                    return;
                }
                setClub(clubData);

                const clubEvents = await eventRepository.getEventsByClub(clubId);
                setEvents(clubEvents);

                const officerData = await Promise.all(
                    clubData.officerIds.map(id => userRepository.getUserById(id))
                );
                setOfficers(officerData.filter((u): u is User => u !== null));

                if (user) {
                    if (clubData.officerIds.includes(user.userId)) {
                        setMembershipStatus('OFFICER');
                    } else if (clubData.memberIds.includes(user.userId)) {
                        setMembershipStatus('MEMBER');
                    } else {
                        const requests = await membershipRequestRepository.getRequestsByStudent(user.userId);
                        const pending = requests.find(r => r.clubId === clubId && r.status === RequestStatus.PENDING);
                        if (pending) setMembershipStatus('PENDING');
                    }
                }
            } catch (error) {
                console.error('Error fetching club details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [clubId, user]);

    const handleJoinRequest = async () => {
        if (!user || !clubId) return;
        setActionLoading(true);
        try {
            await membershipRequestRepository.createRequest({
                studentId: user.userId,
                clubId: clubId,
                message: 'I would like to join this club.',
                status: RequestStatus.PENDING,
                requestedAt: new Date() as any
            } as any);
            setMembershipStatus('PENDING');
        } catch (error) {
            console.error('Error joining club:', error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress color="primary" /></Box>;
    if (!club) return <Alert severity="error">Club not found.</Alert>;

    return (
        <Box>
            <Box
                sx={{
                    height: 300,
                    background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--primary-glow) 100%)',
                    borderRadius: 4,
                    mb: -10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Typography variant="h1" sx={{ fontSize: '8rem', fontWeight: 900, opacity: 0.1, color: 'var(--primary)' }}>
                    {club.name}
                </Typography>
            </Box>

            <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                    <GlassCard sx={{ position: 'relative', zIndex: 1, p: 4, textAlign: 'center' }}>
                        <Avatar
                            sx={{
                                width: 120,
                                height: 120,
                                fontSize: '3rem',
                                bgcolor: 'var(--primary)',
                                margin: '0 auto',
                                mb: 3,
                                boxShadow: '0 8px 16px var(--primary-glow)'
                            }}
                        >
                            {club.name[0]}
                        </Avatar>
                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{club.name}</Typography>
                        <Badge color="primary" sx={{ mb: 3 }}>{club.category}</Badge>

                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={6}>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>{club.memberIds.length}</Typography>
                                <Typography variant="body2" color="var(--text-muted)">Members</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>{events.length}</Typography>
                                <Typography variant="body2" color="var(--text-muted)">Events</Typography>
                            </Grid>
                        </Grid>

                        {membershipStatus === 'NONE' && (
                            <GradientButton fullWidth onClick={handleJoinRequest} disabled={actionLoading}>
                                {actionLoading ? 'Requesting...' : 'Join Club'}
                            </GradientButton>
                        )}
                        {membershipStatus === 'PENDING' && (
                            <Alert icon={<Info />} severity="info" sx={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', textAlign: 'left' }}>
                                Membership Request Pending
                            </Alert>
                        )}
                        {membershipStatus === 'MEMBER' && (
                            <Badge color="secondary" sx={{ width: '100%', py: 1.5 }}>Active Member</Badge>
                        )}
                        {membershipStatus === 'OFFICER' && (
                            <Badge color="accent" sx={{ width: '100%', py: 1.5 }}>Club Officer</Badge>
                        )}
                    </GlassCard>

                    <GlassCard sx={{ mt: 3, p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <VerifiedUser fontSize="small" sx={{ color: 'var(--secondary)' }} />
                            Officers
                        </Typography>
                        <List sx={{ p: 0 }}>
                            {officers.map(officer => (
                                <ListItem key={officer.userId} sx={{ px: 0 }}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'var(--bg-surface)', color: 'var(--text-main)' }}>
                                            {officer.profile.firstName[0]}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={`${officer.profile.firstName} ${officer.profile.lastName}`}
                                        secondary={club.memberRoles[officer.userId] || 'Officer'}
                                        primaryTypographyProps={{ fontWeight: 600 }}
                                        secondaryTypographyProps={{ color: 'var(--text-dim)' }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </GlassCard>
                </Grid>

                <Grid item xs={12} md={8} sx={{ mt: { md: 12 } }}>
                    <Box sx={{ mb: 6 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>About the Club</Typography>
                        <Typography variant="body1" sx={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                            {club.description}
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 6, borderColor: 'var(--border-glass)' }} />

                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Active Events</Typography>
                        <Grid container spacing={3}>
                            {events.length > 0 ? (
                                events.map(event => (
                                    <Grid item xs={12} key={event.eventId}>
                                        <GlassCard
                                            sx={{
                                                p: 3,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                '&:hover': { background: 'var(--primary-glow)' }
                                            }}
                                            onClick={() => navigate(`/events/${event.eventId}`)}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <Box sx={{ p: 2, borderRadius: 3, background: 'var(--bg-main)', textAlign: 'center', minWidth: 80 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{event.startTime.toDate().getDate()}</Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--primary)', fontWeight: 700 }}>
                                                        {event.startTime.toDate().toLocaleString('default', { month: 'short' })}
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.name}</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-dim)' }}>
                                                        <CalendarMonth fontSize="inherit" />
                                                        <Typography variant="caption">
                                                            {event.startTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Badge color="secondary">{event.type}</Badge>
                                        </GlassCard>
                                    </Grid>
                                ))
                            ) : (
                                <Grid item xs={12}>
                                    <Box sx={{ p: 6, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                                        <Typography color="var(--text-dim)">No events scheduled currently.</Typography>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};
