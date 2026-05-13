import React, { useEffect, useState } from 'react';
import {
    Grid,
    Typography,
    Box,
    Skeleton,
    Avatar,
} from '@mui/material';
import { 
    Groups, Event, Assessment, Speed, Add, 
    PersonAdd, Description, Campaign, ArrowForward 
} from '@mui/icons-material';
import { GlassCard, Badge, GradientButton } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { clubRepository } from '../../repositories/clubRepository';
import { eventRepository } from '../../repositories/eventRepository';
import { engagementRepository } from '../../repositories/engagementRepository';
import { membershipRequestRepository } from '../../repositories/membershipRequestRepository';
import { Club, Event as ClubEvent, RequestStatus, MembershipRequest, Engagement } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';
import { useToast } from '../../context/ToastContext';

export const OfficerDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [selectedClub, setSelectedClub] = useState<Club | null>(null);
    const [clubEvents, setClubEvents] = useState<ClubEvent[]>([]);
    const [engagements, setEngagements] = useState<Engagement[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<ClubEvent[]>([]);
    const [completedEvents, setCompletedEvents] = useState<ClubEvent[]>([]);
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
                    
                    const now = new Date();
                    const upcoming = events.filter(e => e.status === 'ACTIVE' && e.startTime.toDate() > now);
                    const completed = events.filter(e => e.status === 'COMPLETED' || e.startTime.toDate() <= now);
                    
                    setUpcomingEvents(upcoming);
                    setCompletedEvents(completed);

                    const requests = await membershipRequestRepository.getAllRequestsByClub(firstClub.clubId);
                    setPendingRequestsCount(requests.filter((r: MembershipRequest) => r.status === RequestStatus.PENDING).length);

                    const clubEngagements = await engagementRepository.getEngagementsByClub(firstClub.clubId);
                    setEngagements(clubEngagements);
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

            {/* Quick Actions */}
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed sx={{ color: 'var(--primary)' }} /> Quick Actions
            </Typography>
            <Grid container spacing={2} sx={{ mb: 6 }}>
                {[
                    { label: 'Create Engagement', icon: <Event />, path: '/officer/create-content?tab=2' },
                    { label: 'Invite Members', icon: <PersonAdd />, path: '/officer/members' },
                    { label: 'Generate Report', icon: <Description />, path: 'report' },
                    { label: 'Send Announcement', icon: <Campaign />, path: '/officer/create-content?tab=2' },
                ].map((action, idx) => (
                    <Grid item xs={12} sm={3} key={idx}>
                        <GlassCard 
                            onClick={() => {
                                if (action.path === 'report') {
                                    showToast('Reporting feature coming soon!', 'info');
                                } else {
                                    navigate(action.path);
                                }
                            }}
                            sx={{ 
                                p: 3, textAlign: 'center', cursor: 'pointer',
                                transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', borderColor: 'var(--primary)' }
                            }}
                        >
                            <Box sx={{ 
                                mb: 1.5, color: 'var(--primary)', 
                                display: 'flex', justifyContent: 'center',
                                '& .MuiSvgIcon-root': { fontSize: '2rem' }
                            }}>
                                {action.icon}
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{action.label}</Typography>
                        </GlassCard>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={4}>
                {/* Upcoming Events */}
                <Grid item xs={12} md={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Event sx={{ color: 'var(--primary)' }} /> Upcoming Events
                        </Typography>
                        <Typography 
                            variant="body2" 
                            sx={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}
                            onClick={() => navigate('/officer/events')}
                        >
                            View all events <ArrowForward sx={{ fontSize: '1rem' }} />
                        </Typography>
                    </Box>
                    <Stack spacing={2} sx={{ mb: 6 }}>
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.slice(0, 3).map(event => (
                                <GlassCard key={event.eventId} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.name}</Typography>
                                        <Typography variant="body2" color="var(--text-dim)">
                                            {event.startTime.toDate().toLocaleDateString()} • {event.registeredCount} Registered
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Badge color="primary">Upcoming</Badge>
                                        <GradientButton size="small" onClick={() => navigate(`/officer/attendance/${event.eventId}`)}>Attendance</GradientButton>
                                    </Box>
                                </GlassCard>
                            ))
                        ) : (
                            <Box sx={{ p: 4, textAlign: 'left', color: 'var(--text-dim)' }}>
                                No upcoming events created yet.
                            </Box>
                        )}
                    </Stack>

                    {/* Recently Completed Events */}
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assessment sx={{ color: 'var(--primary)' }} /> Recently Completed Events
                    </Typography>
                    <Stack spacing={2}>
                        {completedEvents.length > 0 ? (
                            completedEvents.slice(0, 3).map(event => {
                                const date = event.startTime.toDate();
                                return (
                                    <GlassCard key={event.eventId} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                        {/* Date Badge */}
                                        <Box sx={{ 
                                            width: 60, height: 60, borderRadius: '12px', 
                                            bgcolor: 'var(--bg-page)', border: '1px solid var(--border-light)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>{date.getDate()}</Typography>
                                            <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                                                {date.toLocaleString('default', { month: 'short' })}
                                            </Typography>
                                        </Box>
                                        
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700 }}>{event.name}</Typography>
                                            <Box sx={{ display: 'flex', gap: 2, color: 'var(--text-dim)' }}>
                                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Speed sx={{ fontSize: '0.9rem' }} /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Groups sx={{ fontSize: '0.9rem' }} /> {event.location || 'Student Center'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        
                                        <GradientButton 
                                            variant="outlined" 
                                            size="small" 
                                            onClick={() => navigate(`/officer/events/${event.eventId}`)}
                                            sx={{ background: '#fff', color: 'var(--primary)', border: '1px solid var(--border-light)' }}
                                        >
                                            Details
                                        </GradientButton>
                                    </GlassCard>
                                );
                            })
                        ) : (
                            <Box sx={{ p: 4, textAlign: 'left', color: 'var(--text-dim)' }}>
                                No completed events yet.
                            </Box>
                        )}
                    </Stack>
                </Grid>

                {/* Recent Engagements */}
                <Grid item xs={12} md={12} sx={{ mt: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Campaign sx={{ color: 'var(--primary)' }} /> Recent Engagements
                        </Typography>
                        <Typography 
                            variant="body2" 
                            sx={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}
                            onClick={() => navigate('/officer/create-content?tab=2')}
                        >
                            Create new engagement <ArrowForward sx={{ fontSize: '1rem' }} />
                        </Typography>
                    </Box>
                    <Grid container spacing={2}>
                        {engagements.length > 0 ? (
                            engagements.slice(0, 4).map(eng => (
                                <Grid item xs={12} sm={6} key={eng.engagementId}>
                                    <GlassCard sx={{ p: 2.5, height: '100%' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Badge color={eng.type === 'POLL' ? 'secondary' : 'primary'}>{eng.type}</Badge>
                                            <Typography variant="caption" color="var(--text-dim)">
                                                {eng.createdAt.toDate().toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{eng.title}</Typography>
                                        <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 2, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {eng.description}
                                        </Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                                            {eng.type === 'POLL' && (
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                    {eng.options?.reduce((acc, opt) => acc + opt.votes, 0)} Total Votes
                                                </Typography>
                                            )}
                                            <Badge color={eng.status === 'ACTIVE' ? 'primary' : 'secondary'} sx={{ ml: 'auto' }}>
                                                {eng.status}
                                            </Badge>
                                        </Box>
                                    </GlassCard>
                                </Grid>
                            ))
                        ) : (
                            <Grid item xs={12}>
                                <Box sx={{ p: 4, textAlign: 'left', color: 'var(--text-dim)', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
                                    No active engagements or polls yet.
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};
