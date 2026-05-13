import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  TextField,
  InputAdornment,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Search,
  MilitaryTech,
  History,
} from '@mui/icons-material';
import { GlassCard } from '../shared/DesignSystem';
import { leaderboardRepository } from '../../repositories/leaderboardRepository';
import { LeaderboardEntry } from '../../types';

export const Leaderboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<'WEEKLY' | 'MONTHLY' | 'OVERALL'>('OVERALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await leaderboardRepository.getTopStudents(timeframe);
        setEntries(data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [timeframe]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim().length > 2) {
      const results = await leaderboardRepository.searchLeaderboard(value);
      setEntries(results);
    } else if (value.trim() === '') {
      const data = await leaderboardRepository.getTopStudents(timeframe);
      setEntries(data);
    }
  };

  const top3 = entries.slice(0, 3);
  const remaining = entries.slice(3);

  const getPodiumStyle = (rank: number) => {
    switch(rank) {
      case 1: return { height: 200, order: 2, color: '#fbbf24', label: '1st', shadow: '0 12px 32px rgba(251,191,36,0.3)' };
      case 2: return { height: 160, order: 1, color: '#94a3b8', label: '2nd', shadow: '0 8px 24px rgba(148,163,184,0.3)' };
      case 3: return { height: 130, order: 3, color: '#b45309', label: '3rd', shadow: '0 6px 16px rgba(180,83,9,0.3)' };
      default: return {};
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 3 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Leaderboard</Typography>
          <Typography variant="body1" sx={{ color: 'var(--text-muted)' }}>
            See who's leading the pack in club engagement and activity.
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={(_, val) => val && setTimeframe(val)}
          sx={{ 
            background: 'var(--bg-surface)', 
            borderRadius: '12px',
            border: '1px solid var(--border-glass)',
            '& .MuiToggleButton-root': {
              color: 'var(--text-dim)',
              px: 3,
              textTransform: 'none',
              fontWeight: 700,
              border: 'none',
              '&.Mui-selected': {
                color: 'var(--primary)',
                background: 'var(--primary-glow)',
                '&:hover': { background: 'var(--primary-glow)' }
              }
            }
          }}
        >
          <ToggleButton value="WEEKLY">Weekly</ToggleButton>
          <ToggleButton value="MONTHLY">Monthly</ToggleButton>
          <ToggleButton value="OVERALL">Overall</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Podium for Top 3 */}
      {!loading && top3.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 8, alignItems: 'flex-end', justifyContent: 'center' }}>
          {[2, 1, 3].map((rankIdx) => {
            const entry = entries.find(e => e.rank === rankIdx);
            if (!entry) return null;
            const style = getPodiumStyle(entry.rank);
            
            return (
              <Grid item xs={12} sm={4} key={entry.userId} sx={{ order: style.order }}>
                <Box sx={{ textAlign: 'center', position: 'relative' }}>
                  <Avatar 
                    src={entry.userAvatar} 
                    sx={{ 
                      width: entry.rank === 1 ? 120 : 90, 
                      height: entry.rank === 1 ? 120 : 90, 
                      mx: 'auto', mb: 2,
                      border: `4px solid ${style.color}`,
                      boxShadow: style.shadow
                    }} 
                  >
                    {entry.userName[0]}
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>{entry.userName}</Typography>
                  <Typography variant="subtitle1" sx={{ color: 'var(--primary)', fontWeight: 700, mb: 2 }}>
                    {entry.participationScore} Points
                  </Typography>
                  
                  <Box sx={{ 
                    height: style.height, 
                    background: `linear-gradient(180deg, ${style.color}22 0%, ${style.color}00 100%)`,
                    borderTop: `2px solid ${style.color}`,
                    borderRadius: '16px 16px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}>
                    <Typography sx={{ color: style.color, fontWeight: 900, fontSize: '3rem', opacity: 0.8 }}>
                      {style.label}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Search and List */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search for a student..."
          value={searchTerm}
          onChange={handleSearch}
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

      <TableContainer component={GlassCard} sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 10, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ background: 'var(--bg-page)' }}>
                <TableCell sx={{ fontWeight: 700, color: 'var(--text-dim)' }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'var(--text-dim)' }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'var(--text-dim)' }} align="center">Events</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'var(--text-dim)' }} align="center">Badges</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'var(--text-dim)' }} align="right">Points</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {remaining.map((entry) => (
                <TableRow key={entry.userId} sx={{ '&:hover': { background: 'var(--primary-glow)' } }}>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                    #{entry.rank}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={entry.userAvatar} sx={{ width: 40, height: 40 }}>{entry.userName[0]}</Avatar>
                      <Typography sx={{ fontWeight: 700 }}>{entry.userName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <History sx={{ fontSize: '1rem', color: 'var(--text-dim)' }} />
                      {entry.eventsAttended}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <MilitaryTech sx={{ fontSize: '1.1rem', color: 'var(--accent-gold)' }} />
                      {entry.badgesEarned}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 800, color: 'var(--primary)' }}>
                      {entry.participationScore}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                    <Typography color="var(--text-dim)">No entries found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};
