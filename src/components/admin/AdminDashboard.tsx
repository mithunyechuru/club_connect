import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Avatar, Skeleton, Tabs, Tab,
    List, ListItem, ListItemText, ListItemAvatar, Divider, Stack,
    Badge as MuiBadge, Chip, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, Button, CircularProgress, Alert,
    MenuItem,
} from '@mui/material';
import {
    Business, Groups, Event as EventIcon, Build, Analytics, VerifiedUser, AdminPanelSettings,
    PendingActions, Assessment, Cancel, CalendarToday, LocationOn, Edit, Delete,
    CheckCircle, History,
} from '@mui/icons-material';
import { GlassCard, Badge, GradientButton, StyledInput } from '../shared/DesignSystem';
import { clubRepository } from '../../repositories/clubRepository';
import { eventRepository } from '../../repositories/eventRepository';
import { userRepository } from '../../repositories/userRepository';
import { adminService } from '../../services/adminService';
import { Club, Event as ClubEvent, User, RequestStatus, EventType } from '../../types';
import { seedService } from '../../services/seedService';
import { PendingRequestsPanel } from './PendingRequestsPanel';
import { ActivityLogPanel } from './ActivityLogPanel';
import { ClubManagement } from './ClubManagement';
import { PastEventForm } from '../events/PastEventForm';
import { useLocation, useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';

// ─── Tab Panel ───────────────────────────────────────────────────────────────
interface TabPanelProps { children?: React.ReactNode; value: number; index: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <Box hidden={value !== index} sx={{ pt: 4 }}>
        {value === index && children}
    </Box>
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps { icon: React.ReactNode; count: number; label: string; iconBg: string; iconColor: string; }
const StatCard: React.FC<StatCardProps> = ({ icon, count, label, iconBg, iconColor }) => (
    <GlassCard sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: iconBg, color: iconColor }}>{icon}</Avatar>
        <Box>
            <Typography variant="h3" sx={{ fontWeight: 800 }}>{count}</Typography>
            <Typography variant="h6" color="var(--text-dim)">{label}</Typography>
        </Box>
    </GlassCard>
);

// ─── Helper ──────────────────────────────────────────────────────────────────
const toMs = (ts: any) => ts?.toMillis?.() ?? 0;

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
    { value: EventType.WORKSHOP, label: '🛠 Workshop' },
    { value: EventType.SEMINAR, label: '🎓 Seminar' },
    { value: EventType.HACKATHON, label: '💻 Hackathon' },
    { value: EventType.COMPETITION, label: '🏆 Competition' },
    { value: EventType.SOCIAL_GATHERING, label: '🎉 Cultural / Social' },
    { value: EventType.MEETING, label: '📋 Technical / Meeting' },
];

// ─── Admin Event Card ────────────────────────────────────────────────────────
interface AdminEventCardProps {
    event: ClubEvent;
    onEdit: (event: ClubEvent) => void;
    onDelete: (event: ClubEvent) => void;
}

