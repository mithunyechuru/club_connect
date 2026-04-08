import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Avatar, Chip, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import { Refresh, Business, OpenInNew } from '@mui/icons-material';
import { Club } from '../../types';
import { clubRepository } from '../../repositories/clubRepository';
import { GlassCard, GradientButton } from '../shared/DesignSystem';

export const ClubManagement: React.FC = () => {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchClubs = async () => {
        setLoading(true);
        try {
            const data = await clubRepository.getAllClubs();
            setClubs(data);
        } catch (e) {
            console.error('Error fetching clubs:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchClubs(); }, []);

    const formatDate = (ts: any) => {
        if (!ts) return '—';
        const d = ts.toDate?.() ?? new Date(ts);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>Club Management</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 0.3 }}>
                        View and manage all registered university clubs
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchClubs} sx={{ color: 'var(--primary)' }}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <GradientButton size="small" startIcon={<Business />}>Create Club</GradientButton>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: 'var(--primary)' }} />
                </Box>
            ) : clubs.length === 0 ? (
                <GlassCard sx={{ py: 8, textAlign: 'center' }}>
                    <Business sx={{ fontSize: '3rem', color: 'var(--text-dim)', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'var(--text-muted)' }}>No clubs found.</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-dim)', mt: 0.5 }}>
                        Seed sample data or wait for clubs to be created.
                    </Typography>
                </GlassCard>
            ) : (
                <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ background: 'rgba(107,15,26,0.04)' }}>
                                    {['Club', 'Category', 'Members', 'Officers', 'Created', 'Actions'].map(h => (
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
                                {clubs.map(club => (
                                    <TableRow
                                        key={club.clubId}
                                        sx={{ '&:hover': { background: 'rgba(107,15,26,0.03)' }, transition: 'background 0.15s' }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ bgcolor: 'rgba(107,15,26,0.10)', color: 'var(--primary)', fontWeight: 700, width: 36, height: 36 }}>
                                                    {club.name[0]}
                                                </Avatar>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 600, fontSize: '0.88rem' }}>{club.name}</Typography>
                                                    <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        #{club.clubId.slice(0, 8)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={club.category || 'General'}
                                                size="small"
                                                sx={{ background: 'rgba(201,151,58,0.10)', color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.75rem', height: 22 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 600, color: 'var(--text-main)' }}>{club.memberIds.length}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 600, color: 'var(--text-main)' }}>{club.officerIds.length}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{formatDate(club.createdAt)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <GradientButton size="small" startIcon={<OpenInNew sx={{ fontSize: '0.9rem' }} />}>
                                                Manage
                                            </GradientButton>
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
