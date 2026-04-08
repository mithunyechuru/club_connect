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
    Alert,
    CircularProgress
} from '@mui/material';
import { Check, Close, PersonAdd, Verified } from '@mui/icons-material';
import { GlassCard, Badge } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { clubRepository } from '../../repositories/clubRepository';
import { membershipRequestRepository } from '../../repositories/membershipRequestRepository';
import { userRepository } from '../../repositories/userRepository';
import { Club, MembershipRequest, User, RequestStatus } from '../../types';

export const MemberManagement: React.FC = () => {
    const { user } = useAuth();
    const [activeClub, setActiveClub] = useState<Club | null>(null);
    const [requests, setRequests] = useState<MembershipRequest[]>([]);
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const officerClubs = await clubRepository.getClubsByOfficer(user.userId);
                if (officerClubs.length > 0) {
                    const club = officerClubs[0];
                    setActiveClub(club);

                    // Fetch member details
                    const memberList = await Promise.all(
                        club.memberIds.map(id => userRepository.getUserById(id))
                    );
                    setMembers(memberList.filter((u): u is User => u !== null));

                    // Fetch pending requests
                    const clubRequests = await membershipRequestRepository.getAllRequestsByClub(club.clubId);
                    setRequests(clubRequests.filter((r: MembershipRequest) => r.status === RequestStatus.PENDING));
                }
            } catch (error) {
                console.error('Error fetching member data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleRequest = async (requestId: string, status: RequestStatus) => {
        try {
            if (status === RequestStatus.APPROVED && activeClub) {
                const req = requests.find(r => r.requestId === requestId);
                if (req) {
                    await clubRepository.addMember(activeClub.clubId, req.studentId);
                }
            }
            await membershipRequestRepository.updateRequest(requestId, { status });
            setRequests(prev => prev.filter(r => r.requestId !== requestId));

            if (status === RequestStatus.APPROVED) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Error processing request:', error);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress /></Box>;
    if (!activeClub) return <Alert severity="warning">No clubs found where you are an officer.</Alert>;

    return (
        <Box>
            <Box sx={{ mb: 6 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Member Management</Typography>
                <Typography variant="body1" sx={{ color: 'var(--text-muted)' }}>
                    Review join requests and manage your club community.
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {/* Pending Requests */}
                <Grid item xs={12} md={6}>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonAdd sx={{ color: 'var(--primary)' }} />
                        Join Requests ({requests.length})
                    </Typography>
                    <GlassCard sx={{ p: 0 }}>
                        {requests.length > 0 ? (
                            <List>
                                {requests.map((req, idx) => (
                                    <React.Fragment key={req.requestId}>
                                        <ListItem
                                            secondaryAction={
                                                <Box>
                                                    <IconButton onClick={() => handleRequest(req.requestId, RequestStatus.APPROVED)} sx={{ color: 'var(--secondary)' }}>
                                                        <Check />
                                                    </IconButton>
                                                    <IconButton onClick={() => handleRequest(req.requestId, RequestStatus.REJECTED)} sx={{ color: '#ff4d4d' }}>
                                                        <Close />
                                                    </IconButton>
                                                </Box>
                                            }
                                        >
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: 'var(--bg-main)' }}>S</Avatar>
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
                            <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-dim)' }}>
                                No pending requests.
                            </Box>
                        )}
                    </GlassCard>
                </Grid>

                {/* Current Members */}
                <Grid item xs={12} md={6}>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Verified sx={{ color: 'var(--secondary)' }} />
                        Current Members ({members.length})
                    </Typography>
                    <GlassCard sx={{ p: 0 }}>
                        <List>
                            {members.map((member, idx) => (
                                <React.Fragment key={member.userId}>
                                    <ListItem>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                {member.profile.firstName[0]}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={`${member.profile.firstName} ${member.profile.lastName}`}
                                            secondary={member.email}
                                        />
                                        <Badge color={activeClub.officerIds.includes(member.userId) ? 'accent' : 'secondary'}>
                                            {activeClub.officerIds.includes(member.userId) ? 'Officer' : 'Member'}
                                        </Badge>
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
