import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Tabs,
  Tab,
  Avatar,
  Divider,
  CircularProgress,
  List,
  ListItem,
} from '@mui/material';
import {
  EmojiEvents,
  Groups,
  Event as EventIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import { GlassCard, Badge, GradientButton } from '../shared/DesignSystem';
import { clubRepository } from '../../repositories/clubRepository';
import { eventRepository } from '../../repositories/eventRepository';
import { announcementRepository } from '../../repositories/announcementRepository';
import { Club, Event as ClubEvent, ClubAnnouncement, User } from '../../types';
import { userRepository } from '../../repositories/userRepository';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const ClubDetails: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return;
      try {
        const clubData = await clubRepository.getClubById(clubId);
        if (!clubData) return;
        setClub(clubData);

        const [clubEvents, clubAnns] = await Promise.all([
          eventRepository.getEventsByClub(clubId),
          announcementRepository.getAnnouncementsByClub(clubId)
        ]);
        setEvents(clubEvents);
        setAnnouncements(clubAnns);

        const memberData = await Promise.all(
          clubData.memberIds.map(id => userRepository.getUserById(id))
        );
        setMembers(memberData.filter((m): m is User => m !== null));
      } catch (error) {
        console.error('Error fetching club details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clubId]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!club) return <Typography>Club not found</Typography>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <GlassCard sx={{ p: 4, mb: 4, position: 'relative', overflow: 'hidden' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 120, height: 120, fontSize: '3rem', bgcolor: 'var(--primary-glow)', color: 'var(--primary)' }}>
              {club.name[0]}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>{club.name}</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Badge color="primary">{club.category}</Badge>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-dim)' }}>
                <Groups fontSize="small" />
                <Typography variant="body2">{club.memberIds.length} Members</Typography>
              </Box>
            </Box>
            <Typography variant="body1" sx={{ color: 'var(--text-muted)', maxWidth: 800 }}>
              {club.description}
            </Typography>
          </Grid>
          <Grid item>
            <GradientButton onClick={() => navigate('/clubs')}>Back to Clubs</GradientButton>
          </Grid>
        </Grid>
      </GlassCard>

      {/* Internal Tabs */}
      <Box sx={{ borderBottom: '1px solid var(--border-glass)' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ 
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '1rem' } 
        }}>
          <Tab label="Overview" />
          <Tab label="Events" />
          <Tab label="Members" />
          <Tab label="Announcements" />
          <Tab label="Achievements" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>About the Club</Typography>
            <Typography variant="body1" sx={{ color: 'var(--text-muted)', mb: 4 }}>
              {club.description}
            </Typography>
            
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Recent Activity</Typography>
            {announcements.slice(0, 2).map(ann => (
              <GlassCard key={ann.announcementId} sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{ann.title}</Typography>
                <Typography variant="caption" color="var(--text-dim)">
                  {ann.createdAt.toDate().toLocaleDateString()}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>{ann.content}</Typography>
              </GlassCard>
            ))}
          </Grid>
          <Grid item xs={12} md={4}>
            <GlassCard sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Club Information</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="var(--text-dim)">Category</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{club.category}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="var(--text-dim)">Created At</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {club.createdAt.toDate().toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </GlassCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {events.map(event => (
            <Grid item xs={12} md={6} key={event.eventId}>
              <GlassCard sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{event.name}</Typography>
                  <EventIcon color="primary" />
                </Box>
                <Typography variant="body2" color="var(--text-dim)" sx={{ mb: 2 }}>
                  {event.startTime.toDate().toLocaleString()}
                </Typography>
                <Typography variant="body2">{event.description}</Typography>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <List>
          {members.map(member => (
            <ListItem key={member.userId} sx={{ mb: 1 }}>
              <GlassCard sx={{ p: 2, width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={member.photoURL}>{member.profile.firstName[0]}</Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    {member.profile.firstName} {member.profile.lastName}
                  </Typography>
                  <Typography variant="caption" color="var(--text-dim)">
                    {member.email}
                  </Typography>
                </Box>
              </GlassCard>
            </ListItem>
          ))}
        </List>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {announcements.map(ann => (
            <GlassCard key={ann.announcementId} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <CampaignIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{ann.title}</Typography>
              </Box>
              <Typography variant="caption" color="var(--text-dim)">
                {ann.createdAt.toDate().toLocaleDateString()}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>{ann.content}</Typography>
            </GlassCard>
          ))}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <EmojiEvents sx={{ fontSize: '4rem', color: 'var(--accent-gold)', mb: 2, opacity: 0.5 }} />
          <Typography color="var(--text-dim)">Club achievements system is coming soon!</Typography>
        </Box>
      </TabPanel>
    </Box>
  );
};
