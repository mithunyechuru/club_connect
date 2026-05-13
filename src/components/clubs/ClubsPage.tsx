import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Groups,
  PlaylistAddCheck,
  Settings,
  Explore,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

// Sub-components
import { ExploreClubs } from './ExploreClubs';
import { MyClubs } from './MyClubs';
import { ClubRequests } from './ClubRequests';
import { ManageClubs } from './ManageClubs';

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

export const ClubsPage: React.FC = () => {
  const { isAdmin, isOfficer } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Clubs</Typography>
        <Typography variant="body1" sx={{ color: 'var(--text-muted)' }}>
          Discover and manage your university club memberships in one place.
        </Typography>
      </Box>

      <Box sx={{ 
        background: 'var(--bg-surface)', 
        borderRadius: 4, 
        border: '1px solid var(--border-glass)',
        overflow: 'hidden'
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: '1px solid var(--border-glass)',
            '& .MuiTab-root': { 
              fontWeight: 700, 
              textTransform: 'none', 
              fontSize: '1rem',
              minHeight: 64,
              color: 'var(--text-dim)',
              '&.Mui-selected': { color: 'var(--primary)' }
            },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' }
          }}
        >
          <Tab icon={<Explore sx={{ mr: 1 }} />} iconPosition="start" label="Explore Clubs" />
          <Tab icon={<Groups sx={{ mr: 1 }} />} iconPosition="start" label="My Clubs" />
          <Tab icon={<PlaylistAddCheck sx={{ mr: 1 }} />} iconPosition="start" label="Requests" />
          {(isAdmin || isOfficer) && (
            <Tab icon={<Settings sx={{ mr: 1 }} />} iconPosition="start" label="Manage" />
          )}
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <TabPanel value={tabValue} index={0}>
            <ExploreClubs />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <MyClubs />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <ClubRequests />
          </TabPanel>
          {(isAdmin || isOfficer) && (
            <TabPanel value={tabValue} index={3}>
              <ManageClubs />
            </TabPanel>
          )}
        </Box>
      </Box>
    </Box>
  );
};
