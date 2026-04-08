import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Grid, Skeleton, Tabs, Tab, Chip, Stack,
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    CircularProgress, Alert, InputAdornment, TextField, MenuItem, IconButton,
} from '@mui/material';
import {
    CalendarToday, AccessTime, Groups, CheckCircle, Cancel as CancelIcon,
    Event as EventIcon, HowToReg, Feedback, LocationOn, Search, Add, Image as ImageIcon,
    Edit, Delete,
} from '@mui/icons-material';
import { GlassCard, Badge, GradientButton, StyledInput } from '../shared/DesignSystem';
import { eventRepository } from '../../repositories/eventRepository';
import { rsvpRepository } from '../../repositories/rsvpRepository';
import { clubRepository } from '../../repositories/clubRepository';
import { Event, RSVP, RSVPStatus, UserRole, EventType, EventStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { EventCalendar } from './EventCalendar';
import { ViewList, CalendarMonth } from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

// ─── Types ───────────────────────────────────────────────────────────────────
type TabId = 0 | 1 | 2; // 0=Upcoming, 1=Registered, 2=Completed

const TYPE_COLORS: Record<string, string> = {
    WORKSHOP: '#3b82f6',
    HACKATHON: '#7c3aed',
    SEMINAR: '#059669',
    SOCIAL_GATHERING: '#ec4899',
    MEETING: '#c9973a',
    COMPETITION: '#dc2626',
    CULTURAL: '#f97316',
    TECHNICAL: '#0891b2',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toMs = (ts: Timestamp | any) => ts?.toMillis?.() ?? 0;

const fmt = (ts: Timestamp, opts: Intl.DateTimeFormatOptions) =>
    ts.toDate().toLocaleString('en-US', opts);

const fmtDate = (ts: Timestamp) =>
    fmt(ts, { day: 'numeric', month: 'short', year: 'numeric' });

const fmtTime = (ts: Timestamp) =>
    fmt(ts, { hour: '2-digit', minute: '2-digit' });

const remaining = (event: Event) =>
    Math.max(0, event.capacity - (event.registeredCount ?? 0));

// ─── Event Card (Upcoming) ──────────────────────────────────────────────────
interface UpcomingCardProps {
    event: Event;
    registeredIds: Set<string>;
    onRegister: (event: Event) => void;
    registering: string | null;
    userRole?: UserRole;
    onEdit?: (event: Event) => void;
    onDelete?: (event: Event) => void;
    onCancel?: (rsvp: RSVP, event: Event) => void;
    onGetRSVP?: (eventId: string) => RSVP | undefined;
}

const UpcomingCard: React.FC<UpcomingCardProps> = ({ event, registeredIds, onRegister, registering, userRole, onEdit, onDelete, onCancel, onGetRSVP }) => {
    const typeColor = TYPE_COLORS[event.type] || '#6b0f1a';
    const seats = remaining(event);
    const isRegistered = registeredIds.has(event.eventId);
    const isFull = seats === 0 && !isRegistered;
    const isLoading = registering === event.eventId;

    return (
        <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                {/* Poster / date block */}
                {event.imageUrl ? (
                    <Box
                        component="img"
                        src={event.imageUrl}
                        alt={event.name}
                        sx={{
                            width: { xs: '100%', sm: 160 },
                            height: { xs: 140, sm: 'auto' },
                            objectFit: 'cover',
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <Box sx={{
                        width: { xs: '100%', sm: 100 },
                        minHeight: { xs: 70, sm: 'auto' },
                        background: `linear-gradient(160deg, ${typeColor} 0%, ${typeColor}cc 100%)`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        py: 2, flexShrink: 0, color: 'white',
                    }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1 }}>
                            {event.startTime.toDate().getDate()}
                        </Typography>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {event.startTime.toDate().toLocaleString('default', { month: 'short' })}
                        </Typography>
                    </Box>
                )}

                {/* Content */}
                <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'flex-start' } }}>
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.8 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                                {event.name}
                            </Typography>
                            <Badge color="secondary">{event.type.replace('_', ' ')}</Badge>
                            {isFull && <Badge color="primary">FULL</Badge>}
                        </Box>

                        {event.clubName && (
                            <Typography sx={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, mb: 0.8 }}>
                                {event.clubName}
                            </Typography>
                        )}

                        <Box sx={{ display: 'flex', gap: 2.5, mb: 1, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                <CalendarToday sx={{ fontSize: '0.9rem' }} /> {fmtDate(event.startTime)}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                <AccessTime sx={{ fontSize: '0.9rem' }} /> {fmtTime(event.startTime)}
                                {event.endTime && ` – ${fmtTime(event.endTime)}`}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                <LocationOn sx={{ fontSize: '0.9rem' }} /> {event.location || 'TBD'}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: seats > 10 ? '#16a34a' : seats > 0 ? '#d97706' : '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                                <Groups sx={{ fontSize: '0.9rem' }} />
                                {seats > 0 ? `${seats} seats left` : 'No seats available'} / {event.capacity} max
                            </Box>
                        </Box>

                        <Typography sx={{
                            color: 'var(--text-secondary)', fontSize: '0.83rem',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                            {event.description}
                        </Typography>
                    </Box>

                    <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 1.5, mt: { xs: 1, md: 0 } }}>
                        {/* Management Actions for Officers/Admins */}
                        {(userRole === UserRole.CLUB_OFFICER || userRole === UserRole.ADMINISTRATOR) && (
                            <Stack direction="row" spacing={1}>
                                <IconButton 
                                    size="small" 
                                    onClick={() => onEdit?.(event)} 
                                    sx={{ color: 'var(--primary)', bgcolor: 'rgba(107,15,26,0.05)', '&:hover': { bgcolor: 'rgba(107,15,26,0.1)' } }}
                                    title="Edit Event"
                                >
                                    <Edit sx={{ fontSize: '1.2rem' }} />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    onClick={() => onDelete?.(event)} 
                                    sx={{ color: '#ef4444', bgcolor: 'rgba(239,68,68,0.05)', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
                                    title="Delete Event"
                                >
                                    <Delete sx={{ fontSize: '1.2rem' }} />
                                </IconButton>
                            </Stack>
                        )}

                        {isRegistered ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <CheckCircle sx={{ fontSize: '1.1rem' }} /> Registered
                                </Box>
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                        const rsvp = registeredIds.has(event.eventId) ? onGetRSVP?.(event.eventId) : null;
                                        if (rsvp) onCancel?.(rsvp, event);
                                    }}
                                    disabled={isLoading}
                                    sx={{ 
                                        textTransform: 'none', 
                                        fontSize: '0.75rem', 
                                        p: 0, 
                                        minWidth: 0,
                                        '&:hover': { background: 'transparent', textDecoration: 'underline' }
                                    }}
                                >
                                    Cancel Registration?
                                </Button>
                            </Box>
                        ) : (
                            !(userRole === UserRole.CLUB_OFFICER || userRole === UserRole.ADMINISTRATOR) && (
                                <GradientButton
                                    startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : <HowToReg />}
                                    onClick={() => onRegister(event)}
                                    disabled={isFull || isLoading}
                                    size="small"
                                >
                                    {isLoading ? 'Registering…' : 'Register'}
                                </GradientButton>
                            )
                        )}
                    </Box>
                </Box>
            </Box>
        </GlassCard>
    );
};

