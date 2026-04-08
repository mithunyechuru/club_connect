import React, { useState } from 'react';
import { Box, Typography, Container, Link, MenuItem, Grid, Alert } from '@mui/material';
import { GlassCard, GradientButton, StyledInput } from '../shared/DesignSystem';
import { auth } from '../../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { userRepository } from '../../repositories/userRepository';
import { clubOfficerRequestRepository } from '../../repositories/clubOfficerRequestRepository';
import { UserRole, User, RequestStatus } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { formatAuthError } from '../../utils/authUtils';

export const RegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: UserRole.STUDENT,
        clubName: '',
    });
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const isOfficerApplicant = formData.role === UserRole.CLUB_OFFICER;

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            // Always create account as STUDENT — CLUB_OFFICER role is granted only after admin approval
            const newUser: User = {
                userId: user.uid,
                email: formData.email,
                passwordHash: 'FIREBASE_AUTH',
                role: UserRole.STUDENT,
                profile: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email
                },
                preferences: {
                    emailNotifications: true,
                    pushNotifications: true,
                    eventReminders: true,
                    clubAnnouncements: true
                },
                createdAt: Timestamp.now(),
                lastLogin: Timestamp.now()
            };

            await userRepository.createUser(newUser);

            // If student applied for Club Officer, create a pending request
            if (isOfficerApplicant) {
                await clubOfficerRequestRepository.createRequest({
                    studentId: user.uid,
                    studentName: `${formData.firstName} ${formData.lastName}`,
                    email: formData.email,
                    clubName: formData.clubName || 'Not specified',
                    status: RequestStatus.PENDING,
                    requestedAt: Timestamp.now(),
                });
                setSuccessMsg(
                    'Your account has been created! Your Club Officer application has been submitted for admin review. You will be notified once approved.'
                );
                setLoading(false);
                return;
            }

            navigate('/dashboard');
        } catch (err: any) {
            setError(formatAuthError(err.code || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, #8b1525 100%)',
                p: 2
            }}
        >
            <Container maxWidth="sm">
                <GlassCard sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center' }}>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h3" sx={{ color: 'var(--primary)', mb: 1, fontWeight: 700 }}>
                            Join ClubConnect
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'var(--text-muted)' }}>
                            Start your university journey today.
                        </Typography>
                    </Box>

                    <form onSubmit={handleRegister}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <StyledInput
                                    fullWidth
                                    label="First Name"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <StyledInput
                                    fullWidth
                                    label="Last Name"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <StyledInput
                                    fullWidth
                                    label="Email Address"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <StyledInput
                                    fullWidth
                                    label="Password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <StyledInput
                                    select
                                    fullWidth
                                    label="Account Type"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                >
                                    <MenuItem value={UserRole.STUDENT}>Student</MenuItem>
                                    <MenuItem value={UserRole.CLUB_OFFICER}>Apply as Club Officer (requires admin approval)</MenuItem>
                                </StyledInput>
                            </Grid>
                            {isOfficerApplicant && (
                                <Grid item xs={12}>
                                    <StyledInput
                                        fullWidth
                                        label="Club Name you wish to manage"
                                        value={formData.clubName}
                                        onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                                        required
                                        helperText="Enter the name of the club you want to become an officer of"
                                    />
                                </Grid>
                            )}
                        </Grid>

                        {error && (
                            <Alert severity="error" sx={{ mt: 2, borderRadius: '8px' }}>{error}</Alert>
                        )}
                        {successMsg && (
                            <Alert severity="success" sx={{ mt: 2, borderRadius: '8px' }}>{successMsg}</Alert>
                        )}

                        {!successMsg && (
                            <GradientButton
                                fullWidth
                                type="submit"
                                disabled={loading}
                                sx={{ mt: 4, py: 1.5 }}
                            >
                                {loading
                                    ? 'Creating Account...'
                                    : isOfficerApplicant
                                        ? 'Submit Application'
                                        : 'Sign Up'}
                            </GradientButton>
                        )}
                        {successMsg && (
                            <GradientButton
                                fullWidth
                                onClick={() => navigate('/login')}
                                sx={{ mt: 2, py: 1.5 }}
                            >
                                Go to Login
                            </GradientButton>
                        )}
                    </form>

                    <Typography variant="body2" sx={{ mt: 4, color: 'var(--text-muted)' }}>
                        Already have an account? {' '}
                        <Link href="/login" sx={{ color: 'var(--primary)', fontWeight: 600 }}>
                            Sign In
                        </Link>
                    </Typography>
                </GlassCard>
            </Container>
        </Box>
    );
};
