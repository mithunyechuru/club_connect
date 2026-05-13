import React, { useEffect, useState } from 'react';
import {
    Typography, Box, Grid, CircularProgress, IconButton, Stack, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip,
    Alert, Tabs, Tab,
} from '@mui/material';
import { 
    Add, Edit, Delete, Event as EventIcon, QrCodeScanner, 
    Image as ImageIcon, CalendarToday, CheckCircle, History 
} from '@mui/icons-material';
import { GlassCard, Badge, GradientButton, StyledInput } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { clubRepository } from '../../repositories/clubRepository';
import { eventRepository } from '../../repositories/eventRepository';
import { Event, EventType, EventStatus } from '../../types';
import { Timestamp } from 'firebase/firestore';
import { PastEventForm } from '../events/PastEventForm';

// ─── Category options mapped to EventType ────────────────────────────────────
const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
    { value: EventType.WORKSHOP, label: '🛠 Workshop' },
    { value: EventType.SEMINAR, label: '🎓 Seminar' },
    { value: EventType.HACKATHON, label: '💻 Hackathon' },
    { value: EventType.COMPETITION, label: '🏆 Competition' },
    { value: EventType.SOCIAL_GATHERING, label: '🎉 Cultural / Social' },
    { value: EventType.MEETING, label: '📋 Technical / Meeting' },
];

const isEventUpcoming = (event: Event) =>
    (event.startTime as any)?.toMillis?.() > Date.now();

// ─── Form initial state ──────────────────────────────────────────────────────
const emptyForm = {
    name: '',
    description: '',
    type: EventType.WORKSHOP,
    location: '',
    capacity: 50,
    startTime: '',
    endTime: '',
    fee: 0,
    imageUrl: '',
    registrationDeadline: '',
    clubName: '',
};

