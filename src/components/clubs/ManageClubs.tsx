import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  AddCircle,
  People,
  Campaign,
  Description,
  AccountTree,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { clubRepository } from '../../repositories/clubRepository';
import { Club } from '../../types';

// Sub-tabs for Management
import { CreateClubForm } from './management/CreateClubForm';
import { MemberManager } from './management/MemberManager';
import { AnnouncementManager } from './management/AnnouncementManager';
import { DocumentManager } from './management/DocumentManager';
import { SubClubManager } from './management/SubClubManager';

export const ManageClubs: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [subTab, setSubTab] = useState(0);
  const [managedClubs, setManagedClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  useEffect(() => {
    const fetchManagedClubs = async () => {
      if (!user) return;
      try {
        let clubs: Club[] = [];
        if (isAdmin) {
          clubs = await clubRepository.getAllClubs();
        } else {
          clubs = await clubRepository.getClubsByOfficer(user.userId);
        }
        setManagedClubs(clubs);
        if (clubs.length > 0) setSelectedClub(clubs[0]);
      } catch (error) {
        console.error('Error fetching managed clubs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchManagedClubs();
  }, [user, isAdmin]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Box sx={{ 
            borderRight: { md: '1px solid var(--border-glass)' }, 
            height: '100%',
            pr: { md: 2 }
          }}>
            <Tabs
              orientation="vertical"
              value={subTab}
              onChange={(_, val) => setSubTab(val)}
              sx={{
                '& .MuiTab-root': {
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  mb: 1,
                  '&.Mui-selected': { background: 'var(--primary-glow)' }
                }
              }}
            >
              <Tab icon={<AddCircle />} iconPosition="start" label="Create Club" />
              <Tab icon={<People />} iconPosition="start" label="Manage Members" disabled={managedClubs.length === 0} />
              <Tab icon={<Campaign />} iconPosition="start" label="Announcements" disabled={managedClubs.length === 0} />
              <Tab icon={<Description />} iconPosition="start" label="Documents" disabled={managedClubs.length === 0} />
              <Tab icon={<AccountTree />} iconPosition="start" label="Sub-Clubs" disabled={managedClubs.length === 0} />
            </Tabs>
          </Box>
        </Grid>

        <Grid item xs={12} md={9}>
          <Box sx={{ pl: { md: 2 } }}>
            {subTab === 0 && <CreateClubForm />}
            {subTab === 1 && selectedClub && <MemberManager club={selectedClub} />}
            {subTab === 2 && selectedClub && <AnnouncementManager club={selectedClub} />}
            {subTab === 3 && selectedClub && <DocumentManager club={selectedClub} />}
            {subTab === 4 && selectedClub && <SubClubManager club={selectedClub} />}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
