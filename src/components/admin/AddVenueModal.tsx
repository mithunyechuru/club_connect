import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Grid, MenuItem, CircularProgress,
    Slider, Chip
} from '@mui/material';
import { MeetingRoom, AddCircle, Business } from '@mui/icons-material';
import { GradientButton, StyledInput, GlassCard } from '../shared/DesignSystem';
import { Venue, Timestamp } from '../../types';
import { venueRepository } from '../../repositories/venueRepository';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

interface AddVenueModalProps {
    open: boolean;
    onClose: () => void;
    existingVenues: Venue[];
    venueToEdit?: Venue | null;
}

const COMMON_FACILITIES = [
    "Projector", "AC", "Sound System", "Whiteboard", 
    "WiFi", "Microphone", "Podium", "Stage"
];

export const AddVenueModal: React.FC<AddVenueModalProps> = ({ open, onClose, existingVenues, venueToEdit }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        type: 'Multipurpose' as 'Multipurpose' | 'Seminar',
        floor: 1,
        building: 'Main Block',
        capacity: 250,
        facilities: [] as string[],
        description: '',
    });

    useEffect(() => {
        if (venueToEdit) {
            setFormData({
                type: venueToEdit.type,
                floor: venueToEdit.floor,
                building: venueToEdit.building,
                capacity: venueToEdit.capacity,
                facilities: venueToEdit.facilities || [],
                description: venueToEdit.description || '',
            });
        } else {
            setFormData({
                type: 'Multipurpose',
                floor: 1,
                building: 'Main Block',
                capacity: 250,
                facilities: [],
                description: '',
            });
        }
    }, [venueToEdit, open]);

    const generatedName = `${formData.type} Hall - Floor ${formData.floor}`;

    const handleFacilityToggle = (facility: string) => {
        setFormData(prev => ({
            ...prev,
            facilities: prev.facilities.includes(facility)
                ? prev.facilities.filter(f => f !== facility)
                : [...prev.facilities, facility]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validation: Prevent duplicate venues (Same floor + same type)
        // Only check for duplicates if we're creating or if floor/type changed
        const hasFloorTypeChanged = !venueToEdit || (venueToEdit.floor !== formData.floor || venueToEdit.type !== formData.type);
        if (hasFloorTypeChanged) {
            const isDuplicate = existingVenues.some(v => 
                v.floor === formData.floor && v.type === formData.type && v.venueId !== venueToEdit?.venueId
            );

            if (isDuplicate) {
                showToast(`A ${formData.type} Hall already exists on Floor ${formData.floor}.`, 'error');
                return;
            }
        }

        setLoading(true);
        try {
            const venueData: Omit<Venue, 'venueId'> = {
                name: generatedName,
                type: formData.type,
                floor: formData.floor,
                building: formData.building,
                capacity: formData.capacity,
                facilities: formData.facilities,
                description: formData.description,
                status: venueToEdit?.status || 'active',
                createdBy: venueToEdit?.createdBy || user.userId,
                createdAt: venueToEdit?.createdAt || Timestamp.now(),
                // Backward compatibility
                location: `${formData.building}, Floor ${formData.floor}`,
                equipment: formData.facilities,
                features: [formData.type],
                isAvailable: venueToEdit?.isAvailable ?? true
            };

            if (venueToEdit) {
                await venueRepository.updateVenue(venueToEdit.venueId, venueData);
                showToast('Venue updated successfully!', 'success');
            } else {
                await venueRepository.createVenue(venueData);
                showToast('Venue added successfully!', 'success');
            }
            onClose();
        } catch (error) {
            console.error('Error saving venue:', error);
            showToast('Failed to save venue.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
                sx: { 
                    borderRadius: '16px',
                    bgcolor: 'var(--bg-page)',
                    backgroundImage: 'none'
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800, color: 'var(--primary)', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <MeetingRoom /> {venueToEdit ? 'Edit' : 'Add New'} Venue
                </Box>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Venue Type</Typography>
                            <StyledInput 
                                select fullWidth
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <MenuItem value="Multipurpose">Multipurpose Hall</MenuItem>
                                <MenuItem value="Seminar">Seminar Hall</MenuItem>
                            </StyledInput>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Floor</Typography>
                            <StyledInput 
                                select fullWidth
                                value={formData.floor}
                                onChange={e => setFormData({ ...formData, floor: Number(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5].map(f => (
                                    <MenuItem key={f} value={f}>Floor {f}</MenuItem>
                                ))}
                            </StyledInput>
                        </Grid>

                        <Grid item xs={12}>
                            <GlassCard sx={{ p: 2, bgcolor: 'rgba(67, 97, 238, 0.05)', border: '1px dashed var(--primary)' }}>
                                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                                    System Generated Name
                                </Typography>
                                <Typography variant="h6" sx={{ color: 'var(--primary)', fontWeight: 800 }}>
                                    {generatedName}
                                </Typography>
                            </GlassCard>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Building</Typography>
                            <StyledInput 
                                fullWidth
                                value={formData.building}
                                onChange={e => setFormData({ ...formData, building: e.target.value })}
                                InputProps={{ startAdornment: <Business sx={{ mr: 1, color: 'var(--text-dim)' }} /> }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Capacity</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--primary)' }}>{formData.capacity} People</Typography>
                            </Box>
                            <Slider 
                                value={formData.capacity}
                                min={50}
                                max={500}
                                step={10}
                                onChange={(_, value) => setFormData({ ...formData, capacity: value as number })}
                                sx={{ color: 'var(--primary)' }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                {[80, 150, 250, 400].map(c => (
                                    <Chip 
                                        key={c} label={c} size="small" variant="outlined" 
                                        onClick={() => setFormData({ ...formData, capacity: c })}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                ))}
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>Facilities</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {COMMON_FACILITIES.map(f => (
                                    <Chip 
                                        key={f} label={f} 
                                        color={formData.facilities.includes(f) ? "primary" : "default"}
                                        variant={formData.facilities.includes(f) ? "filled" : "outlined"}
                                        onClick={() => handleFacilityToggle(f)}
                                        sx={{ cursor: 'pointer', transition: '0.2s' }}
                                    />
                                ))}
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Description</Typography>
                            <StyledInput 
                                fullWidth multiline rows={3}
                                placeholder="Details about the venue, location specifics, etc."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <GradientButton 
                        onClick={onClose} 
                        sx={{ background: 'transparent', color: 'var(--text-dim)', '&:hover': { background: 'rgba(0,0,0,0.05)' } }}
                    >
                        Cancel
                    </GradientButton>
                    <GradientButton 
                        type="submit" 
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddCircle />}
                        sx={{ px: 4 }}
                    >
                        {venueToEdit ? 'Update' : 'Add'} Venue
                    </GradientButton>
                </DialogActions>
            </form>
        </Dialog>
    );
};
