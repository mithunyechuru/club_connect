import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Grid, MenuItem, CircularProgress, IconButton,
    Stack, ImageList, ImageListItem, Button,
} from '@mui/material';
import { 
    CloudUpload, Delete, AddCircle, History, 
    LocationOn, People, Person, Link as LinkIcon,
    Label,
} from '@mui/icons-material';
import { GlassCard, GradientButton, StyledInput } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { clubRepository } from '../../repositories/clubRepository';
import { eventRepository } from '../../repositories/eventRepository';
import { eventMediaService } from '../../services/eventMediaService';
import { Club, EventType, EventStatus, Timestamp } from '../../types';

interface PastEventFormProps {
    onSuccess?: () => void;
}

export const PastEventForm: React.FC<PastEventFormProps> = ({ onSuccess }) => {
    const { user, isAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [uploading, setUploading] = useState(false);
    
    // Form State
    const [form, setForm] = useState({
        name: '',
        description: '',
        type: EventType.WORKSHOP,
        date: '',
        startTime: '',
        endTime: '',
        clubId: '',
        location: '',
        participantCount: 0,
        guestSpeaker: '',
        tags: '',
        externalLink: '',
    });

    // Media State
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [posterPreview, setPosterPreview] = useState<string | null>(null);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

    useEffect(() => {
        const fetchClubs = async () => {
            try {
                if (isAdmin) {
                    const list = await clubRepository.getAllClubs();
                    setClubs(list);
                } else if (user) {
                    const officerClubs = await clubRepository.getClubsByOfficer(user.userId);
                    setClubs(officerClubs);
                    if (officerClubs.length > 0) {
                        setForm(f => ({ ...f, clubId: officerClubs[0].clubId }));
                    }
                }
            } catch (err) {
                console.error('Error fetching clubs:', err);
            }
        };
        fetchClubs();
    }, [isAdmin]);

    const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPosterFile(file);
            setPosterPreview(URL.createObjectURL(file));
        }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setGalleryFiles(prev => [...prev, ...files]);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeGalleryImage = (index: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!form.name || !form.date || !form.clubId) {
            alert('Please fill in required fields (Name, Date, Club)');
            return;
        }

        setLoading(true);
        try {
            // 1. Prepare base event data
            const selectedClub = clubs.find(c => c.clubId === form.clubId);
            const startTimestamp = Timestamp.fromDate(new Date(`${form.date}T${form.startTime || '09:00'}`));
            const endTimestamp = Timestamp.fromDate(new Date(`${form.date}T${form.endTime || '17:00'}`));

            let eventData: any = {
                name: form.name,
                description: form.description,
                type: form.type,
                clubId: form.clubId,
                clubName: selectedClub?.name || 'Unknown Club',
                location: form.location,
                startTime: startTimestamp,
                endTime: endTimestamp,
                status: EventStatus.COMPLETED,
                capacity: form.participantCount,
                registeredCount: form.participantCount,
                actualParticipantCount: form.participantCount,
                guestSpeaker: form.guestSpeaker,
                externalLink: form.externalLink,
                tags: form.tags.split(',').map(t => t.trim()).filter(t => t),
                organizedBy: `${user.profile.firstName} ${user.profile.lastName}`,
                createdAt: Timestamp.now(),
                qrCodeData: `PAST-${Date.now()}`,
                venueId: 'manual-entry',
                fee: 0,
            };

            // 2. Upload Media if present
            setUploading(true);
            const tempEventId = `past-${Date.now()}`;
            
            if (posterFile) {
                const posterUrl = await eventMediaService.uploadMedia(tempEventId, posterFile, 'poster');
                eventData.imageUrl = posterUrl;
            }

            if (galleryFiles.length > 0) {
                const imageUrls = await eventMediaService.uploadGallery(tempEventId, galleryFiles);
                eventData.images = imageUrls;
            }

            // 3. Save to Repository
            await eventRepository.createEvent(eventData);
            
            alert('Past event record added successfully!');
            if (onSuccess) onSuccess();
            
            // Reset form
            setForm({
                name: '', description: '', type: EventType.WORKSHOP,
                date: '', startTime: '', endTime: '', clubId: '',
                location: '', participantCount: 0, guestSpeaker: '',
                tags: '', externalLink: '',
            });
            setPosterFile(null);
            setPosterPreview(null);
            setGalleryFiles([]);
            setGalleryPreviews([]);

        } catch (error) {
            console.error('Error adding past event:', error);
            alert('Failed to add past event record.');
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <GlassCard sx={{ p: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <History sx={{ fontSize: '2.5rem', color: 'var(--primary)' }} />
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Manual Past Event Entry</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                        Maintain historical records for events organized outside the system.
                    </Typography>
                </Box>
            </Box>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    {/* Basic Details */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Label sx={{ fontSize: '1.1rem', color: 'var(--primary)' }} /> Basic Details
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={8}>
                                <StyledInput 
                                    fullWidth required label="Event Title"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <StyledInput 
                                    select fullWidth required label="Category"
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value as EventType })}
                                >
                                    {Object.values(EventType).map(t => (
                                        <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>
                                    ))}
                                </StyledInput>
                            </Grid>
                            <Grid item xs={12}>
                                <StyledInput 
                                    fullWidth multiline rows={3} label="Description"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Timing & Location */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <History sx={{ fontSize: '1.1rem', color: 'var(--primary)' }} /> Timing & Venue
                        </Typography>
                        <Stack spacing={2}>
                            <StyledInput 
                                fullWidth required type="date" label="Event Date"
                                InputLabelProps={{ shrink: true }}
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <StyledInput 
                                    fullWidth type="time" label="Start Time"
                                    InputLabelProps={{ shrink: true }}
                                    value={form.startTime}
                                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                                />
                                <StyledInput 
                                    fullWidth type="time" label="End Time"
                                    InputLabelProps={{ shrink: true }}
                                    value={form.endTime}
                                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                                />
                            </Box>
                            <StyledInput 
                                fullWidth label="Venue / Location"
                                placeholder="e.g. Auditorium A, Virtual"
                                InputProps={{ startAdornment: <LocationOn sx={{ color: 'var(--text-dim)', mr: 1 }} /> }}
                                value={form.location}
                                onChange={e => setForm({ ...form, location: e.target.value })}
                            />
                        </Stack>
                    </Grid>

                    {/* Organization & Participation */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <People sx={{ fontSize: '1.1rem', color: 'var(--primary)' }} /> Organization
                        </Typography>
                        <Stack spacing={2}>
                            <StyledInput 
                                select fullWidth required label="Organizing Club"
                                value={form.clubId}
                                onChange={e => setForm({ ...form, clubId: e.target.value })}
                            >
                                {clubs.map(c => (
                                    <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>
                                ))}
                            </StyledInput>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <StyledInput 
                                    fullWidth type="number" label="No. of Participants"
                                    InputProps={{ startAdornment: <People sx={{ color: 'var(--text-dim)', mr: 1 }} /> }}
                                    value={form.participantCount}
                                    onChange={e => setForm({ ...form, participantCount: parseInt(e.target.value) || 0 })}
                                />
                                <StyledInput 
                                    fullWidth label="Guest Speaker"
                                    InputProps={{ startAdornment: <Person sx={{ color: 'var(--text-dim)', mr: 1 }} /> }}
                                    value={form.guestSpeaker}
                                    onChange={e => setForm({ ...form, guestSpeaker: e.target.value })}
                                />
                            </Box>
                            <StyledInput 
                                fullWidth label="Organized By"
                                disabled
                                value={user ? `${user.profile.firstName} ${user.profile.lastName} (Auto-filled)` : 'Loading...'}
                            />
                        </Stack>
                    </Grid>

                    {/* Media Upload */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CloudUpload sx={{ fontSize: '1.1rem', color: 'var(--primary)' }} /> Media & Gallery
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <Box sx={{ 
                                    p: 2, border: '2px dashed var(--border-glass)', 
                                    borderRadius: 3, textAlign: 'center',
                                    height: '100%', minHeight: 180,
                                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                    bgcolor: 'rgba(255,255,255,0.02)', position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {posterPreview ? (
                                        <>
                                            <img src={posterPreview} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                            <IconButton 
                                                onClick={() => { setPosterFile(null); setPosterPreview(null); }}
                                                sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </>
                                    ) : (
                                        <Button component="label" sx={{ height: '100%', width: '100%', flexDirection: 'column', textTransform: 'none' }}>
                                            <CloudUpload sx={{ fontSize: '2.5rem', mb: 1, color: 'var(--primary)' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Upload Poster</Typography>
                                            <input type="file" hidden accept="image/*" onChange={handlePosterChange} />
                                        </Button>
                                    )}
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={8}>
                                <Box sx={{ 
                                    p: 2, border: '2px dashed var(--border-glass)', 
                                    borderRadius: 3, minHeight: 180,
                                    bgcolor: 'rgba(255,255,255,0.02)'
                                }}>
                                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Event Gallery</Typography>
                                        <Button component="label" size="small" startIcon={<AddCircle />}>
                                            Add Images
                                            <input type="file" hidden multiple accept="image/*" onChange={handleGalleryChange} />
                                        </Button>
                                    </Box>
                                    {galleryPreviews.length > 0 ? (
                                        <ImageList sx={{ height: 120 }} cols={5} rowHeight={120}>
                                            {galleryPreviews.map((url, idx) => (
                                                <ImageListItem key={idx} sx={{ position: 'relative' }}>
                                                    <img src={url} alt={`Gallery ${idx}`} loading="lazy" style={{ borderRadius: '8px', height: '100%', objectFit: 'cover' }} />
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => removeGalleryImage(idx)}
                                                        sx={{ position: 'absolute', top: 2, right: 2, p: 0.5, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                                                    >
                                                        <Delete sx={{ fontSize: '0.9rem' }} />
                                                    </IconButton>
                                                </ImageListItem>
                                            ))}
                                        </ImageList>
                                    ) : (
                                        <Box sx={{ textAlign: 'center', py: 4, color: 'var(--text-dim)' }}>
                                            <Typography variant="caption">No gallery images added</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Additional Info */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinkIcon sx={{ fontSize: '1.1rem', color: 'var(--primary)' }} /> Additional Info
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <StyledInput 
                                    fullWidth label="Event Tags (comma separated)"
                                    placeholder="e.g. workshop, tech, networking"
                                    value={form.tags}
                                    onChange={e => setForm({ ...form, tags: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <StyledInput 
                                    fullWidth label="External Link / Drive Link"
                                    placeholder="e.g. https://photos.google.com/..."
                                    InputProps={{ startAdornment: <LinkIcon sx={{ color: 'var(--text-dim)', mr: 1 }} /> }}
                                    value={form.externalLink}
                                    onChange={e => setForm({ ...form, externalLink: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12}>
                        <GradientButton 
                            type="submit" 
                            fullWidth 
                            disabled={loading || uploading}
                            sx={{ py: 1.5, mt: 2 }}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddCircle />}
                        >
                            {loading ? (uploading ? 'Uploading Media...' : 'Creating Record...') : 'Add Past Event Record'}
                        </GradientButton>
                    </Grid>
                </Grid>
            </form>
        </GlassCard>
    );
};
