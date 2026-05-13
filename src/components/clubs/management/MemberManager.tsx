import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Divider,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Check, Close, PersonAdd, Verified, Delete } from '@mui/icons-material';
import { GlassCard } from '../../shared/DesignSystem';
import { clubRepository } from '../../../repositories/clubRepository';
import { membershipRequestRepository } from '../../../repositories/membershipRequestRepository';
import { userRepository } from '../../../repositories/userRepository';
import { Club, MembershipRequest, User, RequestStatus, ClubRole } from '../../../types';

interface MemberManagerProps {
  club: Club;
}

export const MemberManager: React.FC<MemberManagerProps> = ({ club }) => {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [members, setMembers] = useState<(User & { clubRole: ClubRole })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to pending requests
    const unsubRequests = membershipRequestRepository.subscribeToPendingRequestsByClub(
      club.clubId,
      (newRequests) => {
        setRequests(newRequests);
      }
    );

    const fetchMembers = async () => {
      try {
        const memberData = await Promise.all(
          club.memberIds.map(async (id) => {
            const u = await userRepository.getUserById(id);
            return u ? { ...u, clubRole: club.memberRoles[id] || ClubRole.MEMBER } : null;
          })
        );
        setMembers(memberData.filter((m): m is (User & { clubRole: ClubRole }) => m !== null));
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
    return () => unsubRequests();
  }, [club]);

  const handleRequest = async (requestId: string, status: RequestStatus) => {
    try {
      if (status === RequestStatus.APPROVED) {
        const req = requests.find(r => r.requestId === requestId);
        if (req) {
          await clubRepository.addMember(club.clubId, req.studentId);
        }
      }
      await membershipRequestRepository.updateRequest(requestId, { status });
    } catch (error) {
      console.error('Error processing request:', error);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Manage Members - {club.name}</Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-dim)' }}>
          Review join requests and manage your club's roster.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={6}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd color="primary" /> Join Requests ({requests.length})
          </Typography>
          <GlassCard sx={{ p: 0 }}>
            {requests.length > 0 ? (
              <List>
                {requests.map((req, idx) => (
                  <React.Fragment key={req.requestId}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <IconButton onClick={() => handleRequest(req.requestId, RequestStatus.APPROVED)} color="success">
                            <Check />
                          </IconButton>
                          <IconButton onClick={() => handleRequest(req.requestId, RequestStatus.REJECTED)} color="error">
                            <Close />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>{req.studentId[0].toUpperCase()}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`Student ID: ${req.studentId.substring(0, 8)}...`}
                        secondary={req.message}
                      />
                    </ListItem>
                    {idx < requests.length - 1 && <Divider sx={{ borderColor: 'var(--border-glass)' }} />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-dim)' }}>No pending requests.</Box>
            )}
          </GlassCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Verified color="secondary" /> Active Members ({members.length})
          </Typography>
          <GlassCard sx={{ p: 0 }}>
            <List>
              {members.map((member, idx) => (
                <React.Fragment key={member.userId}>
                  <ListItem
                    secondaryAction={
                      club.officerIds.includes(member.userId) ? null : (
                        <IconButton size="small" color="error">
                          <Delete />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemAvatar>
                      <Avatar src={member.photoURL} sx={{ bgcolor: 'var(--primary-glow)' }}>
                        {member.profile.firstName[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${member.profile.firstName} ${member.profile.lastName}`}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={member.clubRole} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < members.length - 1 && <Divider sx={{ borderColor: 'var(--border-glass)' }} />}
                </React.Fragment>
              ))}
            </List>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
};
