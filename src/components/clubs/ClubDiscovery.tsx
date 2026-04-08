import React, { useEffect, useState } from 'react';
import { Grid, Typography, Box, InputAdornment, Skeleton, Avatar } from '@mui/material';
import { Search, Groups as GroupsIcon } from '@mui/icons-material';
import { GlassCard, StyledInput, Badge, GradientButton } from '../shared/DesignSystem';
import { clubRepository } from '../../repositories/clubRepository';
import { Club } from '../../types';
import { useNavigate } from 'react-router-dom';

const CATEGORY_COLORS: Record<string, string> = {
    Tech: '#3b82f6', Sports: '#059669', Cultural: '#7c3aed',
    Academic: '#c9973a', Social: '#ec4899', default: '#6b0f1a',
};

export const ClubDiscovery: React.FC = () => {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClubs = async () => {
            try {
                const allClubs = await clubRepository.getAllClubs();
                setClubs(allClubs);
            } catch (error) {
                console.error('Error fetching clubs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchClubs();
    }, []);

    const filteredClubs = clubs.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Explore Clubs</Typography>
                    <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Find your tribe and ignite your passions at university.
                    </Typography>
                </Box>
                <StyledInput
                    placeholder="Search clubs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ minWidth: 260 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'var(--text-muted)', fontSize: '1.1rem' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            <Grid container spacing={3}>
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <Grid item xs={12} sm={6} md={4} key={i}>
                            <Skeleton variant="rectangular" height={220} sx={{ borderRadius: '12px' }} />
                        </Grid>
                    ))
                ) : filteredClubs.length > 0 ? (
                    filteredClubs.map((club) => {
                        const color = getCategoryColor(club.category);
                        return (
                            <Grid item xs={12} sm={6} md={4} key={club.clubId}>
                                <GlassCard sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden' }}>
                                    {/* Top banner */}
                                    <Box sx={{
                                        height: 8,
                                        background: `linear-gradient(90deg, ${color} 0%, ${color}99 100%)`,
                                    }} />
                                    <Box sx={{ p: 3, flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Avatar sx={{
                                                width: 48, height: 48,
                                                background: `${color}18`,
                                                color,
                                                fontWeight: 800, fontSize: '1.2rem',
                                                border: `2px solid ${color}30`,
                                            }}>
                                                {club.name[0]}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography noWrap sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                                                    {club.name}
                                                </Typography>
                                                <Badge color="primary">{club.category}</Badge>
                                            </Box>
                                        </Box>

                                        <Typography sx={{
                                            color: 'var(--text-secondary)', fontSize: '0.83rem', lineHeight: 1.55,
                                            display: '-webkit-box', WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 2,
                                        }}>
                                            {club.description}
                                        </Typography>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                            <GroupsIcon sx={{ fontSize: '1rem' }} />
                                            <span>{club.memberIds.length} member{club.memberIds.length !== 1 ? 's' : ''}</span>
                                        </Box>
                                    </Box>
                                    <Box sx={{ px: 3, pb: 3 }}>
                                        <GradientButton fullWidth onClick={() => navigate(`/clubs/${club.clubId}`)}>
                                            View Club
                                        </GradientButton>
                                    </Box>
                                </GlassCard>
                            </Grid>
                        );
                    })
                ) : (
                    <Grid item xs={12}>
                        <Box sx={{ textAlign: 'center', py: 10 }}>
                            <GroupsIcon sx={{ fontSize: '3rem', color: 'var(--text-dim)', mb: 2 }} />
                            <Typography sx={{ color: 'var(--text-muted)' }}>
                                No clubs match your search.
                            </Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};