// ─── Event Card (Registered) ────────────────────────────────────────────────
interface RegisteredCardProps {
    event: Event;
    rsvp: RSVP;
    onCancel: (rsvp: RSVP, event: Event) => void;
    cancelling: string | null;
}

const RegisteredCard: React.FC<RegisteredCardProps> = ({ event, rsvp, onCancel, cancelling }) => {
    const typeColor = TYPE_COLORS[event.type] || '#6b0f1a';
    const isLoading = cancelling === rsvp.rsvpId;

    const statusColor = rsvp.status === RSVPStatus.CONFIRMED ? '#16a34a' : rsvp.status === RSVPStatus.WAITLISTED ? '#d97706' : '#dc2626';
    const statusLabel = rsvp.status === RSVPStatus.CONFIRMED ? 'Confirmed' : rsvp.status === RSVPStatus.WAITLISTED ? 'Waitlisted' : 'Cancelled';

    return (
        <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                <Box sx={{
                    width: { xs: '100%', sm: 8 }, minHeight: { xs: 6, sm: 'auto' },
                    background: typeColor, flexShrink: 0,
                }} />
                <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.6 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{event.name}</Typography>
                            <Chip
                                label={statusLabel}
                                size="small"
                                sx={{ bgcolor: `${statusColor}18`, color: statusColor, fontWeight: 700, fontSize: '0.72rem', height: 22 }}
                            />
                        </Box>
                        {event.clubName && (
                            <Typography sx={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, mb: 0.6 }}>
                                {event.clubName}
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                <CalendarToday sx={{ fontSize: '0.9rem' }} /> {fmtDate(event.startTime)}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                <AccessTime sx={{ fontSize: '0.9rem' }} /> {fmtTime(event.startTime)}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                <LocationOn sx={{ fontSize: '0.9rem' }} /> {event.location || 'TBD'}
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ flexShrink: 0 }}>
                        <Button
                            variant="outlined"
                            startIcon={isLoading ? <CircularProgress size={14} /> : <CancelIcon />}
                            onClick={() => onCancel(rsvp, event)}
                            disabled={isLoading || rsvp.status === RSVPStatus.CANCELLED}
                            size="small"
                            sx={{
                                borderColor: '#dc2626', color: '#dc2626', borderRadius: '8px',
                                textTransform: 'none', fontWeight: 600,
                                '&:hover': { bgcolor: '#dc262610', borderColor: '#dc2626' },
                            }}
                        >
                            {isLoading ? 'Cancelling…' : 'Cancel Registration'}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </GlassCard>
    );
};

