import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export const LoadingScreen: React.FC = () => {
    return (
        <Box
            sx={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-deep)',
                color: 'var(--primary)'
            }}
        >
            <CircularProgress color="inherit" size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 3, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '2px' }}>
                CLUB<span style={{ color: 'var(--primary)' }}>CONNECT</span>
            </Typography>
        </Box>
    );
};
