import React, { useState } from 'react';
import { Box, Typography, Container, Checkbox, FormControlLabel, Link, Divider } from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import { GlassCard, GradientButton, StyledInput } from '../shared/DesignSystem';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { formatAuthError } from '../../utils/authUtils';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(formatAuthError(err.code || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, #8b1525 100%)',
            p: 2,
        }}>
            <Container maxWidth="sm">
                {/* Logo / Brand */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{
                        width: 64, height: 64, borderRadius: '16px',
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        mx: 'auto', mb: 2,
                    }}>
                        <SchoolIcon sx={{ color: 'white', fontSize: '2rem' }} />
                    </Box>
                    <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
                        ClubConnect
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', mt: 0.5 }}>
                        University Club & Events Portal
                    </Typography>
                </Box>

                <GlassCard sx={{ p: { xs: 3, sm: 5 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: 'var(--text-main)' }}>
                        Welcome back
                    </Typography>
                    <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.88rem', mb: 3 }}>
                        Sign in to access your dashboard
                    </Typography>

                    <form onSubmit={handleLogin}>
                        <StyledInput
                            fullWidth
                            label="Email Address"
                            margin="normal"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                        <StyledInput
                            fullWidth
                            label="Password"
                            type="password"
                            margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 1 }}>
                            <FormControlLabel
                                control={<Checkbox size="small" sx={{ color: 'var(--border-light)', '&.Mui-checked': { color: 'var(--primary)' } }} />}
                                label={<Typography variant="body2" sx={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Remember me</Typography>}
                            />
                            <Link href="#" sx={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 500 }}>
                                Forgot Password?
                            </Link>
                        </Box>

                        {error && (
                            <Box sx={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', px: 2, py: 1.5, mb: 2 }}>
                                <Typography sx={{ color: '#dc2626', fontSize: '0.82rem' }}>{error}</Typography>
                            </Box>
                        )}

                        <GradientButton
                            fullWidth type="submit" disabled={loading}
                            sx={{ mt: 2, py: 1.4, fontSize: '0.95rem' }}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </GradientButton>
                    </form>

                    <Divider sx={{ my: 3, borderColor: 'var(--border-light)' }} />

                    <Typography sx={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Don't have an account?{' '}
                        <Link href="/register" sx={{ color: 'var(--primary)', fontWeight: 600 }}>
                            Create Account
                        </Link>
                    </Typography>
                </GlassCard>
            </Container>
        </Box>
    );
};
