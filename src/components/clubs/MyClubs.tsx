import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Box,
  CircularProgress,
  Avatar,
  Chip,
  Button,
} from '@mui/material';
import { Visibility, ExitToApp, Stars } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { clubRepository } from '../../repositories/clubRepository';
import { Club, ClubRole } from '../../types';

export const MyClubs: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyClubs = async () => {
      if (!user) return;
      try {
        const myClubs = await clubRepository.getClubsByMember(user.userId);
        setClubs(myClubs);
      } catch (error) {
        console.error('Error fetching my clubs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyClubs();
  }, [user]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      {clubs.length > 0 ? (
        <Grid container spacing={3}>
          {clubs.map((club) => {
            const role = club.memberRoles[user?.userId || ''] || ClubRole.MEMBER;
            const isOfficer = club.officerIds.includes(user?.userId || '');
            
            return (
              <Grid item xs={12} sm={6} md={4} key={club.clubId}>
                <GlassCard sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'var(--secondary-glow)', color: 'var(--secondary)', fontWeight: 800 }}>
                      {club.name[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{club.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={role} 
                          size="small" 
                          color={isOfficer ? "secondary" : "default"}
                          sx={{ fontWeight: 800, fontSize: '0.65rem' }} 
                        />
                        {isOfficer && <Stars sx={{ color: 'var(--accent-gold)', fontSize: '1.2rem' }} />}
                      </Box>
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 3 }}>
                    {club.description.length > 120 ? `${club.description.substring(0, 120)}...` : club.description}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      startIcon={<Visibility />}
                      sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, background: 'var(--primary)' }}
                      onClick={() => navigate(`/clubs/${club.clubId}`)}
                    >
                      Enter Club
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="error"
                      sx={{ borderRadius: '10px', minWidth: '48px', p: 1 }}
                    >
                      <ExitToApp />
                    </Button>
                  </Box>
                </GlassCard>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography color="var(--text-dim)">You haven't joined any clubs yet.</Typography>
          <Button sx={{ mt: 2 }} onClick={() => window.location.reload()}>Refresh</Button>
        </Box>
      )}
    </Box>
  );
};
