import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  Avatar,
  Button,
} from '@mui/material';
import { Search, Groups } from '@mui/icons-material';
import { GlassCard, GradientButton } from '../shared/DesignSystem';
import { clubRepository } from '../../repositories/clubRepository';
import { membershipRequestRepository } from '../../repositories/membershipRequestRepository';
import { useAuth } from '../../context/AuthContext';
import { Club, RequestStatus, Timestamp } from '../../types';
import { useNavigate } from 'react-router-dom';

export const ExploreClubs: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [requestLoading, setRequestLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const { clubs: allClubs } = await clubRepository.queryClubs({ pageSize: 100 });
        setClubs(allClubs);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, []);

  const handleJoinRequest = async (clubId: string) => {
    if (!user) return;
    setRequestLoading(clubId);
    try {
      await membershipRequestRepository.createRequest({
        studentId: user.userId,
        clubId: clubId,
        status: RequestStatus.PENDING,
        message: 'I would like to join this club.',
        requestedAt: Timestamp.now()
      });
      alert('Join request sent successfully!');
    } catch (error) {
      console.error('Error sending join request:', error);
      alert('Failed to send join request. You may already have a pending request.');
    } finally {
      setRequestLoading(null);
    }
  };

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search clubs by name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'var(--text-dim)' }} />
              </InputAdornment>
            ),
            sx: { 
              background: 'var(--bg-surface)', 
              borderRadius: '12px',
              '& fieldset': { borderColor: 'var(--border-glass)' }
            }
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {filteredClubs.map((club) => (
          <Grid item xs={12} sm={6} md={4} key={club.clubId}>
            <GlassCard sx={{ 
              p: 3, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: '0.3s',
              '&:hover': { transform: 'translateY(-4px)', borderColor: 'var(--primary)' }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 800 }}>
                  {club.name[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{club.name}</Typography>
                  <Chip 
                    label={club.category} 
                    size="small" 
                    sx={{ mt: 0.5, fontWeight: 700, fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)' }} 
                  />
                </Box>
              </Box>

              <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 3, flex: 1 }}>
                {club.description.length > 100 ? `${club.description.substring(0, 100)}...` : club.description}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-dim)' }}>
                  <Groups fontSize="small" />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{club.memberIds.length} members</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                  onClick={() => navigate(`/clubs/${club.clubId}`)}
                >
                  View Details
                </Button>
                {!club.memberIds.includes(user?.userId || '') && (
                  <GradientButton 
                    fullWidth 
                    onClick={() => handleJoinRequest(club.clubId)}
                    disabled={requestLoading === club.clubId}
                  >
                    {requestLoading === club.clubId ? <CircularProgress size={20} /> : 'Join Club'}
                  </GradientButton>
                )}
              </Box>
            </GlassCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
