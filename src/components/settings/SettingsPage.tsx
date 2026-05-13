import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Grid, Avatar, Switch, FormControlLabel,
    Alert, Button, Stack, CircularProgress
} from '@mui/material';
import {
    Person, Notifications, Settings as SettingsIcon, Palette,
    Lock, PhotoCamera
} from '@mui/icons-material';
import { GlassCard, GradientButton, StyledInput } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { userRepository } from '../../repositories/userRepository';
import { settingsRepository } from '../../repositories/settingsRepository';
import { auth, storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { SystemSettings, AppTheme } from '../../types';

export const SettingsPage: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Profile State
    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
    });

    // Sync form with user data when it loads
    useEffect(() => {
        if (user) {
            setProfileForm({
                firstName: user.profile.firstName || '',
                lastName: user.profile.lastName || '',
                email: user.email || '',
                phoneNumber: user.profile.phoneNumber || '',
            });
        }
    }, [user]);

    // Password State
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // System Settings State
    const [systemSettings, setSystemSettings] = useState<Partial<SystemSettings>>({
        universityName: '',
        universityLogoUrl: '',
        defaultEventDurationHours: 2,
        maxParticipantsPerEvent: 100,
    });

    // Notification Preferences State
    const [notifications, setNotifications] = useState({
        emailNotifications: user?.preferences?.emailNotifications ?? true,
        pushNotifications: user?.preferences?.pushNotifications ?? true,
        eventReminders: user?.preferences?.eventReminders ?? true,
        clubAnnouncements: user?.preferences?.clubAnnouncements ?? true,
    });

    useEffect(() => {
        if (user?.preferences) {
            setNotifications({
                emailNotifications: user.preferences.emailNotifications,
                pushNotifications: user.preferences.pushNotifications,
                eventReminders: user.preferences.eventReminders,
                clubAnnouncements: user.preferences.clubAnnouncements,
            });
        }
    }, [user]);

    // Appearance State
    const [theme, setTheme] = useState<AppTheme>((localStorage.getItem('theme') as AppTheme) || 'light');

    useEffect(() => {
        if (isAdmin) {
            fetchSystemSettings();
        }
        document.documentElement.setAttribute('data-theme', theme);
    }, [isAdmin, theme]);

    const fetchSystemSettings = async () => {
        const settings = await settingsRepository.getSystemSettings();
        if (settings) {
            setSystemSettings(settings);
        }
    };

    const handleFileUpload = async (file: File, path: string) => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        try {
            const url = await handleFileUpload(file, `profiles/${user.userId}/${file.name}`);
            await userRepository.updateUser(user.userId, { photoURL: url });
            setSuccessMsg('Profile picture updated!');
        } catch (err) {
            setErrorMsg('Failed to upload image.');
        } finally {
            setUploading(false);
        }
    };

    const handleSystemLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        try {
            const url = await handleFileUpload(file, `system/logo/${file.name}`);
            setSystemSettings(prev => ({ ...prev, universityLogoUrl: url }));
            await settingsRepository.updateSystemSettings({ universityLogoUrl: url }, user.userId);
            setSuccessMsg('System logo updated!');
        } catch (err) {
            setErrorMsg('Failed to upload logo.');
        } finally {
            setUploading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await userRepository.updateUser(user.userId, {
                profile: {
                    ...user.profile,
                    firstName: profileForm.firstName,
                    lastName: profileForm.lastName,
                    phoneNumber: profileForm.phoneNumber,
                },
                displayName: `${profileForm.firstName} ${profileForm.lastName}`.trim()
            });
            setSuccessMsg('Profile updated successfully!');
        } catch (err) {
            setErrorMsg('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleNotificationUpdate = async (key: keyof typeof notifications, value: boolean) => {
        if (!user) return;
        const newPrefs = { ...notifications, [key]: value };
        setNotifications(newPrefs);
        try {
            await userRepository.updateUser(user.userId, {
                preferences: {
                    ...user.preferences,
                    ...newPrefs
                }
            });
        } catch (err) {
            setErrorMsg('Failed to update notification preferences.');
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setErrorMsg('Passwords do not match.');
            return;
        }
        setSaving(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser || !currentUser.email) throw new Error('No user logged in');
            
            const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.oldPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, passwordForm.newPassword);
            
            setSuccessMsg('Password updated successfully!');
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setErrorMsg('Failed to update password. Verify your old password.');
        } finally {
            setSaving(false);
        }
    };

    const handleSystemUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await settingsRepository.updateSystemSettings(systemSettings, user.userId);
            setSuccessMsg('System configuration updated!');
        } catch (err) {
            setErrorMsg('Failed to update system settings.');
        } finally {
            setSaving(false);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (user) {
            settingsRepository.updateUserAppSettings(user.userId, newTheme);
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Settings</Typography>
                <Typography variant="body2" color="var(--text-muted)">Manage your account and platform preferences</Typography>
            </Box>

            {successMsg && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
            {errorMsg && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                <Stack spacing={2.5}>
                    <GlassCard sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
                            <Person color="primary" sx={{ fontSize: '1.4rem' }} />
                            <Typography variant="subtitle1" fontWeight={700}>Account Details</Typography>
                        </Box>
                        <form onSubmit={handleProfileUpdate}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', mb: 1 }}>
                                    <Avatar 
                                        src={user?.photoURL}
                                        sx={{ width: 72, height: 72, bgcolor: 'var(--primary)', fontWeight: 800, fontSize: '1.6rem', border: '3px solid var(--border-light)' }}
                                    >
                                        {(profileForm.firstName[0] || '').toUpperCase()}{(profileForm.lastName[0] || '').toUpperCase()}
                                    </Avatar>
                                    <Box>
                                        <Button 
                                            variant="outlined" 
                                            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera />} 
                                            size="small"
                                            component="label"
                                            disabled={uploading}
                                            sx={{ mb: 0.5 }}
                                        >
                                            {uploading ? 'Uploading...' : 'Change Photo'}
                                            <input type="file" hidden accept="image/*" onChange={handleProfileImageChange} />
                                        </Button>
                                        <Typography variant="caption" display="block" color="var(--text-dim)">
                                            JPG, PNG or GIF. Max size 2MB.
                                        </Typography>
                                    </Box>
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <StyledInput fullWidth label="First Name" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <StyledInput fullWidth label="Last Name" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} />
                                    </Grid>
                                </Grid>
                                <StyledInput fullWidth label="Email Address" disabled value={profileForm.email} />
                                <StyledInput fullWidth label="Phone Number" value={profileForm.phoneNumber} onChange={e => setProfileForm({ ...profileForm, phoneNumber: e.target.value })} />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <GradientButton type="submit" disabled={saving}>Save Changes</GradientButton>
                                </Box>
                            </Stack>
                        </form>
                    </GlassCard>

                    <GlassCard sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
                            <Lock color="primary" sx={{ fontSize: '1.4rem' }} />
                            <Typography variant="subtitle1" fontWeight={700}>Security</Typography>
                        </Box>
                        <form onSubmit={handlePasswordUpdate}>
                            <Stack spacing={2}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <StyledInput fullWidth type="password" label="Old Password" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <StyledInput fullWidth type="password" label="New Password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <StyledInput fullWidth type="password" label="Confirm Password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                                    </Grid>
                                </Grid>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <GradientButton type="submit" disabled={saving}>Update Password</GradientButton>
                                </Box>
                            </Stack>
                        </form>
                    </GlassCard>

                    <GlassCard sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
                            <Palette color="primary" sx={{ fontSize: '1.4rem' }} />
                            <Typography variant="subtitle1" fontWeight={700}>Appearance</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'var(--bg-page)', p: 2, borderRadius: 2 }}>
                            <Box>
                                <Typography variant="body2" fontWeight={600}>Interface Theme</Typography>
                                <Typography variant="caption" color="var(--text-secondary)">
                                    Switch between light and dark visual modes
                                </Typography>
                            </Box>
                            <FormControlLabel
                                control={<Switch checked={theme === 'dark'} onChange={toggleTheme} />}
                                label={theme === 'dark' ? 'Dark' : 'Light'}
                                sx={{ mr: 0 }}
                            />
                        </Box>
                    </GlassCard>

                    <GlassCard sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
                            <Notifications color="primary" sx={{ fontSize: '1.4rem' }} />
                            <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
                        </Box>
                        <Grid container spacing={2}>
                            {[
                                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via your email' },
                                { key: 'pushNotifications', label: 'Push Notifications', desc: 'Real-time alerts in your browser' },
                                { key: 'eventReminders', label: 'Event Reminders', desc: 'Alerts for upcoming registered events' },
                                { key: 'clubAnnouncements', label: 'Club Updates', desc: 'News and posts from joined clubs' },
                            ].map((pref) => (
                                <Grid item xs={12} sm={6} key={pref.key}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.8, borderRadius: 2, bgcolor: 'var(--bg-page)', height: '100%' }}>
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>{pref.label}</Typography>
                                            <Typography variant="caption" color="var(--text-dim)" sx={{ display: 'block' }}>{pref.desc}</Typography>
                                        </Box>
                                        <Switch 
                                            size="small"
                                            checked={notifications[pref.key as keyof typeof notifications]} 
                                            onChange={(e) => handleNotificationUpdate(pref.key as keyof typeof notifications, e.target.checked)} 
                                        />
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </GlassCard>

                    {isAdmin && (
                        <GlassCard sx={{ p: 3, border: '1px solid var(--accent-gold)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
                                <SettingsIcon sx={{ color: 'var(--accent-gold)', fontSize: '1.4rem' }} />
                                <Typography variant="subtitle1" fontWeight={700}>System Configuration (Admin)</Typography>
                            </Box>
                            <form onSubmit={handleSystemUpdate}>
                                <Stack spacing={2.5}>
                                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap', p: 2, borderRadius: 2, bgcolor: 'rgba(201,151,58,0.05)' }}>
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                            <Avatar 
                                                src={systemSettings.universityLogoUrl}
                                                variant="rounded"
                                                sx={{ width: 64, height: 64, bgcolor: 'rgba(201,151,58,0.1)', border: '1px dashed var(--accent-gold)' }}
                                            >
                                                🏛️
                                            </Avatar>
                                            <Button 
                                                variant="outlined" 
                                                component="label" 
                                                size="small" 
                                                disabled={uploading}
                                                sx={{ color: 'var(--accent-gold)', borderColor: 'var(--accent-gold)' }}
                                            >
                                                {uploading ? 'Uploading...' : 'Update Logo'}
                                                <input type="file" hidden accept="image/*" onChange={handleSystemLogoChange} />
                                            </Button>
                                        </Box>
                                        <StyledInput sx={{ flex: 1, minWidth: 250 }} label="University Name" value={systemSettings.universityName} onChange={e => setSystemSettings({ ...systemSettings, universityName: e.target.value })} />
                                    </Box>
                                    <Grid container spacing={2.5}>
                                        <Grid item xs={12} sm={6}>
                                            <StyledInput fullWidth type="number" label="Default Event Duration (hrs)" value={systemSettings.defaultEventDurationHours} onChange={e => setSystemSettings({ ...systemSettings, defaultEventDurationHours: Number(e.target.value) })} />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <StyledInput fullWidth type="number" label="Max Participants per Event" value={systemSettings.maxParticipantsPerEvent} onChange={e => setSystemSettings({ ...systemSettings, maxParticipantsPerEvent: Number(e.target.value) })} />
                                        </Grid>
                                    </Grid>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                        <GradientButton type="submit" disabled={saving}>Apply Global Settings</GradientButton>
                                    </Box>
                                </Stack>
                            </form>
                        </GlassCard>
                    )}
                </Stack>
            </Box>
        </Box>
    );
};
