import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
} from '@mui/material';
import { AccountTree, AddCircle, Delete, Visibility } from '@mui/icons-material';
import { GlassCard, StyledInput, GradientButton } from '../../shared/DesignSystem';
import { subClubManager } from '../../../services/subClubManager';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Club } from '../../../types';
import { useNavigate } from 'react-router-dom';

interface SubClubManagerProps {
  club: Club;
}

export const SubClubManager: React.FC<SubClubManagerProps> = ({ club }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [subClubs, setSubClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchSubClubs();
  }, [club]);

  const fetchSubClubs = async () => {
    try {
      const data = await subClubManager.getSubClubs(club.clubId);
      setSubClubs(data);
    } catch (error) {
      console.error('Error fetching sub-clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    try {
      await subClubManager.createSubClub(
        form.name,
        form.description,
        club.clubId,
        user.userId
      );
      showToast(`Sub-club "${form.name}" created!`, 'success');
      setForm({ name: '', description: '' });
      fetchSubClubs();
    } catch (error) {
      console.error('Error creating sub-club:', error);
      showToast('Failed to create sub-club', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Sub-Clubs (Teams) - {club.name}</Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-dim)' }}>
          Create nested teams or interest groups within your main club.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={5}>
          <GlassCard sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AddCircle color="primary" /> New Sub-Club
            </Typography>
            <form onSubmit={handleCreate}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Team Name</Typography>
                  <StyledInput 
                    fullWidth required
                    placeholder="e.g., Frontend Development Team"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Description</Typography>
                  <StyledInput 
                    fullWidth required multiline rows={3}
                    placeholder="What will this team focus on?"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </Box>
                <GradientButton 
                  type="submit" 
                  disabled={creating}
                  startIcon={creating ? <CircularProgress size={20} color="inherit" /> : <AccountTree />}
                >
                  Create Team
                </GradientButton>
              </Box>
            </form>
          </GlassCard>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Current Sub-Clubs</Typography>
          <GlassCard sx={{ p: 0 }}>
            {subClubs.length > 0 ? (
              <List>
                {subClubs.map((sub, idx) => (
                  <React.Fragment key={sub.clubId}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <IconButton onClick={() => navigate(`/clubs/${sub.clubId}`)} color="primary">
                            <Visibility />
                          </IconButton>
                          <IconButton color="error">
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={sub.name}
                        secondary={`${sub.memberIds.length} members`}
                      />
                    </ListItem>
                    {idx < subClubs.length - 1 && <Divider sx={{ borderColor: 'var(--border-glass)' }} />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-dim)' }}>No sub-clubs created yet.</Box>
            )}
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
};