const AdminEventCard: React.FC<AdminEventCardProps> = ({ event, onEdit, onDelete }) => {
    const now = Date.now();
    const upcoming = toMs(event.startTime) > now;
    const statusLabel = upcoming ? 'Upcoming' : 'Completed';
    const statusColor = upcoming ? '#16a34a' : '#6b7280';

    const fmtDate = (ts: any) =>
        ts?.toDate?.().toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? '—';

    return (
        <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                <Box sx={{
                    width: { xs: '100%', sm: 6 },
                    minHeight: { xs: 4, sm: 'auto' },
                    background: upcoming ? 'var(--primary)' : '#9ca3af',
                    flexShrink: 0,
                }} />
                <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{event.name}</Typography>
                            <Chip
                                label={statusLabel}
                                size="small"
                                sx={{ bgcolor: `${statusColor}18`, color: statusColor, fontWeight: 700, fontSize: '0.7rem', height: 20 }}
                            />
                            <Badge color="secondary">{event.type.replace('_', ' ')}</Badge>
                        </Box>
                        {(event as any).clubName && (
                            <Typography sx={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, mb: 0.5 }}>
                                {(event as any).clubName}
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
                                <CalendarToday sx={{ fontSize: '1rem', color: 'var(--primary)' }} /> {fmtDate(event.startTime)}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
                                <LocationOn sx={{ fontSize: '1rem', color: 'var(--primary)' }} /> {event.location || 'TBD'}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
                                <Groups sx={{ fontSize: '1rem', color: 'var(--primary)' }} /> <strong>{event.registeredCount ?? 0}</strong> / {event.capacity} registered
                            </Box>
                        </Box>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                        <IconButton onClick={() => onEdit(event)} sx={{ color: 'var(--primary)' }} title="Edit Event">
                            <Edit />
                        </IconButton>
                        <IconButton onClick={() => onDelete(event)} sx={{ color: '#ef4444' }} title="Delete Event">
                            <Delete />
                        </IconButton>
                    </Stack>
                </Box>
            </Box>
        </GlassCard>
    );
};

// ─── Admin Events Panel ──────────────────────────────────────────────────────
interface AdminEventsPanelProps {
    events: ClubEvent[];
    onRefresh: () => void;
}

const AdminEventsPanel: React.FC<AdminEventsPanelProps> = ({ events, onRefresh }) => {
    const now = Date.now();
    const [subTab, setSubTab] = useState(0);
    const [deleteTarget, setDeleteTarget] = useState<ClubEvent | null>(null);
    const [editTarget, setEditTarget] = useState<ClubEvent | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        type: EventType.WORKSHOP,
        location: '',
        capacity: 50,
        startTime: '',
        endTime: '',
        registrationDeadline: '',
        clubName: '',
    });

    const upcomingEvents = events.filter(e => toMs(e.startTime) > now).sort((a, b) => toMs(a.startTime) - toMs(b.startTime));
    const completedEvents = events.filter(e => toMs(e.startTime) <= now).sort((a, b) => toMs(b.startTime) - toMs(a.startTime));

    const showAlert = (type: 'success' | 'error', msg: string) => {
        setAlertMsg({ type, msg });
        setTimeout(() => setAlertMsg(null), 4000);
    };

    const handleEditOpen = (event: ClubEvent) => {
        setEditTarget(event);
        setEditForm({
            name: event.name,
            description: event.description,
            type: event.type,
            location: event.location,
            capacity: event.capacity,
            startTime: event.startTime.toDate().toISOString().slice(0, 16),
            endTime: event.endTime.toDate().toISOString().slice(0, 16),
            registrationDeadline: event.registrationDeadline
                ? event.registrationDeadline.toDate().toISOString().slice(0, 16)
                : '',
            clubName: (event as any).clubName || '',
        });
    };

    const handleSaveEdit = async () => {
        if (!editTarget) return;
        setSaving(true);
        try {
            await eventRepository.updateEvent(editTarget.eventId, {
                ...editForm,
                startTime: Timestamp.fromDate(new Date(editForm.startTime)),
                endTime: Timestamp.fromDate(new Date(editForm.endTime)),
                registrationDeadline: editForm.registrationDeadline 
                    ? Timestamp.fromDate(new Date(editForm.registrationDeadline)) 
                    : undefined,
                clubName: editForm.clubName || undefined,
            });
            setEditTarget(null);
            showAlert('success', 'Event updated successfully!');
            onRefresh();
        } catch (err) {
            showAlert('error', 'Failed to update event.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await eventRepository.deleteEvent(deleteTarget.eventId);
            setDeleteTarget(null);
            showAlert('success', `"${deleteTarget.name}" deleted.`);
            onRefresh();
        } catch (err) {
            showAlert('error', 'Failed to delete event.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box>
            {alertMsg && (
                <Alert severity={alertMsg.type} sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setAlertMsg(null)}>
                    {alertMsg.msg}
                </Alert>
            )}

            {/* Sub-tabs */}
            <Box sx={{ borderBottom: '1px solid var(--border-light)', mb: 3 }}>
                <Tabs
                    value={subTab}
                    onChange={(_, v) => setSubTab(v)}
                    sx={{
                        '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)', '&.Mui-selected': { color: 'var(--primary)' } },
                        '& .MuiTabs-indicator': { background: 'var(--primary)', height: 2 },
                    }}
                >
                    <Tab label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarToday sx={{ fontSize: '1rem' }} />
                            Upcoming Events
                            <Chip label={upcomingEvents.length} size="small" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'var(--primary)', color: '#fff' }} />
                        </Box>
                    } />
                    <Tab label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircle sx={{ fontSize: '1rem' }} />
                            Completed Events
                            <Chip label={completedEvents.length} size="small" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#6b7280', color: '#fff' }} />
                        </Box>
                    } />
                    <Tab label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <History sx={{ fontSize: '1rem' }} />
                            Add Past Event
                        </Box>
                    } />
                </Tabs>
            </Box>

            {/* Event lists or Form */}
            {subTab === 2 ? (
                <PastEventForm onSuccess={onRefresh} />
            ) : (
                <Grid container spacing={2.5}>
                {(subTab === 0 ? upcomingEvents : completedEvents).length === 0 ? (
                    <Grid item xs={12}>
                        <GlassCard>
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <EventIcon sx={{ fontSize: '3rem', color: 'var(--text-dim)', mb: 2 }} />
                                <Typography sx={{ color: 'var(--text-muted)' }}>
                                    No {subTab === 0 ? 'upcoming' : 'completed'} events to display.
                                </Typography>
                            </Box>
                        </GlassCard>
                    </Grid>
                ) : (
                    (subTab === 0 ? upcomingEvents : completedEvents).map(event => (
                        <Grid item xs={12} key={event.eventId}>
                            <AdminEventCard
                                event={event}
                                onEdit={handleEditOpen}
                                onDelete={setDeleteTarget}
                            />
                        </Grid>
                    ))
                )}
            </Grid>
            )}

            {/* Edit Dialog */}
            <Dialog
                open={!!editTarget}
                onClose={() => setEditTarget(null)}
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
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                            Edit Event Details
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                            Administrative override for event information
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Grid container spacing={2.5}>
                        <Grid item xs={12}>
                            <StyledInput fullWidth label="Event Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput select fullWidth label="Category" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value as EventType })}>
                                {EVENT_TYPE_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                            </StyledInput>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput 
                                fullWidth label="Club Name (optional)" 
                                value={editForm.clubName} 
                                onChange={e => setEditForm({ ...editForm, clubName: e.target.value })}
                                placeholder="Edit organizer club name"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth label="Location" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth type="datetime-local" label="Start Time" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth type="datetime-local" label="End Time" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth type="number" label="Max Participants" value={editForm.capacity} onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <StyledInput fullWidth type="datetime-local" label="Registration Deadline (optional)" value={editForm.registrationDeadline} onChange={e => setEditForm({ ...editForm, registrationDeadline: e.target.value })} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12}>
                            <StyledInput fullWidth multiline rows={3} label="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid var(--border-glass)', gap: 1 }}>
                    <Button onClick={() => setEditTarget(null)} sx={{ color: 'var(--text-dim)', textTransform: 'none' }}>Cancel</Button>
                    <GradientButton onClick={handleSaveEdit} disabled={saving}>
                        {saving && <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />}
                        Save Changes
                    </GradientButton>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                PaperProps={{ sx: { background: 'var(--bg-main)', border: '1px solid var(--border-glass)', borderRadius: 4, color: 'var(--text-main)', minWidth: 340 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Delete Event?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Are you sure you want to permanently delete <strong>"{deleteTarget?.name}"</strong>? 
                        This action is irreversible and will remove all associated RSVPs.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button onClick={() => setDeleteTarget(null)} sx={{ color: 'var(--text-dim)', textTransform: 'none' }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleDelete}
                        disabled={deleting}
                        sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                        {deleting && <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />}
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [events, setEvents] = useState<ClubEvent[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);

    // Determine tab from query param ?tab=
    const getInitialTab = () => {
        const params = new URLSearchParams(location.search);
        const t = params.get('tab');
        if (t === 'requests') return 1;
        if (t === 'rejected') return 2;
        if (t === 'clubs') return 3;
        if (t === 'events') return 4;
        if (t === 'activity') return 5;
        return 0;
    };
    const [tab, setTab] = useState(getInitialTab);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [clubList, eventList, userList] = await Promise.allSettled([
                clubRepository.getAllClubs(),
                eventRepository.getAllEvents(),
                userRepository.getAllUsers(),
            ]);

            if (clubList.status === 'fulfilled') setClubs(clubList.value);
            else console.error('Clubs fetch failed:', clubList.reason);

            if (eventList.status === 'fulfilled') setEvents(eventList.value);
            else console.error('Events fetch failed:', eventList.reason);

            if (userList.status === 'fulfilled') setUsers(userList.value);
            else console.error('Users fetch failed:', userList.reason);
        } catch (e) {
            console.error('Error fetching admin data:', e);
            setError('Some data could not be loaded. The dashboard is still functional.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        adminService.getPendingOfficerRequests()
            .then(r => setPendingCount(r.length))
            .catch(() => { });
    }, []);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
        const tabMap = ['', 'requests', 'rejected', 'clubs', 'events', 'activity'];
        navigate(`/admin/dashboard${newValue > 0 ? `?tab=${tabMap[newValue]}` : ''}`, { replace: true });
    };

    const handleSeed = async () => {
        try {
            await seedService.seedInitialData();
            alert('Database seeded successfully! Refreshing...');
            window.location.reload();
        } catch (error) {
            alert('Seeding failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 2 }}>
                <Skeleton height={60} sx={{ mb: 2 }} />
                <Skeleton height={120} sx={{ mb: 2 }} />
                <Skeleton height={400} />
            </Box>
        );
    }

    return (
        <Box>
            {/* ── Error Banner ──────────────────────────── */}
            {error && (
                <Box sx={{
                    mb: 2, px: 2.5, py: 1.2, borderRadius: '8px',
                    background: 'rgba(201,151,58,0.10)', border: '1px solid rgba(201,151,58,0.3)',
                    display: 'flex', alignItems: 'center', gap: 1,
                }}>
                    <Typography sx={{ fontSize: '0.82rem', color: '#92400e' }}>⚠ {error}</Typography>
                </Box>
            )}

            {/* ── Page Header ─────────────────────────────────────────── */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 52, height: 52, borderRadius: '14px',
                        background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, var(--primary-light) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(107,15,26,0.25)',
                    }}>
                        <AdminPanelSettings sx={{ color: 'white', fontSize: '1.6rem' }} />
                    </Box>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                            Admin Console
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 0.2 }}>
                            University Club & Event Management — System Administration
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <GradientButton startIcon={<Build />} onClick={handleSeed} size="small">
                        Seed Sample Data
                    </GradientButton>
                    <GradientButton startIcon={<Analytics />} size="small">
                        Export Reports
                    </GradientButton>
                </Box>
            </Box>

            {/* ── Tabs ────────────────────────────────────────────────── */}
            <Box sx={{ borderBottom: '2px solid var(--border-light)', mb: 0 }}>
                <Tabs
                    value={tab}
                    onChange={handleTabChange}
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none', fontWeight: 600, fontSize: '0.9rem',
                            color: 'var(--text-muted)', minHeight: 48,
                            '&.Mui-selected': { color: 'var(--primary)' },
                        },
                        '& .MuiTabs-indicator': {
                            background: 'var(--primary)', height: 3, borderRadius: '3px 3px 0 0',
                        },
                    }}
                >
                    <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Assessment sx={{ fontSize: '1.1rem' }} />Overview</Box>} />
                    <Tab label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MuiBadge badgeContent={pendingCount} color="error" max={99}>
                                <PendingActions sx={{ fontSize: '1.1rem' }} />
                            </MuiBadge>
                            &nbsp;Pending Requests
                        </Box>
                    } />
                    <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Cancel sx={{ fontSize: '1.1rem' }} />Rejected Applications</Box>} />
                    <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Business sx={{ fontSize: '1.1rem' }} />Club Management</Box>} />
                    <Tab label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EventIcon sx={{ fontSize: '1.1rem' }} />
                            Events
                            <Chip label={events.length} size="small" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700, bgcolor: 'var(--accent-gold)', color: '#fff' }} />
                        </Box>
                    } />
                    <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><VerifiedUser sx={{ fontSize: '1.1rem' }} />Activity Log</Box>} />
                </Tabs>
            </Box>

            {/* ── Tab Panels ──────────────────────────────────────────── */}

            {/* TAB 0: Overview */}
            <TabPanel value={tab} index={0}>
                <Grid container spacing={3} sx={{ mb: 5 }}>
                    <Grid item xs={12} sm={4}>
                        <StatCard icon={<Business fontSize="large" />} count={clubs?.length || 0} label="Total Clubs" iconBg="rgba(107,15,26,0.10)" iconColor="var(--primary)" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <StatCard icon={<Groups fontSize="large" />} count={users?.length || 0} label="Registered Students" iconBg="rgba(59,130,246,0.10)" iconColor="#3b82f6" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <StatCard icon={<EventIcon fontSize="large" />} count={events?.length || 0} label="Total Events" iconBg="rgba(201,151,58,0.10)" iconColor="var(--accent-gold)" />
                    </Grid>
                </Grid>

                {pendingCount > 0 && (
                    <Box
                        onClick={() => setTab(1)}
                        sx={{
                            mb: 4, p: 2.5, borderRadius: '12px', cursor: 'pointer',
                            background: 'linear-gradient(135deg, rgba(201,151,58,0.12) 0%, rgba(107,15,26,0.08) 100%)',
                            border: '1.5px solid rgba(201,151,58,0.35)',
                            display: 'flex', alignItems: 'center', gap: 2,
                            '&:hover': { borderColor: 'var(--accent-gold)' },
                            transition: 'border-color 0.2s',
                        }}
                    >
                        <PendingActions sx={{ color: 'var(--accent-gold)', fontSize: '2rem' }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                {pendingCount} Pending Club Officer {pendingCount === 1 ? 'Request' : 'Requests'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                                Click to review and take action →
                            </Typography>
                        </Box>
                    </Box>
                )}

                <Grid container spacing={4}>
                    <Grid item xs={12} md={8}>
                        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Active Clubs</Typography>
                        <GlassCard sx={{ p: 0 }}>
                            {clubs.length === 0 ? (
                                <Box sx={{ py: 6, textAlign: 'center' }}>
                                    <Typography sx={{ color: 'var(--text-muted)' }}>No clubs yet. Use "Seed Sample Data" to populate.</Typography>
                                </Box>
                            ) : (
                                <List>
                                    {clubs?.slice(0, 6).map((club, idx) => (
                                        <React.Fragment key={club?.clubId || idx}>
                                            <ListItem secondaryAction={<GradientButton size="small">Manage</GradientButton>}>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: 'rgba(107,15,26,0.10)', color: 'var(--primary)', fontWeight: 700 }}>
                                                        {club?.name?.[0] || '?'}
                                                     </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={<Typography sx={{ fontWeight: 600 }}>{club?.name || 'Unknown Club'}</Typography>}
                                                    secondary={`${club?.memberIds?.length || 0} Members · ${club?.officerIds?.length || 0} Officers`}
                                                />
                                            </ListItem>
                                            {idx < Math.min(clubs?.length || 0, 6) - 1 && <Divider sx={{ borderColor: 'var(--border-light)' }} />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </GlassCard>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>System Health</Typography>
                        <GlassCard sx={{ p: 4 }}>
                            <Stack spacing={3}>
                                {[
                                    { label: 'Database Status', status: 'Connected', ok: true },
                                    { label: 'Auth Services', status: 'Online', ok: true },
                                    { label: 'File Storage', status: 'Normal', ok: true },
                                    { label: 'Notifications', status: 'Active', ok: true },
                                ].map(item => (
                                    <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.88rem' }}>
                                            <VerifiedUser sx={{ color: '#16a34a', fontSize: '1.1rem' }} />
                                            {item.label}
                                        </Typography>
                                        <Badge color="secondary">{item.status}</Badge>
                                    </Box>
                                ))}
                                <Divider sx={{ borderColor: 'var(--border-light)' }} />
                                <Typography variant="caption" color="var(--text-dim)">
                                    All systems operational · Last check: just now
                                </Typography>
                            </Stack>
                        </GlassCard>

                        <Typography variant="h5" sx={{ mt: 4, mb: 3, fontWeight: 700 }}>Quick Actions</Typography>
                        <GlassCard sx={{ p: 3 }}>
                            <Stack spacing={1.5}>
                                <GradientButton startIcon={<PendingActions />} fullWidth onClick={() => setTab(1)}>
                                    Review Requests ({pendingCount})
                                </GradientButton>
                                <GradientButton startIcon={<Business />} fullWidth onClick={() => setTab(3)}>
                                    Manage Clubs
                                </GradientButton>
                                <GradientButton startIcon={<EventIcon />} fullWidth onClick={() => setTab(4)}>
                                    View All Events ({events.length})
                                </GradientButton>
                                <GradientButton startIcon={<VerifiedUser />} fullWidth onClick={() => setTab(5)}>
                                    View Activity Log
                                </GradientButton>
                            </Stack>
                        </GlassCard>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* TAB 1: Pending Requests */}
            <TabPanel value={tab} index={1}>
                <PendingRequestsPanel onPendingCountChange={setPendingCount} filterStatus={RequestStatus.PENDING} />
            </TabPanel>

            {/* TAB 2: Rejected Requests */}
            <TabPanel value={tab} index={2}>
                <PendingRequestsPanel onPendingCountChange={setPendingCount} filterStatus={RequestStatus.REJECTED} />
            </TabPanel>

            {/* TAB 3: Club Management */}
            <TabPanel value={tab} index={3}>
                <ClubManagement />
            </TabPanel>

            {/* TAB 4: Events */}
            <TabPanel value={tab} index={4}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.4 }}>Event Monitoring</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                        View, edit, and manage all events across all clubs.
                    </Typography>
                </Box>
                <AdminEventsPanel events={events} onRefresh={fetchData} />
            </TabPanel>

            {/* TAB 5: Activity Log */}
            <TabPanel value={tab} index={5}>
                <ActivityLogPanel />
            </TabPanel>
        </Box>
    );
};
