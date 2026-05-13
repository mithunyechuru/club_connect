import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
  Avatar,
  Button,
} from '@mui/material';
import {
  EmojiEvents,
  CardMembership,
  Download,
  Visibility,
  CheckCircle,
  Lock,
} from '@mui/icons-material';
import { GlassCard, Badge as CustomBadge, GradientButton } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { badgeRepository } from '../../repositories/badgeRepository';
import { certificateRepository } from '../../repositories/certificateRepository';
import { Badge, UserBadge, Certificate } from '../../types';
import jsPDF from 'jspdf';

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

export const Achievements: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [allBadges, earnedBadges, userCerts] = await Promise.all([
          badgeRepository.getAllAvailableBadges(),
          badgeRepository.getUserBadges(user.userId),
          certificateRepository.getCertificatesByStudent(user.userId),
        ]);
        setBadges(allBadges);
        setUserBadges(earnedBadges);
        setCertificates(userCerts);
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleDownloadCertificate = (cert: Certificate) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Simple Certificate Template
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, 297, 210, 'F');
    doc.setDrawColor(107, 15, 26);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);

    doc.setTextColor(107, 15, 26);
    doc.setFontSize(40);
    doc.text('CERTIFICATE', 148, 50, { align: 'center' });
    doc.setFontSize(20);
    doc.text('OF PARTICIPATION', 148, 65, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('This is to certify that', 148, 90, { align: 'center' });
    
    doc.setFontSize(30);
    doc.text(cert.studentName, 148, 110, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('has successfully participated in', 148, 130, { align: 'center' });
    
    doc.setFontSize(24);
    doc.text(cert.eventName, 148, 145, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`Date: ${cert.eventDate.toDate().toLocaleDateString()}`, 148, 160, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(100, 180, 197, 180);
    doc.text(cert.organizerSignature, 148, 190, { align: 'center' });

    doc.save(`Certificate_${cert.eventName.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Achievements</Typography>
        <Typography variant="body1" sx={{ color: 'var(--text-muted)' }}>
          Celebrate your milestones and download your official certificates.
        </Typography>
      </Box>

      <Tabs 
        value={tabValue} 
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ 
          borderBottom: '1px solid var(--border-glass)',
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '1rem' }
        }}
      >
        <Tab icon={<EmojiEvents sx={{ mr: 1 }} />} iconPosition="start" label="Badges" />
        <Tab icon={<CardMembership sx={{ mr: 1 }} />} iconPosition="start" label="Certificates" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {badges.map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.badgeId);
            const userBadge = userBadges.find(ub => ub.badgeId === badge.badgeId);
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={badge.badgeId}>
                <GlassCard sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  height: '100%',
                  opacity: isEarned ? 1 : 0.6,
                  filter: isEarned ? 'none' : 'grayscale(0.8)',
                  transition: '0.3s',
                  position: 'relative',
                  '&:hover': { transform: isEarned ? 'translateY(-8px)' : 'none' }
                }}>
                  {!isEarned && (
                    <Box sx={{ position: 'absolute', top: 12, right: 12, color: 'var(--text-dim)' }}>
                      <Lock fontSize="small" />
                    </Box>
                  )}
                  {isEarned && (
                    <Box sx={{ position: 'absolute', top: 12, right: 12, color: '#10b981' }}>
                      <CheckCircle fontSize="small" />
                    </Box>
                  )}
                  
                  <Avatar 
                    src={badge.iconUrl || 'https://cdn-icons-png.flaticon.com/512/610/610333.png'} 
                    sx={{ 
                      width: 80, height: 80, mx: 'auto', mb: 2,
                      boxShadow: isEarned ? '0 8px 24px var(--primary-glow)' : 'none',
                      border: isEarned ? '2px solid var(--primary)' : '2px solid transparent'
                    }} 
                  />
                  
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{badge.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 2 }}>{badge.description}</Typography>
                  
                  {isEarned ? (
                    <CustomBadge color="secondary">
                      Earned on {userBadge?.earnedAt.toDate().toLocaleDateString()}
                    </CustomBadge>
                  ) : (
                    <Typography variant="caption" sx={{ color: 'var(--text-dim)', fontWeight: 600 }}>
                      Progress: {user?.eventsAttendedCount || 0} / {badge.requiredCount}
                    </Typography>
                  )}
                </GlassCard>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {certificates.length > 0 ? (
            certificates.map((cert) => (
              <Grid item xs={12} key={cert.certificateId}>
                <GlassCard sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                  <Box sx={{ 
                    width: 100, height: 70, 
                    background: 'var(--bg-page)', 
                    borderRadius: 2, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--border-light)',
                    color: 'var(--primary)',
                    flexShrink: 0
                  }}>
                    <CardMembership sx={{ fontSize: '2.5rem' }} />
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{cert.eventName}</Typography>
                    <Typography variant="body2" color="var(--text-dim)">
                      Organized by {cert.organizerSignature} • {cert.eventDate.toDate().toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                      ID: {cert.certificateId.toUpperCase()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                    <Button 
                      variant="outlined" 
                      startIcon={<Visibility />} 
                      sx={{ textTransform: 'none', borderRadius: '8px' }}
                      onClick={() => handleDownloadCertificate(cert)} // Mock preview
                    >
                      Preview
                    </Button>
                    <GradientButton 
                      startIcon={<Download />} 
                      onClick={() => handleDownloadCertificate(cert)}
                    >
                      Download PDF
                    </GradientButton>
                  </Box>
                </GlassCard>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box sx={{ p: 6, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                <Typography color="var(--text-dim)">No certificates earned yet. Attend events to get certified!</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </TabPanel>
    </Box>
  );
};
