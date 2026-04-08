import React, { useEffect, useState } from 'react';
import {
    Grid,
    Typography,
    Box,
    Skeleton,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Divider,
} from '@mui/material';
import { Groups, Event, Assessment, Speed, Add } from '@mui/icons-material';
import { GlassCard, Badge, GradientButton } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { clubRepository } from '../../repositories/clubRepository';
import { eventRepository } from '../../repositories/eventRepository';
import { membershipRequestRepository } from '../../repositories/membershipRequestRepository';
import { Club, Event as ClubEvent, RequestStatus, MembershipRequest } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';

export const OfficerDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [selectedClub, setSelectedClub] = useState<Club | null>(null);
    const [clubEvents, setClubEvents] = useState<ClubEvent[]>([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOfficerData = async () => {
            if (!user) return;
            try {
                const officerClubs = await clubRepository.getClubsByOfficer(user.userId);
                setClubs(officerClubs);

                if (officerClubs.length > 0) {
                    const firstClub = officerClubs[0];
                    setSelectedClub(firstClub);

                    const events = await eventRepository.getEventsByClub(firstClub.clubId);
                    setClubEvents(events);

                    const requests = await membershipRequestRepository.getAllRequestsByClub(firstClub.clubId);
                    setPendingRequestsCount(requests.filter((r: MembershipRequest) => r.status === RequestStatus.PENDING).length);
                }
            } catch (error) {
                console.error('Error fetching officer data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOfficerData();
    }, [user]);

    if (loading) return <Box sx={{ p: 4 }}><Skeleton height={400} /></Box>;
    if (clubs.length === 0) return <Typography variant="h5" sx={{ p: 4, textAlign: 'center' }}>You are not an officer of any clubs.</Typography>;

    return (
        <Box>
            <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>Officer Dashboard</Typography>
                    <Typography variant="body1" sx={{ color: 'var(--text-muted)' }}>
                        Managing {selectedClub?.name}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <GradientButton startIcon={<Add />} onClick={() => navigate('/officer/events')} id="officer-add-event-btn">
                        Add Event
                    </GradientButton>
                    <GradientButton onClick={() => navigate('/officer/members')} sx={{ background: '#fff', color: 'var(--primary)', border: '1px solid var(--border-light)' }}>
                        Manage Members
                    </GradientButton>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 6 }}>
                <Grid item xs={12} sm={3}>
                    <GlassCard sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'var(--primary-glow)', color: 'var(--primary)' }}><Groups /></Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>{selectedClub?.memberIds.length}</Typography>
                            <Typography variant="caption" color="var(--text-dim)">Total Members</Typography>
                        </Box>
                    </GlassCard>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <GlassCard sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><Event /></Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>{clubEvents.length}</Typography>
                            <Typography variant="caption" color="var(--text-dim)">Events Hosted</Typography>
                        </Box>
                    </GlassCard>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <GlassCard sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(201,151,58,0.12)', color: 'var(--accent-gold)' }}><Assessment /></Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>{pendingRequestsCount}</Typography>
                            <Typography variant="caption" color="var(--text-dim)">Pending Members</Typography>
                        </Box>
                    </GlassCard>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <GlassCard sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(5,150,105,0.10)', color: '#059669' }}><Speed /></Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>85%</Typography>
                            <Typography variant="caption" color="var(--text-dim)">Avg. Attendance</Typography>
                        </Box>
                    </GlassCard>
                </Grid>
            </Grid>

            <Grid container spacing={4}>
                {/* Recent Events List */}
                <Grid item xs={12} md={7}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>Manage Events</Typography>
                        <GradientButton startIcon={<Add />} size="small" onClick={() => navigate('/officer/events')}>
                            Add Event
                        </GradientButton>
                    </Box>
                    <Stack spacing={2}>
                        {clubEvents.length > 0 ? (
                            clubEvents.map(event => (
                                <GlassCard key={event.eventId} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.name}</Typography>
                                        <Typography variant="body2" color="var(--text-dim)">
                                            {event.startTime.toDate().toLocaleDateString()} • {event.registeredCount} Registered
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Badge color={event.status === 'ACTIVE' ? 'primary' : 'secondary'}>{event.status}</Badge>
                                        <GradientButton size="small" onClick={() => navigate(`/officer/attendance/${event.eventId}`)}>Attendance</GradientButton>
                                        <GradientButton size="small" onClick={() => navigate(`/officer/events/${event.eventId}`)} sx={{ background: '#fff', color: 'var(--primary)', border: '1px solid var(--border-light)' }}>Edit</GradientButton>
                                    </Box>
                                </GlassCard>
                            ))
                        ) : (
                            <GlassCard sx={{ p: 4, textAlign: 'center' }}>
                                <Event sx={{ fontSize: '2.5rem', color: 'var(--text-dim)', mb: 1.5 }} />
                                <Typography color="var(--text-dim)" sx={{ mb: 2 }}>No events yet. Create your first event!</Typography>
                                <GradientButton startIcon={<Add />} onClick={() => navigate('/officer/events')}>
                                    Add Event
                                </GradientButton>
                            </GlassCard>
                        )}
                    </Stack>
                </Grid>

                {/* Membership Activity */}
                <Grid item xs={12} md={5}>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Recent Activity</Typography>
                    <GlassCard sx={{ p: 0, mb: 4 }}>
                        <List>
                            <ListItem>
                                <ListItemAvatar><Avatar sx={{ bgcolor: 'var(--primary)', color: '#fff' }}>JD</Avatar></ListItemAvatar>
                                <ListItemText primary="John Doe requested to join" secondary="2 hours ago" />
                                <Badge color="primary">Pending</Badge>
                            </ListItem>
                            <Divider sx={{ borderColor: 'var(--border-light)', mx: 2 }} />
                            <ListItem>
                                <ListItemAvatar><Avatar sx={{ bgcolor: '#3b82f6', color: '#fff' }}>AS</Avatar></ListItemAvatar>
                                <ListItemText primary="Alice Smith RSVP'd to Tech Talk" secondary="5 hours ago" />
                            </ListItem>
                            <Divider sx={{ borderColor: 'var(--border-light)', mx: 2 }} />
                            <ListItem>
                                <ListItemAvatar><Avatar sx={{ bgcolor: 'var(--accent-gold)', color: '#fff' }}>MK</Avatar></ListItemAvatar>
                                <ListItemText primary="New Forum Thread: 'Hackathon Prep'" secondary="Yesterday" />
                            </ListItem>
                        </List>
                    </GlassCard>
                </Grid>
            </Grid>
        </Box>
    );
};
