import React, { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import { AdminPanelSettings, CheckCircle } from '@mui/icons-material';
import { GlassCard, GradientButton, StyledInput } from '../shared/DesignSystem';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { userRepository } from '../../repositories/userRepository';
import { UserRole, User } from '../../types';
import { Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

/**
 * One-time Admin Initialization Page
 * Accessible at /admin/setup
 *
 * This page allows an existing Firebase Auth user to be promoted to ADMINISTRATOR
 * in Firestore. It first authenticates, then upserts the user document with
 * role = ADMINISTRATOR.
 *
 * SECURITY NOTE: Remove or restrict this route after initial setup.
 */
export const AdminSetupPage: React.FC = () => {
    const [email, setEmail] = useState('projectnxtgen841@gmail.com');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            // 1. Sign in via Firebase Auth to get the UID
            const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password);

            // 2. Try to fetch existing Firestore user document
            const existing = await userRepository.getUserById(fbUser.uid);

            if (existing) {
                // Update role to ADMINISTRATOR
                await userRepository.updateUser(fbUser.uid, { role: UserRole.ADMINISTRATOR });
                setMessage(`✓ User "${existing.profile.firstName} ${existing.profile.lastName}" has been promoted to ADMINISTRATOR.`);
            } else {
                // Create a new Firestore user document as ADMINISTRATOR
                const newUser: User = {
                    userId: fbUser.uid,
                    email: email,
                    passwordHash: 'FIREBASE_AUTH',
                    role: UserRole.ADMINISTRATOR,
                    profile: {
                        firstName: 'Admin',
                        lastName: 'User',
                        email: email,
                    },
                    preferences: {
                        emailNotifications: true,
                        pushNotifications: true,
                        eventReminders: true,
                        clubAnnouncements: true,
                    },
                    createdAt: Timestamp.now(),
                    lastLogin: Timestamp.now(),
                    totalPoints: 0,
                    eventsAttendedCount: 0,
                    badgesEarnedCount: 0,
                };
                await userRepository.createUser(newUser);
                setMessage(`✓ Admin account created and configured for "${email}".`);
            }

            setStatus('success');

            // Sign out so user must log in fresh (this loads the correct role)
            await auth.signOut();
        } catch (err: any) {
            setStatus('error');
            const code = err.code || '';
            if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
                setMessage('Invalid email or password. Please check and try again.');
            } else {
                setMessage(err.message || 'Setup failed. Please try again.');
            }
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, #8b1525 100%)',
            p: 2,
        }}>
            <Container maxWidth="sm">
                {/* Branding */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{
                        width: 64, height: 64, borderRadius: '16px',
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        mx: 'auto', mb: 2,
                    }}>
                        <AdminPanelSettings sx={{ color: 'white', fontSize: '2rem' }} />
                    </Box>
                    <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.5rem' }}>
                        Admin Initialization
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', mt: 0.5 }}>
                        ClubConnect · One-time admin account setup
                    </Typography>
                </Box>

                <GlassCard sx={{ p: { xs: 3, sm: 5 } }}>
                    {status === 'success' ? (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <CheckCircle sx={{ fontSize: '3.5rem', color: '#16a34a', mb: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#166534', mb: 1 }}>
                                Admin Setup Complete!
                            </Typography>
                            <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.88rem', mb: 3 }}>
                                {message}
                            </Typography>
                            <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.82rem', mb: 3 }}>
                                You have been signed out. Please log in again with your admin credentials.
                            </Typography>
                            <GradientButton fullWidth onClick={() => navigate('/login')}>
                                Go to Login
                            </GradientButton>
                        </Box>
                    ) : (
                        <>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Initialize Admin Account
                            </Typography>
                            <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.85rem', mb: 3 }}>
                                Authenticate with your credentials to grant ADMINISTRATOR privileges in the database.
                            </Typography>

                            <Box sx={{
                                mb: 3, p: 2, borderRadius: '8px',
                                background: 'rgba(201,151,58,0.08)', border: '1px solid rgba(201,151,58,0.3)',
                            }}>
                                <Typography sx={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 500 }}>
                                    ⚠ This page should be removed or restricted after initial setup.
                                </Typography>
                            </Box>

                            <form onSubmit={handleSetup}>
                                <StyledInput
                                    fullWidth label="Admin Email" margin="normal"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <StyledInput
                                    fullWidth label="Password" type="password" margin="normal"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoFocus
                                />

                                {status === 'error' && (
                                    <Box sx={{
                                        mt: 2, px: 2, py: 1.5, borderRadius: '8px',
                                        background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                                    }}>
                                        <Typography sx={{ color: '#dc2626', fontSize: '0.82rem' }}>
                                            {message}
                                        </Typography>
                                    </Box>
                                )}

                                <GradientButton
                                    fullWidth type="submit"
                                    disabled={status === 'loading'}
                                    sx={{ mt: 3, py: 1.4 }}
                                >
                                    {status === 'loading' ? 'Setting up...' : 'Initialize Admin Role'}
                                </GradientButton>
                            </form>

                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Typography
                                    component="span"
                                    onClick={() => navigate('/login')}
                                    sx={{ fontSize: '0.83rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    ← Back to Login
                                </Typography>
                            </Box>
                        </>
                    )}
                </GlassCard>
            </Container>
        </Box>
    );
};
