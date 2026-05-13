import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import { PlaylistAddCheck } from '@mui/icons-material';
import { GlassCard } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { membershipRequestRepository } from '../../repositories/membershipRequestRepository';
import { clubRepository } from '../../repositories/clubRepository';
import { MembershipRequest, RequestStatus } from '../../types';

export const ClubRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [clubNames, setClubNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = membershipRequestRepository.subscribeToRequestsByStudent(
      user.userId,
      async (newRequests) => {
        setRequests(newRequests);
        
        // Fetch club names for new requests
        const names = { ...clubNames };
        const missingClubIds = newRequests
          .map(r => r.clubId)
          .filter(id => !names[id]);
        
        if (missingClubIds.length > 0) {
          const fetchedClubs = await Promise.all(
            missingClubIds.map(id => clubRepository.getClubById(id))
          );
          fetchedClubs.forEach(club => {
            if (club) names[club.clubId] = club.name;
          });
          setClubNames(names);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING: return 'warning';
      case RequestStatus.APPROVED: return 'success';
      case RequestStatus.REJECTED: return 'error';
      default: return 'default';
    }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      {requests.length > 0 ? (
        <GlassCard sx={{ p: 0 }}>
          <List>
            {requests.map((request, idx) => (
              <React.Fragment key={request.requestId}>
                <ListItem sx={{ py: 3, px: 3 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          {clubNames[request.clubId] || 'Loading Club...'}
                        </Typography>
                        <Chip 
                          label={request.status} 
                          size="small" 
                          color={getStatusColor(request.status)}
                          sx={{ fontWeight: 800, fontSize: '0.7rem' }} 
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="var(--text-dim)">
                        Requested on {request.requestedAt.toDate().toLocaleDateString()}
                      </Typography>
                    }
                  />
                </ListItem>
                {idx < requests.length - 1 && <Divider sx={{ borderColor: 'var(--border-glass)' }} />}
              </React.Fragment>
            ))}
          </List>
        </GlassCard>
      ) : (
        <Box sx={{ textAlign: 'center', py: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
          <PlaylistAddCheck sx={{ fontSize: '4rem', color: 'var(--text-dim)', mb: 2, opacity: 0.2 }} />
          <Typography color="var(--text-dim)">You haven't sent any club join requests yet.</Typography>
        </Box>
      )}
    </Box>
  );
};
