import { styled } from '@mui/material/styles';
import { Button as MuiButton, TextField, Paper } from '@mui/material';

// ─── White Card (replaces GlassCard) ──────────────────────────────────────
export const GlassCard = styled(Paper)(() => ({
    background: 'var(--bg-card)',
    border: '1px solid var(--border-card)',
    borderRadius: '12px',
    padding: '24px',
    color: 'var(--text-main)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    '&:hover': {
        boxShadow: 'var(--shadow-card-hover)',
        transform: 'translateY(-2px)',
    },
}));

// ─── Primary Maroon Button ─────────────────────────────────────────────────
export const GradientButton = styled(MuiButton)(() => ({
    background: 'var(--accent-gold)',
    color: '#fff',
    padding: '10px 22px',
    borderRadius: '8px',
    fontWeight: 600,
    textTransform: 'none',
    fontSize: '0.9rem',
    boxShadow: '0 2px 8px rgba(201,151,58,0.35)',
    '&:hover': {
        background: 'var(--accent-gold-light)',
        boxShadow: '0 4px 16px rgba(201,151,58,0.45)',
        transform: 'scale(1.01)',
    },
    '&:disabled': {
        background: 'var(--border-light)',
        color: 'var(--text-dim)',
    },
    '&:focus-visible': {
        outline: '2px solid var(--accent-gold)',
        outlineOffset: '4px',
    },
}));

// ─── Light Input ───────────────────────────────────────────────────────────
export const StyledInput = styled(TextField)(() => ({
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#fff',
        borderRadius: '8px',
        color: 'var(--text-main)',
        fontSize: '0.9rem',
        '& fieldset': {
            borderColor: 'var(--border-light)',
            transition: 'border-color 0.2s ease',
        },
        '&:hover fieldset': {
            borderColor: 'var(--text-dim)',
        },
        '&.Mui-focused fieldset': {
            borderColor: 'var(--primary)',
            borderWidth: '2px',
        },
        '& input': {
            padding: '12.5px 14px',
        },
    },
    '& .MuiInputLabel-root': {
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        transform: 'translate(14px, 12px) scale(1)',
        '&.Mui-focused, &.MuiInputLabel-shrink': {
            transform: 'translate(14px, -9px) scale(0.75)',
            color: 'var(--primary)',
            background: '#fff',
            padding: '0 4px',
            borderRadius: '4px',
        },
    },
    '& .MuiOutlinedInput-notchedOutline': {
        '& legend': {
            display: 'none', // Hide the default notch to use our custom background-based one
        }
    }
}));

// ─── Small pill badge ──────────────────────────────────────────────────────
export const Badge = styled('span')<{ color?: 'primary' | 'secondary' | 'accent' }>
    (({ color = 'primary' }) => ({
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '0.72rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'inline-block',
        ...(color === 'primary' && {
            backgroundColor: 'rgba(107,15,26,0.10)',
            color: 'var(--primary)',
        }),
        ...(color === 'secondary' && {
            backgroundColor: 'rgba(59,130,246,0.10)',
            color: '#3b82f6',
        }),
        ...(color === 'accent' && {
            backgroundColor: 'rgba(201,151,58,0.15)',
            color: 'var(--accent-gold)',
        }),
    }));

// ─── Stat card icon wrapper ────────────────────────────────────────────────
export const StatIconBox = styled('div')<{ variant?: 'points' | 'events' | 'badges' | 'rank' }>
    (({ variant = 'points' }) => {
        const colors: Record<string, { bg: string; color: string }> = {
            points: { bg: 'rgba(201,151,58,0.12)', color: 'var(--stat-points)' },
            events: { bg: 'rgba(59,130,246,0.12)', color: 'var(--stat-events)' },
            badges: { bg: 'rgba(124,58,237,0.12)', color: 'var(--stat-badges)' },
            rank: { bg: 'rgba(5,150,105,0.12)', color: 'var(--stat-rank)' },
        };
        const c = colors[variant];
        return {
            width: 56,
            height: 56,
            borderRadius: '12px',
            backgroundColor: c.bg,
            color: c.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            flexShrink: 0,
        };
    });
