import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import { Refresh, MeetingRoom, CheckCircle, Cancel } from '@mui/icons-material';
import { Venue } from '../../types';
import { venueRepository } from '../../repositories/venueRepository';
import { GlassCard, GradientButton } from '../shared/DesignSystem';

export const VenueManagement: React.FC = () => {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchVenues = async () => {
        setLoading(true);
        try {
            const data = await venueRepository.getAllVenues();
            setVenues(data);
        } catch (e) {
            console.error('Error fetching venues:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVenues(); }, []);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>Venue Management</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 0.3 }}>
                        View and manage campus venues and their availability
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchVenues} sx={{ color: 'var(--primary)' }}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <GradientButton size="small" startIcon={<MeetingRoom />}>Add Venue</GradientButton>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: 'var(--primary)' }} />
                </Box>
            ) : venues.length === 0 ? (
                <GlassCard sx={{ py: 8, textAlign: 'center' }}>
                    <MeetingRoom sx={{ fontSize: '3rem', color: 'var(--text-dim)', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'var(--text-muted)' }}>No venues found.</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-dim)', mt: 0.5 }}>
                        Add venues or seed sample data to populate this list.
                    </Typography>
                </GlassCard>
            ) : (
                <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ background: 'rgba(107,15,26,0.04)' }}>
                                    {['Venue Name', 'Location', 'Capacity', 'Equipment', 'Availability', 'Actions'].map(h => (
                                        <TableCell key={h} sx={{
                                            fontWeight: 700, fontSize: '0.76rem', color: 'var(--text-muted)',
                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                            borderBottom: '2px solid var(--border-light)', py: 1.5,
                                        }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {venues.map(venue => (
                                    <TableRow
                                        key={venue.venueId}
                                        sx={{ '&:hover': { background: 'rgba(107,15,26,0.03)' }, transition: 'background 0.15s' }}
                                    >
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                                {venue.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                                                {venue.location}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 600 }}>{venue.capacity}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {(venue.equipment || []).slice(0, 2).map(eq => (
                                                    <Chip key={eq} label={eq} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                                ))}
                                                {(venue.equipment || []).length > 2 && (
                                                    <Chip label={`+${venue.equipment.length - 2}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {venue.isAvailable ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#16a34a', fontSize: '0.82rem', fontWeight: 600 }}>
                                                    <CheckCircle sx={{ fontSize: '1rem' }} /> Available
                                                </Box>
                                            ) : (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#dc2626', fontSize: '0.82rem', fontWeight: 600 }}>
                                                    <Cancel sx={{ fontSize: '1rem' }} /> Booked
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <GradientButton size="small">Edit</GradientButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </GlassCard>
            )}
        </Box>
    );
};
