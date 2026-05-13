import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, CircularProgress, IconButton, 
    Tooltip, Chip, Stack, Divider,
} from '@mui/material';
import { 
    MeetingRoom, CheckCircle, Cancel, 
    Layers, Build, Add, Delete 
} from '@mui/icons-material';
import { useToast } from '../../context/ToastContext';
import { Venue } from '../../types';
import { venueRepository } from '../../repositories/venueRepository';
import { GlassCard, GradientButton } from '../shared/DesignSystem';
import { AddVenueModal } from './AddVenueModal';

export const VenueManagement: React.FC = () => {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [venueToEdit, setVenueToEdit] = useState<Venue | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        setLoading(true);
        const unsubscribe = venueRepository.subscribeToVenues((data) => {
            setVenues(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleEdit = (venue: Venue) => {
        setVenueToEdit(venue);
        setIsModalOpen(true);
    };

    const handleDelete = async (venueId: string, venueName: string) => {
        if (window.confirm(`Are you sure you want to delete ${venueName}?`)) {
            try {
                await venueRepository.deleteVenue(venueId);
                showToast('Venue deleted successfully', 'success');
            } catch (error) {
                console.error('Error deleting venue:', error);
                showToast('Failed to delete venue', 'error');
            }
        }
    };

    const groupedVenues = Array.from({ length: 5 }, (_, i) => i + 1).map(floor => ({
        floor,
        venues: venues.filter(v => v.floor === floor)
    }));

    return (
        <Box sx={{ pb: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
                        Venue Management
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'var(--text-muted)', mt: 0.5 }}>
                        Manage campus halls across all 5 floors of the Main Block
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <GradientButton 
                        onClick={() => setIsModalOpen(true)}
                        startIcon={<Add />}
                        sx={{ px: 3 }}
                    >
                        Add Venue
                    </GradientButton>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                    <CircularProgress size={60} sx={{ color: 'var(--primary)' }} />
                </Box>
            ) : venues.length === 0 ? (
                <GlassCard sx={{ py: 10, textAlign: 'center', border: '2px dashed var(--border-light)' }}>
                    <MeetingRoom sx={{ fontSize: '4rem', color: 'var(--text-dim)', mb: 3 }} />
                    <Typography variant="h5" sx={{ color: 'var(--text-main)', fontWeight: 700 }}>No venues configured yet.</Typography>
                    <Typography variant="body1" sx={{ color: 'var(--text-muted)', mt: 1, maxWidth: 450, mx: 'auto' }}>
                        Start by adding Multipurpose and Seminar halls for each floor to organize campus events efficiently.
                    </Typography>
                    <GradientButton 
                        onClick={() => setIsModalOpen(true)}
                        sx={{ mt: 4, px: 6 }}
                    >
                        Create Your First Venue
                    </GradientButton>
                </GlassCard>
            ) : (
                <Stack spacing={4}>
                    {groupedVenues.map(({ floor, venues: floorVenues }) => (
                        <Box key={floor}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Box sx={{ 
                                    p: 1, borderRadius: '8px', bgcolor: 'rgba(67, 97, 238, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Layers sx={{ color: 'var(--primary)' }} />
                                </Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-main)' }}>
                                    Floor {floor}
                                </Typography>
                                <Divider sx={{ flex: 1, opacity: 0.5 }} />
                                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 700 }}>
                                    {floorVenues.length}/2 HALLS CONFIGURED
                                </Typography>
                            </Box>

                            <Grid container spacing={3}>
                                {floorVenues.length > 0 ? (
                                    floorVenues.map(venue => (
                                        <Grid item xs={12} md={6} key={venue.venueId}>
                                            <GlassCard sx={{ 
                                                p: 3, height: '100%', 
                                                transition: '0.3s',
                                                border: '1px solid var(--border-light)',
                                                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)', borderColor: 'var(--primary)' }
                                            }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                    <Box>
                                                        <Chip 
                                                            label={venue.type} 
                                                            size="small" 
                                                            sx={{ 
                                                                mb: 1, fontWeight: 900, fontSize: '0.65rem', 
                                                                bgcolor: venue.type === 'Multipurpose' ? '#4361ee' : '#d4a373',
                                                                color: 'white', borderRadius: '4px'
                                                            }} 
                                                        />
                                                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                                            {venue.name}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--primary)' }}>
                                                            {venue.capacity}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 700 }}>
                                                            CAPACITY
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 3, minHeight: 40 }}>
                                                    {venue.description || `Spacious ${venue.type.toLowerCase()} hall located on Floor ${venue.floor} of the Main Block.`}
                                                </Typography>

                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                                                    {venue.facilities?.map(f => (
                                                        <Chip 
                                                            key={f} label={f} size="small" 
                                                            icon={<Build sx={{ fontSize: '0.8rem !important' }} />}
                                                            sx={{ height: 24, fontSize: '0.75rem', bgcolor: 'rgba(0,0,0,0.03)' }} 
                                                        />
                                                    ))}
                                                </Box>

                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2, borderTop: '1px solid var(--border-light)' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        {venue.status === 'active' ? (
                                                            <CheckCircle sx={{ color: '#16a34a', fontSize: '1rem' }} />
                                                        ) : (
                                                            <Cancel sx={{ color: '#dc2626', fontSize: '1rem' }} />
                                                        )}
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: venue.status === 'active' ? '#16a34a' : '#dc2626' }}>
                                                            {venue.status.toUpperCase()}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Tooltip title="Delete">
                                                            <IconButton 
                                                                size="small" 
                                                                sx={{ color: 'var(--text-dim)', '&:hover': { color: '#dc2626' } }}
                                                                onClick={() => handleDelete(venue.venueId, venue.name)}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <GradientButton 
                                                            size="small" 
                                                            variant="outlined" 
                                                            sx={{ minWidth: 80, height: 32 }}
                                                            onClick={() => handleEdit(venue)}
                                                        >
                                                            Edit
                                                        </GradientButton>
                                                    </Box>
                                                </Box>
                                            </GlassCard>
                                        </Grid>
                                    ))
                                ) : (
                                    <Grid item xs={12}>
                                        <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
                                            <Typography variant="body2" sx={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                                No venues configured for Floor {floor}.
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    ))}
                </Stack>
            )}

            <AddVenueModal 
                open={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setVenueToEdit(null);
                }} 
                existingVenues={venues}
                venueToEdit={venueToEdit}
            />
        </Box>
    );
};