// ─── Event Card (Completed) ─────────────────────────────────────────────────
const CompletedCard: React.FC<{ event: Event }> = ({ event }) => {

    return (
        <GlassCard sx={{ p: 0, overflow: 'hidden', opacity: 0.85 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                <Box sx={{
                    width: { xs: '100%', sm: 100 },
                    minHeight: { xs: 60, sm: 'auto' },
                    background: `linear-gradient(160deg, #9ca3af 0%, #6b7280 100%)`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    py: 2, flexShrink: 0, color: 'white',
                }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1 }}>
                        {event.startTime.toDate().getDate()}
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {event.startTime.toDate().toLocaleString('default', { month: 'short' })}
                    </Typography>
                </Box>

                <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.6 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{event.name}</Typography>
                            <Badge>{event.type.replace('_', ' ')}</Badge>
                            <Badge color="primary">Completed</Badge>
                        </Box>
                        {event.clubName && (
                            <Typography sx={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, mb: 0.6 }}>
                                {event.clubName}
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                <CalendarToday sx={{ fontSize: '0.9rem' }} /> {fmtDate(event.startTime)}
                            </Box>
                        </Box>
                    </Box>
                    <GradientButton
                        startIcon={<Feedback />}
                        size="small"
                        sx={{ opacity: 0.75, flexShrink: 0 }}
                        onClick={() => alert('Feedback form coming soon!')}
                    >
                        Give Feedback
                    </GradientButton>
                </Box>
            </Box>
        </GlassCard>
    );
};

// ─── Empty State ────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
    <Grid item xs={12}>
        <GlassCard>
            <Box sx={{ textAlign: 'center', py: 6 }}>
                <Box sx={{ fontSize: '3rem', color: 'var(--text-dim)', mb: 2 }}>{icon}</Box>
                <Typography sx={{ color: 'var(--text-muted)' }}>{message}</Typography>
            </Box>
        </GlassCard>
    </Grid>
);

// ─── Create Event Dialog (inline for officers) ──────────────────────────────
const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
    { value: EventType.WORKSHOP, label: '🛠 Workshop' },
    { value: EventType.SEMINAR, label: '🎓 Seminar' },
    { value: EventType.HACKATHON, label: '💻 Hackathon' },
    { value: EventType.COMPETITION, label: '🏆 Competition' },
    { value: EventType.SOCIAL_GATHERING, label: '🎉 Cultural / Social' },
    { value: EventType.MEETING, label: '📋 Technical / Meeting' },
];
const emptyEventForm = {
    name: '', description: '', type: EventType.WORKSHOP,
    location: '', capacity: 50, startTime: '', endTime: '',
    fee: 0, imageUrl: '', registrationDeadline: '',
    clubName: '',
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const EventDiscovery: React.FC = () => {
    const { user } = useAuth();
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [myRSVPs, setMyRSVPs] = useState<RSVP[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabId>(0);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [registering, setRegistering] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [officerClub, setOfficerClub] = useState<any>(null);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState(emptyEventForm);
    const [confirmCancel, setConfirmCancel] = useState<{ rsvp: RSVP; event: Event } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editEvent, setEditEvent] = useState<Event | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
    const [deleting, setDeleting] = useState(false);

    const showAlert = (type: 'success' | 'error', msg: string) => {
        setAlert({ type, msg });
        setTimeout(() => setAlert(null), 4000);
    };

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [eventsRes, rsvpsRes] = await Promise.allSettled([
                eventRepository.getAllEvents(),
                rsvpRepository.getRSVPsByStudent(user.userId),
            ]);

            if (eventsRes.status === 'fulfilled') setAllEvents(eventsRes.value);
            if (rsvpsRes.status === 'fulfilled') setMyRSVPs(rsvpsRes.value);
        } catch (err) {
            console.error('Error fetching events/RSVPs:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const now = Date.now();

    // IDs the user is actively registered for (CONFIRMED or WAITLISTED)
    const activeRSVPs = myRSVPs.filter(r => {
        const s = r.status?.toString().toUpperCase();
        return s === RSVPStatus.CONFIRMED || s === RSVPStatus.WAITLISTED;
    });
    const registeredEventIds = new Set(activeRSVPs.map(r => r.eventId));

    const isAdmin = user?.role === UserRole.ADMINISTRATOR;
    const isOfficer = user?.role === UserRole.CLUB_OFFICER;
    // Hide registered tab for officers and admins
    const hideRegisteredTab = isAdmin || isOfficer;

    // Search filter helper
    const matchesSearch = (e: Event) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return e.name.toLowerCase().includes(q) || (e.clubName ?? '').toLowerCase().includes(q);
    };

    // Upcoming: events that haven't ended yet
    const upcomingEvents = allEvents
        .filter(e => (toMs(e.endTime) || toMs(e.startTime) + 10800000) > now && matchesSearch(e))
        .sort((a, b) => toMs(a.startTime) - toMs(b.startTime));

    // Registered: events user is signed up for that haven't ended yet
    const registeredEvents = allEvents
        .filter(e => registeredEventIds.has(e.eventId) && (toMs(e.endTime) || toMs(e.startTime) + 10800000) > now && matchesSearch(e));

    // Completed: events that have ended
    const completedEvents = allEvents
        .filter(e => (toMs(e.endTime) || toMs(e.startTime) + 10800000) <= now && matchesSearch(e))
        .sort((a, b) => toMs(b.startTime) - toMs(a.startTime));

    const getRSVPForEvent = (eventId: string) =>
        myRSVPs.find(r => {
            const s = r.status?.toString().toUpperCase();
            return r.eventId === eventId && (s === RSVPStatus.CONFIRMED || s === RSVPStatus.WAITLISTED);
        });

    const handleRegister = async (event: Event) => {
        if (!user) return;
        setRegistering(event.eventId);
        try {
            // Check if already registered
            const existing = await rsvpRepository.getRSVPByStudentAndEvent(user.userId, event.eventId);
            if (existing && (existing.status === RSVPStatus.CONFIRMED || existing.status === RSVPStatus.WAITLISTED)) {
                showAlert('error', 'You are already registered for this event.');
                return;
            }

            const seats = remaining(event);
            const status = seats > 0 ? RSVPStatus.CONFIRMED : RSVPStatus.WAITLISTED;

            await rsvpRepository.createRSVP({
                eventId: event.eventId,
                studentId: user.userId,
                status,
                waitlistPosition: status === RSVPStatus.WAITLISTED ? 999 : 0,
                registeredAt: Timestamp.now(),
                paymentCompleted: false,
            });

            // Increment registeredCount
            await eventRepository.updateEvent(event.eventId, {
                registeredCount: (event.registeredCount ?? 0) + 1,
            });

            showAlert('success', status === RSVPStatus.CONFIRMED ? `You're registered for "${event.name}"!` : `You've been added to the waitlist for "${event.name}".`);
            await fetchData();
            setTab(1); // go to Registered tab
        } catch (err) {
            console.error('Registration error:', err);
            showAlert('error', 'Failed to register. Please try again.');
        } finally {
            setRegistering(null);
        }
    };

    const handleCancelConfirm = async () => {
        if (!confirmCancel) return;
        const { rsvp, event } = confirmCancel;
        setConfirmCancel(null);
        setCancelling(rsvp.rsvpId);
        try {
            await rsvpRepository.updateRSVP(rsvp.rsvpId, { status: RSVPStatus.CANCELLED });
            await eventRepository.updateEvent(event.eventId, {
                registeredCount: Math.max(0, (event.registeredCount ?? 1) - 1),
            });
            showAlert('success', `Registration for "${event.name}" cancelled.`);
            await fetchData();
        } catch (err) {
            console.error('Cancel error:', err);
            showAlert('error', 'Failed to cancel. Please try again.');
        } finally {
            setCancelling(null);
        }
    };

    const handleEdit = (event: Event) => {
        setEditEvent(event);
        setCreateForm({
            name: event.name,
            description: event.description,
            type: event.type,
            location: event.location,
            capacity: event.capacity,
            startTime: event.startTime.toDate().toISOString().slice(0, 16),
            endTime: event.endTime.toDate().toISOString().slice(0, 16),
            fee: event.fee,
            imageUrl: event.imageUrl ?? '',
            registrationDeadline: event.registrationDeadline
                ? event.registrationDeadline.toDate().toISOString().slice(0, 16)
                : '',
            clubName: event.clubName || '',
        });
        setShowCreateDialog(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await eventRepository.deleteEvent(deleteTarget.eventId);
            showAlert('success', 'Event deleted successfully.');
            setDeleteTarget(null);
            await fetchData();
        } catch (err) {
            console.error('Delete error:', err);
            showAlert('error', 'Failed to delete event.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Events</Typography>
                    <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {isAdmin ? 'Monitor all events across all clubs.' : isOfficer ? 'Manage your club events.' : 'Discover, register, and track events around campus.'}
                    </Typography>
                </Box>
                {/* Add Event button — visible only to Officers */}
                {isOfficer && (
                    <GradientButton
                        startIcon={<Add />}
                        onClick={async () => {
                            // Fetch officer's club and open dialog
                            if (!officerClub && user) {
                                try {
                                    const clubs = await clubRepository.getClubsByOfficer(user.userId);
                                    setOfficerClub(clubs[0] ?? null);
                                } catch (e) { /* ignore */ }
                            }
                            setEditEvent(null);
                            setCreateForm(emptyEventForm);
                            setShowCreateDialog(true);
                        }}
                        id="events-page-add-event-btn"
                    >
                        Add Event
                    </GradientButton>
                )}
            </Box>

            {/* Alert */}
            {alert && (
                <Alert severity={alert.type} sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setAlert(null)}>
                    {alert.msg}
                </Alert>
            )}

            {/* Tabs — Registered Events hidden for admins and officers */}
            <Box sx={{ borderBottom: '2px solid var(--border-light)', mb: 0 }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v as TabId)}
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none', fontWeight: 600, fontSize: '0.9rem',
                            color: 'var(--text-muted)', minHeight: 46,
                            '&.Mui-selected': { color: 'var(--primary)' },
                        },
                        '& .MuiTabs-indicator': { background: 'var(--primary)', height: 3, borderRadius: '3px 3px 0 0' },
                    }}
                >
                    <Tab
                        value={0}
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <EventIcon sx={{ fontSize: '1.1rem' }} />
                                Upcoming Events
                                {!loading && upcomingEvents.length > 0 && (
                                    <Chip label={upcomingEvents.length} size="small" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'var(--primary)', color: '#fff' }} />
                                )}
                            </Box>
                        }
                        id="events-tab-0"
                    />
                    {/* Registered Events - hidden for admins and officers */}
                    {!hideRegisteredTab && (
                        <Tab
                            value={1}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <HowToReg sx={{ fontSize: '1.1rem' }} />
                                    Registered Events
                                    {!loading && registeredEvents.length > 0 && (
                                        <Chip label={registeredEvents.length} size="small" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#16a34a', color: '#fff' }} />
                                    )}
                                </Box>
                            }
                            id="events-tab-1"
                        />
                    )}
                    <Tab
                        value={2}
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircle sx={{ fontSize: '1.1rem' }} />
                                Completed Events
                            </Box>
                        }
                        id="events-tab-2"
                    />
                </Tabs>
            </Box>

            {/* Search Bar and View Toggle */}
            <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search events, clubs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'var(--text-muted)', fontSize: '1.1rem' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        flex: 1,
                        minWidth: '250px',
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            background: '#fff',
                            fontSize: '0.9rem',
                            '& fieldset': { borderColor: 'var(--border-light)' },
                            '&:hover fieldset': { borderColor: 'var(--text-dim)' },
                            '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
                        },
                    }}
                />

                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, val) => val && setViewMode(val)}
                    size="small"
                    sx={{
                        background: '#fff',
                        borderRadius: '10px',
                        border: '1px solid var(--border-light)',
                        '& .MuiToggleButton-root': {
                            border: 'none',
                            px: 2,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            gap: 1,
                            color: 'var(--text-muted)',
                            '&.Mui-selected': {
                                background: 'var(--primary)',
                                color: '#fff',
                                '&:hover': { background: 'var(--primary-dark)' }
                            }
                        }
                    }}
                >
                    <ToggleButton value="list">
                        <ViewList sx={{ fontSize: '1.2rem' }} />
                        ListView
                    </ToggleButton>
                    <ToggleButton value="calendar">
                        <CalendarMonth sx={{ fontSize: '1.2rem' }} />
                        CalendarView
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Loading */}
            {loading ? (
                <Grid container spacing={2.5}>
                    {[1, 2, 3].map(i => (
                        <Grid item xs={12} key={i}>
                            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '12px' }} />
                        </Grid>
                    ))}
                </Grid>
            ) : viewMode === 'calendar' ? (
                <Box sx={{ mt: 2 }}>
                    <EventCalendar 
                        events={tab === 0 ? upcomingEvents : tab === 1 ? registeredEvents : completedEvents} 
                    />
                </Box>
            ) : (
                <>
                    {/* TAB 0: Upcoming */}
                    {tab === 0 && (
                        <Grid container spacing={2.5}>
                            {upcomingEvents.length === 0 ? (
                                <EmptyState icon={<EventIcon sx={{ fontSize: 'inherit' }} />} message="No upcoming events right now. Check back soon!" />
                            ) : (
                                upcomingEvents.map(event => (
                                    <Grid item xs={12} key={event.eventId}>
                                        <UpcomingCard
                                            event={event}
                                            registeredIds={registeredEventIds}
                                            onRegister={handleRegister}
                                            registering={registering}
                                            userRole={user?.role}
                                            onEdit={handleEdit}
                                            onDelete={(e) => setDeleteTarget(e)}
                                            onCancel={(rsvp, event) => setConfirmCancel({ rsvp, event })}
                                            onGetRSVP={getRSVPForEvent}
                                        />
                                    </Grid>
                                ))
                            )}
                        </Grid>
                    )}

                    {/* TAB 1: Registered (students only, hidden for admin/officer) */}
                    {tab === 1 && !hideRegisteredTab && (
                        <Grid container spacing={2.5}>
                            {registeredEvents.length === 0 ? (
                                <EmptyState icon={<HowToReg sx={{ fontSize: 'inherit' }} />} message="You haven't registered for any upcoming events yet." />
                            ) : (
                                registeredEvents.map(event => {
                                    const rsvp = getRSVPForEvent(event.eventId);
                                    if (!rsvp) return null;
                                    return (
                                        <Grid item xs={12} key={event.eventId}>
                                            <RegisteredCard
                                                event={event}
                                                rsvp={rsvp}
                                                onCancel={(r, e) => setConfirmCancel({ rsvp: r, event: e })}
                                                cancelling={cancelling}
                                            />
                                        </Grid>
                                    );
                                })
                            )}
                        </Grid>
                    )}

                    {tab === 2 && (
                        <Grid container spacing={2.5}>
                            {completedEvents.length === 0 ? (
                                <EmptyState icon={<CheckCircle sx={{ fontSize: 'inherit' }} />} message="No completed events to show yet." />
                            ) : (
                                completedEvents.map(event => (
                                    <Grid item xs={12} key={event.eventId}>
                                        <CompletedCard event={event} />
                                    </Grid>
                                ))
                            )}
                        </Grid>
                    )}
                </>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                PaperProps={{ sx: { background: 'var(--bg-main)', border: '1px solid var(--border-glass)', borderRadius: 4, color: 'var(--text-main)', minWidth: 340 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Delete Event?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Are you sure you want to permanently delete <strong>"{deleteTarget?.name}"</strong>?
                        This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button onClick={() => setDeleteTarget(null)} sx={{ color: 'var(--text-dim)', textTransform: 'none' }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleDeleteConfirm}
                        disabled={deleting}
                        sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                        {deleting ? <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} /> : null}
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel Confirmation Dialog */}
            <Dialog
                open={!!confirmCancel}
                onClose={() => setConfirmCancel(null)}
                PaperProps={{ sx: { background: 'var(--bg-main)', border: '1px solid var(--border-glass)', borderRadius: 4, color: 'var(--text-main)', minWidth: 340 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Cancel Registration?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Are you sure you want to cancel your registration for <strong>{confirmCancel?.event.name}</strong>?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button onClick={() => setConfirmCancel(null)} sx={{ color: 'var(--text-dim)', textTransform: 'none' }}>
                        Keep Registration
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCancelConfirm}
                        sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                        Yes, Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Create Event Dialog (inline for officers) ────────────────── */}
            <Dialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { background: 'var(--bg-main)', border: '1px solid var(--border-glass)', borderRadius: 4, color: 'var(--text-main)' } }}
            >
                <DialogTitle sx={{ 
                    fontWeight: 800, 
                    borderBottom: '1px solid var(--border-glass)', 
                    pb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    fontSize: '1.4rem'
                }}>
                    <Box sx={{ 
                        fontSize: '1.8rem', 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 44,
                        height: 44,
                        borderRadius: '10px',
                        background: 'rgba(201,151,58,0.1)',
                        color: 'var(--accent-gold)'
                    }}>
                        {editEvent ? '✏️' : '🎉'}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                            {editEvent ? 'Edit Event' : 'Create New Event'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                            {editEvent ? 'Modify existing event details' : 'Share a new experience with the community'}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Grid container spacing={2.5}>
                        <Grid item xs={12}>
                            <StyledInput fullWidth label="Event Name *" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput select fullWidth label="Category *" value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value as EventType })}>
                                {EVENT_TYPE_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                            </StyledInput>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth label="Club Name (optional)" value={createForm.clubName} onChange={e => setCreateForm({ ...createForm, clubName: e.target.value })} placeholder={officerClub?.name || "Enter club name"} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth type="datetime-local" label="Event Date & Start Time *" value={createForm.startTime} onChange={e => setCreateForm({ ...createForm, startTime: e.target.value })} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth type="datetime-local" label="End Time *" value={createForm.endTime} onChange={e => setCreateForm({ ...createForm, endTime: e.target.value })} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth type="datetime-local" label="Registration Deadline" value={createForm.registrationDeadline} onChange={e => setCreateForm({ ...createForm, registrationDeadline: e.target.value })} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth type="number" label="Maximum Participants *" value={createForm.capacity} onChange={e => setCreateForm({ ...createForm, capacity: Number(e.target.value) })} inputProps={{ min: 1 }} />
                        </Grid>
                        <Grid item xs={12}>
                            <StyledInput fullWidth label="Venue / Location" value={createForm.location} onChange={e => setCreateForm({ ...createForm, location: e.target.value })} />
                        </Grid>
                        <Grid item xs={12}>
                            <StyledInput fullWidth label="Event Poster / Image URL (optional)" value={createForm.imageUrl} onChange={e => setCreateForm({ ...createForm, imageUrl: e.target.value })} InputProps={{ startAdornment: <ImageIcon sx={{ mr: 1, color: 'var(--text-dim)', fontSize: '1.1rem' }} /> }} />
                        </Grid>
                        <Grid item xs={12}>
                            <StyledInput fullWidth multiline rows={3} label="Event Description" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid var(--border-glass)', gap: 1 }}>
                    <Button onClick={() => setShowCreateDialog(false)} sx={{ color: 'var(--text-dim)', textTransform: 'none' }}>Cancel</Button>
                    <GradientButton
                        onClick={async () => {
                            if (!createForm.name || !createForm.startTime || !createForm.endTime) {
                                showAlert('error', 'Please fill in all required fields (Name, Start Time, End Time).');
                                return;
                            }
                            setCreating(true);
                            try {
                                const eventData: any = {
                                    name: createForm.name,
                                    description: createForm.description,
                                    type: createForm.type,
                                    location: createForm.location,
                                    capacity: createForm.capacity,
                                    fee: createForm.fee,
                                    clubId: editEvent ? editEvent.clubId : (officerClub?.clubId || 'unassigned'),
                                    clubName: createForm.clubName || (editEvent ? editEvent.clubName : officerClub?.name) || 'Unassigned',
                                    status: editEvent ? editEvent.status : EventStatus.ACTIVE,
                                    startTime: Timestamp.fromDate(new Date(createForm.startTime)),
                                    endTime: Timestamp.fromDate(new Date(createForm.endTime)),
                                    registeredCount: editEvent ? editEvent.registeredCount : 0,
                                    qrCodeData: editEvent ? editEvent.qrCodeData : `CONNECT-${Date.now()}`,
                                    tags: editEvent ? editEvent.tags : [],
                                    venueId: editEvent ? editEvent.venueId : 'default-venue',
                                    imageUrl: createForm.imageUrl || undefined,
                                    registrationDeadline: createForm.registrationDeadline
                                        ? Timestamp.fromDate(new Date(createForm.registrationDeadline))
                                        : undefined,
                                    createdAt: editEvent ? editEvent.createdAt : Timestamp.now(),
                                };
                                if (editEvent) {
                                    await eventRepository.updateEvent(editEvent.eventId, eventData);
                                    showAlert('success', `Event "${createForm.name}" updated!`);
                                } else {
                                    await eventRepository.createEvent(eventData);
                                    showAlert('success', `Event "${createForm.name}" created successfully!`);
                                }
                                setShowCreateDialog(false);
                                setEditEvent(null);
                                await fetchData();
                                setTab(0); // switch to Upcoming tab
                            } catch (err) {
                                console.error('Create event error:', err);
                                showAlert('error', 'Failed to create event. Please try again.');
                            } finally {
                                setCreating(false);
                            }
                        }}
                        disabled={creating}
                    >
                        {creating ? <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} /> : null}
                        Create Event
                    </GradientButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