export const EventManagement: React.FC = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [activeClub, setActiveClub] = useState<any>(null);
    const [myClubs, setMyClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editEvent, setEditEvent] = useState<Event | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [subTab, setSubTab] = useState(0);

    const [formData, setFormData] = useState(emptyForm);

    const showAlert = (type: 'success' | 'error', msg: string) => {
        setAlertMsg({ type, msg });
        setTimeout(() => setAlertMsg(null), 4000);
    };

    const fetchData = async () => {
        if (!user) return;
        try {
            const officerClubs = await clubRepository.getClubsByOfficer(user.userId);
            setMyClubs(officerClubs);
            
            if (officerClubs.length > 0) {
                const targetClub = activeClub || officerClubs[0];
                if (!activeClub) setActiveClub(officerClubs[0]);
                
                const clubEvents = await eventRepository.getEventsByClub(targetClub.clubId);
                setEvents(clubEvents);
            } else {
                setActiveClub(null);
                setEvents([]);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchData(); 
    }, [user, activeClub?.clubId]);

    const upcomingEvents = events.filter(e => isEventUpcoming(e)).sort((a, b) => (a.startTime as any).toMillis() - (b.startTime as any).toMillis());
    const completedEvents = events.filter(e => !isEventUpcoming(e)).sort((a, b) => (b.startTime as any).toMillis() - (a.startTime as any).toMillis());

    const openCreate = () => {
        setEditEvent(null);
        setFormData(emptyForm);
        setOpen(true);
    };

    const openEdit = (event: Event) => {
        setEditEvent(event);
        setFormData({
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
        setOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.startTime || !formData.endTime) {
            showAlert('error', 'Please fill in all required fields.');
            return;
        }
        setSaving(true);
        try {
            const eventData: any = {
                ...formData,
                clubId: activeClub?.clubId || 'unassigned',
                clubName: formData.clubName || activeClub?.name || 'Unassigned',
                status: EventStatus.ACTIVE,
                startTime: Timestamp.fromDate(new Date(formData.startTime)),
                endTime: Timestamp.fromDate(new Date(formData.endTime)),
                registeredCount: editEvent ? editEvent.registeredCount : 0,
                qrCodeData: editEvent ? editEvent.qrCodeData : `CONNECT-${Date.now()}`,
                tags: [],
                venueId: 'default-venue',
                imageUrl: formData.imageUrl || undefined,
                registrationDeadline: formData.registrationDeadline
                    ? Timestamp.fromDate(new Date(formData.registrationDeadline))
                    : undefined,
                createdAt: editEvent?.createdAt ?? Timestamp.now(),
            };

            if (editEvent) {
                await eventRepository.updateEvent(editEvent.eventId, eventData);
                showAlert('success', 'Event updated successfully!');
            } else {
                await eventRepository.createEvent(eventData);
                showAlert('success', `Event "${formData.name}" created!`);
            }
            setOpen(false);
            await fetchData();
        } catch (error) {
            console.error('Error saving event:', error);
            showAlert('error', 'Failed to save event. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await eventRepository.deleteEvent(deleteTarget.eventId);
            setDeleteTarget(null);
            showAlert('success', `"${deleteTarget.name}" deleted.`);
            await fetchData();
        } catch (err) {
            console.error('Delete error:', err);
            showAlert('error', 'Failed to delete event.');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress /></Box>;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Event Management</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                        Schedule and manage events for <strong>{activeClub?.name ?? '—'}</strong>
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {myClubs.length > 1 && (
                        <StyledInput
                            select
                            size="small"
                            value={activeClub?.clubId || ''}
                            onChange={(e) => {
                                const club = myClubs.find(c => c.clubId === e.target.value);
                                if (club) setActiveClub(club);
                            }}
                            sx={{ minWidth: 200 }}
                        >
                            {myClubs.map(c => (
                                <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>
                            ))}
                        </StyledInput>
                    )}
                    <GradientButton startIcon={<Add />} onClick={openCreate} id="add-event-btn">
                        Add Event
                    </GradientButton>
                </Box>
            </Box>

            {/* Alert */}
            {alertMsg && (
                <Alert severity={alertMsg.type} sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setAlertMsg(null)}>
                    {alertMsg.msg}
                </Alert>
            )}

            {/* Tabs */}
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

            {subTab === 2 ? (
                <PastEventForm onSuccess={fetchData} />
            ) : (
                <Grid container spacing={3}>
                    {(subTab === 0 ? upcomingEvents : completedEvents).length === 0 ? (
                        <Grid item xs={12}>
                            <GlassCard>
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <EventIcon sx={{ fontSize: '3rem', color: 'var(--text-dim)', mb: 2 }} />
                                    <Typography sx={{ color: 'var(--text-muted)' }}>
                                        No {subTab === 0 ? 'upcoming' : 'completed'} events yet.
                                    </Typography>
                                </Box>
                            </GlassCard>
                        </Grid>
                    ) : (
                        (subTab === 0 ? upcomingEvents : completedEvents).map((event) => {
                            const upcoming = isEventUpcoming(event);
                            return (
                                <Grid item xs={12} key={event.eventId}>
                                    <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
                                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                                            <Box sx={{
                                                width: { xs: '100%', sm: 6 }, minHeight: { xs: 4, sm: 'auto' },
                                                background: upcoming ? 'var(--primary)' : '#9ca3af', flexShrink: 0,
                                            }} />
                                            <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 2 }}>
                                                <Box sx={{
                                                    minWidth: 56, height: 56, borderRadius: 2,
                                                    background: upcoming ? 'var(--primary-glow)' : '#f3f4f6',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: upcoming ? 'var(--primary)' : '#6b7280', flexShrink: 0,
                                                }}>
                                                    <EventIcon />
                                                </Box>

                                                <Box sx={{ flexGrow: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4, flexWrap: 'wrap' }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>{event.name}</Typography>
                                                        <Chip
                                                            label={upcoming ? 'Upcoming' : 'Completed'}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: upcoming ? '#16a34a18' : '#6b728018',
                                                                color: upcoming ? '#16a34a' : '#6b7280',
                                                                fontWeight: 700, fontSize: '0.7rem', height: 20,
                                                            }}
                                                        />
                                                        <Badge color="secondary">{event.type.replace('_', ' ')}</Badge>
                                                    </Box>
                                                    <Typography variant="body2" sx={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                                        {event.startTime.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} &nbsp;·&nbsp; {event.location || 'No location'}
                                                    </Typography>
                                                </Box>

                                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                                                    <Badge color="secondary">{event.registeredCount} / {event.capacity}</Badge>
                                                    <IconButton
                                                        onClick={() => window.location.href = `/officer/attendance/${event.eventId}`}
                                                        sx={{ color: 'var(--accent-gold)' }} title="Attendance"
                                                    >
                                                        <QrCodeScanner />
                                                    </IconButton>
                                                    <IconButton onClick={() => openEdit(event)} sx={{ color: 'var(--primary)' }} title="Edit">
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton onClick={() => setDeleteTarget(event)} sx={{ color: '#ef4444' }} title="Delete">
                                                        <Delete />
                                                    </IconButton>
                                                </Stack>
                                            </Box>
                                        </Box>
                                    </GlassCard>
                                </Grid>
                            );
                        })
                    )}
                </Grid>
            )}

            {/* ── Create / Edit Dialog ──────────────────────────────────────── */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
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
                            {editEvent ? 'Edit Event' : 'Create New Event'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                            {editEvent ? 'Modify existing event details' : 'Share a new experience with the community'}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Grid container spacing={2.5}>
                        {/* Event Name */}
                        <Grid item xs={12}>
                            <StyledInput
                                fullWidth label="Event Name *"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>

                        {/* Category */}
                        <Grid item xs={12} md={6}>
                            <StyledInput
                                select fullWidth label="Category *"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as EventType })}
                            >
                                {EVENT_TYPE_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </StyledInput>
                        </Grid>

                        {/* Optional Club Name */}
                        <Grid item xs={12} md={6}>
                            <StyledInput
                                fullWidth label="Club Name (optional)"
                                value={formData.clubName}
                                onChange={e => setFormData({ ...formData, clubName: e.target.value })}
                                placeholder={activeClub?.name || "Enter club name"}
                            />
                        </Grid>

                        {/* Start Time */}
                        <Grid item xs={12} md={6}>
                            <StyledInput
                                fullWidth type="datetime-local" label="Event Date & Start Time *"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* End Time */}
                        <Grid item xs={12} md={6}>
                            <StyledInput
                                fullWidth type="datetime-local" label="End Time *"
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* Registration Deadline */}
                        <Grid item xs={12} md={6}>
                            <StyledInput
                                fullWidth type="datetime-local" label="Registration Deadline"
                                value={formData.registrationDeadline}
                                onChange={e => setFormData({ ...formData, registrationDeadline: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* Max Participants */}
                        <Grid item xs={12} md={6}>
                            <StyledInput
                                fullWidth type="number" label="Maximum Participants *"
                                value={formData.capacity}
                                onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>

                        {/* Location */}
                        <Grid item xs={12}>
                            <StyledInput
                                fullWidth label="Venue / Location"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </Grid>

                        {/* Image URL */}
                        <Grid item xs={12}>
                            <StyledInput
                                fullWidth label="Event Poster / Image URL (optional)"
                                value={formData.imageUrl}
                                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                InputProps={{ startAdornment: <ImageIcon sx={{ mr: 1, color: 'var(--text-dim)', fontSize: '1.1rem' }} /> }}
                            />
                        </Grid>

                        {/* Description */}
                        <Grid item xs={12}>
                            <StyledInput
                                fullWidth multiline rows={4} label="Event Description"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid var(--border-glass)', gap: 1 }}>
                    <Button onClick={() => setOpen(false)} sx={{ color: 'var(--text-dim)', textTransform: 'none' }}>Cancel</Button>
                    <GradientButton onClick={handleSave} disabled={saving}>
                        {saving ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
                        {editEvent ? 'Save Changes' : 'Create Event'}
                    </GradientButton>
                </DialogActions>
            </Dialog>

            {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
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
        </Box>
    );
};
