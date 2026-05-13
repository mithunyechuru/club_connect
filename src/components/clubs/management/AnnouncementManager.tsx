import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Campaign, Delete, Send } from '@mui/icons-material';
import { GlassCard, StyledInput, GradientButton } from '../../shared/DesignSystem';
import { announcementRepository } from '../../../repositories/announcementRepository';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Club, ClubAnnouncement, Timestamp } from '../../../types';

interface AnnouncementManagerProps {
  club: Club;
}

export const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ club }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    const unsubscribe = announcementRepository.subscribeToAnnouncements(
      club.clubId,
      (data) => {
        setAnnouncements(data);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [club]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSending(true);
    try {
      await announcementRepository.createAnnouncement({
        clubId: club.clubId,
        title: form.title,
        content: form.content,
        authorId: user.userId,
        createdAt: Timestamp.now()
      });
      showToast('Announcement posted!', 'success');
      setForm({ title: '', content: '' });
    } catch (error) {
      console.error('Error posting announcement:', error);
      showToast('Failed to post announcement', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await announcementRepository.deleteAnnouncement(club.clubId, id);
      showToast('Announcement deleted', 'info');
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Announcements - {club.name}</Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-dim)' }}>
          Keep your members informed with the latest updates.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={5}>
          <GlassCard sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Campaign color="primary" /> New Announcement
            </Typography>
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Title</Typography>
                  <StyledInput 
                    fullWidth required
                    placeholder="e.g., Weekly Meeting Canceled"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Content</Typography>
                  <StyledInput 
                    fullWidth required multiline rows={6}
                    placeholder="Provide details for your members..."
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                  />
                </Box>
                <GradientButton 
                  type="submit" 
                  disabled={sending}
                  startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <Send />}
                >
                  Post Announcement
                </GradientButton>
              </Box>
            </form>
          </GlassCard>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Recent Announcements</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {announcements.length > 0 ? (
              announcements.map((ann) => (
                <GlassCard key={ann.announcementId} sx={{ p: 2.5, position: 'relative' }}>
                  <IconButton 
                    size="small" 
                    color="error" 
                    sx={{ position: 'absolute', top: 10, right: 10 }}
                    onClick={() => handleDelete(ann.announcementId)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>{ann.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-dim)', display: 'block', mb: 1.5 }}>
                    Posted on {ann.createdAt.toDate().toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                    {ann.content}
                  </Typography>
                </GlassCard>
              ))
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: 3 }}>
                No announcements posted yet.
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
