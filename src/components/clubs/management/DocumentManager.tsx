import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Description, Delete, CloudUpload, Download } from '@mui/icons-material';
import { GlassCard, StyledInput, GradientButton } from '../../shared/DesignSystem';
import { clubDocumentService } from '../../../services/clubDocumentService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Club, ClubDocument } from '../../../types';

interface DocumentManagerProps {
  club: Club;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ club }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<ClubDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [club]);

  const fetchDocuments = async () => {
    try {
      const docs = await clubDocumentService.getDocumentsByClub(club.clubId);
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || !title) return;
    setUploading(true);
    try {
      await clubDocumentService.uploadDocument(club.clubId, file, title, user.userId);
      showToast('Document uploaded successfully!', 'success');
      setFile(null);
      setTitle('');
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading:', error);
      showToast('Failed to upload document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await clubDocumentService.deleteDocument(docId, club.clubId);
      showToast('Document deleted', 'info');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting:', error);
      showToast('Failed to delete', 'error');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Documents - {club.name}</Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-dim)' }}>
          Upload and manage important club documents and resources.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={5}>
          <GlassCard sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudUpload color="primary" /> Upload Document
            </Typography>
            <form onSubmit={handleUpload}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Document Title</Typography>
                  <StyledInput 
                    fullWidth required
                    placeholder="e.g., Club Constitution"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Select File</Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={<Description />}
                    sx={{ 
                      py: 2, borderStyle: 'dashed', borderRadius: 2,
                      borderColor: file ? 'var(--secondary)' : 'var(--border-glass)',
                      color: file ? 'var(--secondary)' : 'var(--text-muted)'
                    }}
                  >
                    {file ? file.name : 'Choose File'}
                    <input
                      type="file"
                      hidden
                      onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    />
                  </Button>
                </Box>
                <GradientButton 
                  type="submit" 
                  disabled={uploading || !file}
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                >
                  Upload to Storage
                </GradientButton>
              </Box>
            </form>
          </GlassCard>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Club Library</Typography>
          <GlassCard sx={{ p: 0 }}>
            {documents.length > 0 ? (
              <List>
                {documents.map((doc, idx) => (
                  <React.Fragment key={doc.documentId}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <IconButton component="a" href={doc.fileUrl} target="_blank" color="primary">
                            <Download />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(doc.documentId)} color="error">
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemAvatar sx={{ color: 'var(--primary)' }}><Description /></ListItemAvatar>
                      <ListItemText
                        primary={doc.title}
                        secondary={`Uploaded on ${doc.uploadedAt.toDate().toLocaleDateString()}`}
                      />
                    </ListItem>
                    {idx < documents.length - 1 && <Divider sx={{ borderColor: 'var(--border-glass)' }} />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-dim)' }}>No documents uploaded.</Box>
            )}
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
};
import { ListItemAvatar } from '@mui/material';
