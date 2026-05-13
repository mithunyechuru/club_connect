import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { AddCircle, CloudUpload } from '@mui/icons-material';
import { StyledInput, GradientButton } from '../../shared/DesignSystem';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { clubRepository } from '../../../repositories/clubRepository';
import { Club, ClubRole, Timestamp } from '../../../types';

export const CreateClubForm: React.FC = () => {
  const { user, isAdmin, isOfficer } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    privacy: 'public',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Requirement: Only Admin or Officer can create clubs
    if (!isAdmin && !isOfficer) {
      showToast('Permission Denied: Only administrators or club officers can create new clubs.', 'error');
      return;
    }

    setLoading(true);
    try {
      const clubData: Omit<Club, 'clubId'> = {
        name: form.name,
        description: form.description,
        category: form.category,
        parentClubId: null,
        officerIds: [user.userId],
        memberIds: [user.userId],
        managerId: user.userId,
        memberRoles: { [user.userId]: ClubRole.PRESIDENT },
        documentIds: [],
        createdAt: Timestamp.now(),
      };
      await clubRepository.createClub(clubData);
      showToast('Club created successfully!', 'success');
      setForm({
        name: '', description: '', category: '', privacy: 'public',
      });
    } catch (error) {
      console.error('Error creating club:', error);
      showToast('Failed to create club', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Create New Club</Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-dim)' }}>
          Launch a new student organization and start building your community.
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Club Name</Typography>
            <StyledInput 
              fullWidth required 
              placeholder="e.g., Artificial Intelligence Society"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Description</Typography>
            <StyledInput 
              fullWidth required multiline rows={4}
              placeholder="What is your club about?"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Category</Typography>
            <StyledInput 
              fullWidth required select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              <MenuItem value="Academic">Academic</MenuItem>
              <MenuItem value="Technical">Technical</MenuItem>
              <MenuItem value="Cultural">Cultural</MenuItem>
              <MenuItem value="Sports">Sports</MenuItem>
              <MenuItem value="Arts">Arts</MenuItem>
            </StyledInput>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Privacy</Typography>
            <StyledInput 
              fullWidth select
              value={form.privacy}
              onChange={e => setForm({ ...form, privacy: e.target.value })}
            >
              <MenuItem value="public">Public (Anyone can join)</MenuItem>
              <MenuItem value="private">Private (Approval required)</MenuItem>
            </StyledInput>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Club Logo</Typography>
            <Box sx={{ 
              p: 3, border: '2px dashed var(--border-glass)', 
              borderRadius: 3, textAlign: 'center',
              bgcolor: 'rgba(255,255,255,0.02)', cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'var(--primary)' }
            }}>
              <CloudUpload sx={{ fontSize: '2rem', color: 'var(--primary)', mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Click to upload logo</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-dim)' }}>PNG, JPG (Max 2MB)</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <GradientButton 
              type="submit" 
              fullWidth 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddCircle />}
            >
              Create Club
            </GradientButton>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};
