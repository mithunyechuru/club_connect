import React, { useState } from 'react';
import {
    Typography,
    Box,
    Grid,
    Avatar,
    Switch,
    FormControlLabel,
    Stack,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    Email,
    Phone,
    Security,
    Notifications,
    Palette,
    History,
    Verified,
} from '@mui/icons-material';
import { GlassCard, Badge, GradientButton, StyledInput } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';

export const UserProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [prefs, setPrefs] = useState(user?.preferences || {
        emailNotifications: true,
        pushNotifications: true,
        eventReminders: true,
        clubAnnouncements: true
    });

    if (!user) return null;

    return (
        <Box>
            <Box sx={{ mb: 6 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Account Settings</Typography>
                <Typography variant="body1" sx={{ color: 'var(--text-muted)' }}>
                    Manage your personal information and application preferences.
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {/* Left Column - Profile Card */}
                <Grid item xs={12} md={4}>
                    <GlassCard sx={{ p: 4, textAlign: 'center' }}>
                        <Avatar
                            sx={{
                                width: 120,
                                height: 120,
                                margin: '0 auto 24px',
                                bgcolor: 'var(--primary)',
                                fontSize: '3rem',
                                fontWeight: 700
                            }}
                        >
                            {user.profile.firstName[0]}
                        </Avatar>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>{user.profile.firstName} {user.profile.lastName}</Typography>
                        <Typography variant="body1" color="var(--text-dim)" sx={{ mb: 3 }}>{user.email}</Typography>
                        <Badge color={user.role === 'ADMINISTRATOR' ? 'accent' : 'primary'}>{user.role}</Badge>

                        <Divider sx={{ borderColor: 'var(--border-light)' }} />

                        <Stack spacing={2} sx={{ textAlign: 'left' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Email sx={{ color: 'var(--text-dim)' }} />
                                <Typography variant="body2">{user.email}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Phone sx={{ color: 'var(--text-dim)' }} />
                                <Typography variant="body2">{user.profile.phoneNumber || 'Not provided'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Verified sx={{ color: '#059669' }} />
                                <Typography variant="body2">Member since {user.createdAt.toDate().toLocaleDateString()}</Typography>
                            </Box>
                        </Stack>

                        <GradientButton fullWidth sx={{ mt: 4 }}>Edit Profile</GradientButton>
                    </GlassCard>
                </Grid>

                {/* Right Column - Preferences & Security */}
                <Grid item xs={12} md={8}>
                    <Stack spacing={4}>
                        {/* Preferences Section */}
                        <GlassCard sx={{ p: 4 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Notifications sx={{ color: 'var(--primary)' }} />
                                Notification Preferences
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={<Switch checked={prefs.emailNotifications} onChange={e => setPrefs({ ...prefs, emailNotifications: e.target.checked })} />}
                                        label="Email Notifications"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={<Switch checked={prefs.pushNotifications} onChange={e => setPrefs({ ...prefs, pushNotifications: e.target.checked })} />}
                                        label="Push Notifications"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={<Switch checked={prefs.eventReminders} onChange={e => setPrefs({ ...prefs, eventReminders: e.target.checked })} />}
                                        label="Event Reminders"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={<Switch checked={prefs.clubAnnouncements} onChange={e => setPrefs({ ...prefs, clubAnnouncements: e.target.checked })} />}
                                        label="Club Announcements"
                                    />
                                </Grid>
                            </Grid>
                        </GlassCard>

                        {/* Account Management Section */}
                        <GlassCard sx={{ p: 4 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Security sx={{ color: 'var(--stat-events)' }} />
                                Account Management
                            </Typography>
                            <Stack spacing={3}>
                                <StyledInput label="Display Name" defaultValue={`${user.profile.firstName} ${user.profile.lastName}`} fullWidth />
                                <StyledInput label="Current Password" type="password" fullWidth />
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <GradientButton>Update Security</GradientButton>
                                    <GradientButton sx={{ background: '#fff', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>Logout</GradientButton>
                                </Box>
                            </Stack>
                        </GlassCard>

                        {/* App Settings Section */}
                        <GlassCard sx={{ p: 4 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Palette sx={{ color: 'var(--accent-gold)' }} />
                                Experience
                            </Typography>
                            <List>
                                <ListItem>
                                    <ListItemIcon><Palette color="primary" /></ListItemIcon>
                                    <ListItemText primary="Theme Mode" secondary="Light (University Theme)" />
                                    <Switch checked disabled />
                                </ListItem>
                                <Divider sx={{ borderColor: 'var(--border-glass)' }} />
                                <ListItem>
                                    <ListItemIcon><History color="secondary" /></ListItemIcon>
                                    <ListItemText primary="Activity History" secondary="View your login and interaction logs" />
                                    <GradientButton size="small">View</GradientButton>
                                </ListItem>
                            </List>
                        </GlassCard>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};
