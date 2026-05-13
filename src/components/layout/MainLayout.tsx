import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Drawer, List, ListItem, ListItemIcon,
    ListItemText, Avatar, IconButton, AppBar, Toolbar,
    useMediaQuery, useTheme, InputBase, Badge as MuiBadge,
    Divider
} from '@mui/material';
import {
    Dashboard, Event, Groups, EmojiEvents,
    Leaderboard, Settings, Logout, Menu as MenuIcon,
    Search as SearchIcon, Notifications as NotificationsIcon,
    Person as PersonIcon, PendingActions, Business, MeetingRoom, AdminPanelSettings,
    AddCircle, Forum,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Create Content', icon: <AddCircle />, path: '/officer/create-content', roles: ['CLUB_OFFICER', 'ADMINISTRATOR'] },
    { text: 'Events', icon: <Event />, path: '/events' },
    { text: 'Members', icon: <Groups />, path: '/officer/members', roles: ['CLUB_OFFICER', 'ADMINISTRATOR'] },
    { text: 'Messages', icon: <Forum />, path: '/messages' },
    { text: 'Clubs', icon: <Business />, path: '/clubs' },
    { text: 'Achievements', icon: <EmojiEvents />, path: '/achievements' },
    { text: 'Leaderboard', icon: <Leaderboard />, path: '/leaderboard' },
];

const BOTTOM_ITEMS = [
    { text: 'Settings', icon: <Settings />, path: '/settings' },
];

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [pendingOfficerCount, setPendingOfficerCount] = useState(0);
    const { user, signOut, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const allNavItems = NAV_ITEMS.filter(item => {
        if (!item.roles) return true;
        return user && item.roles.includes(user.role);
    });
    
    if (isAdmin) {
        // Venue management is specifically for admins
        const venueItem = { text: 'Venue', icon: <MeetingRoom />, path: '/admin/venues' };
        if (!allNavItems.find(i => i.path === venueItem.path)) {
            allNavItems.push(venueItem);
        }
    }

    // Pre-fetch pending officer requests count for badge
    useEffect(() => {
        if (!isAdmin) return;
        adminService.getPendingOfficerRequests()
            .then(reqs => setPendingOfficerCount(reqs.length))
            .catch(() => { });
    }, [isAdmin]);

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '?');

    const SidebarContent = () => (
        <Box sx={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: 'var(--sidebar-bg)',
        }}>
            {/* Logo */}
            <Box sx={{ px: 3, py: 3.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography sx={{
                    color: 'white', fontWeight: 800, fontSize: '1.15rem',
                    letterSpacing: '-0.02em', lineHeight: 1.2
                }}>
                    ClubConnect
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', mt: 0.3 }}>
                    University Portal
                </Typography>
            </Box>

            {/* Main Nav */}
            <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
                <List disablePadding>
                    {allNavItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <ListItem
                                component="div"
                                key={item.text}
                                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                                sx={{
                                    mx: 1.5, mb: 0.5,
                                    borderRadius: '8px',
                                    width: `calc(100% - 24px)`,
                                    cursor: 'pointer',
                                    px: 1.5, py: 1.1,
                                    backgroundColor: active ? 'var(--sidebar-active-bg)' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: active ? 'var(--sidebar-active-bg)' : 'var(--sidebar-hover)',
                                    },
                                }}
                            >
                                <ListItemIcon sx={{
                                    color: active ? 'var(--sidebar-active)' : 'var(--sidebar-text)',
                                    minWidth: 38,
                                    '& .MuiSvgIcon-root': { fontSize: '1.2rem' }
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: '0.88rem',
                                        fontWeight: active ? 700 : 500,
                                        color: active ? 'var(--sidebar-active)' : 'var(--sidebar-text)',
                                    }}
                                />
                                {active && (
                                    <Box sx={{
                                        width: 4, height: 4, borderRadius: '50%',
                                        backgroundColor: 'var(--sidebar-active)',
                                    }} />
                                )}
                            </ListItem>
                        );
                    })}
                </List>

                {/* Admin Nav Group */}
                {isAdmin && (
                    <Box sx={{ px: 2, mt: 1, mb: 1 }}>
                        <Typography sx={{
                            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px',
                            color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', mb: 1, px: 0.5,
                        }}>
                            Admin
                        </Typography>
                        <List disablePadding>
                            {[
                                { text: 'Admin Console', icon: <AdminPanelSettings />, path: '/admin/dashboard', badge: 0 },
                                { text: 'Pending Requests', icon: <PendingActions />, path: '/admin/requests', badge: pendingOfficerCount },
                                { text: 'Club Management', icon: <Business />, path: '/admin/clubs', badge: 0 },
                                { text: 'Venue Management', icon: <MeetingRoom />, path: '/admin/venues', badge: 0 },
                            ].map((item) => {
                                const active = location.pathname === item.path ||
                                    (item.path === '/admin/dashboard' && location.pathname.startsWith('/admin/dashboard'));
                                return (
                                    <ListItem
                                        component="div"
                                        key={item.text}
                                        onClick={() => { navigate(item.path); setMobileOpen(false); }}
                                        sx={{
                                            mb: 0.5, borderRadius: '8px',
                                            cursor: 'pointer', px: 1.5, py: 0.9,
                                            backgroundColor: active ? 'var(--sidebar-active-bg)' : 'transparent',
                                            '&:hover': { backgroundColor: active ? 'var(--sidebar-active-bg)' : 'var(--sidebar-hover)' },
                                        }}
                                    >
                                        <ListItemIcon sx={{
                                            color: active ? 'var(--sidebar-active)' : 'var(--sidebar-text)',
                                            minWidth: 36,
                                            '& .MuiSvgIcon-root': { fontSize: '1.1rem' },
                                        }}>
                                            {item.badge > 0 ? (
                                                <MuiBadge badgeContent={item.badge} color="error" max={99}>
                                                    {item.icon}
                                                </MuiBadge>
                                            ) : item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.text}
                                            primaryTypographyProps={{
                                                fontSize: '0.85rem',
                                                fontWeight: active ? 700 : 500,
                                                color: active ? 'var(--sidebar-active)' : 'var(--sidebar-text)',
                                            }}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>
                )}
            </Box>

            {/* Bottom Items */}
            <Box sx={{ py: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <List disablePadding>
                    {BOTTOM_ITEMS.map((item) => (
                        <ListItem
                            component="div"
                            key={item.text}
                            onClick={() => navigate(item.path)}
                            sx={{
                                mx: 1.5, borderRadius: '8px',
                                width: `calc(100% - 24px)`,
                                cursor: 'pointer', px: 1.5, py: 1.1,
                                '&:hover': { backgroundColor: 'var(--sidebar-hover)' },
                            }}
                        >
                            <ListItemIcon sx={{ color: 'var(--sidebar-text)', minWidth: 38, '& .MuiSvgIcon-root': { fontSize: '1.2rem' } }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--sidebar-text)' }} />
                        </ListItem>
                    ))}
                    <ListItem
                        component="div"
                        onClick={signOut}
                        sx={{
                            mx: 1.5, borderRadius: '8px',
                            width: `calc(100% - 24px)`,
                            cursor: 'pointer', px: 1.5, py: 1.1,
                            '&:hover': { backgroundColor: 'rgba(255,80,80,0.12)' },
                        }}
                    >
                        <ListItemIcon sx={{ color: '#ff8080', minWidth: 38, '& .MuiSvgIcon-root': { fontSize: '1.2rem' } }}>
                            <Logout />
                        </ListItemIcon>
                        <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 500, color: '#ff8080' }} />
                    </ListItem>
                </List>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
            {/* Mobile Topbar */}
            {isMobile && (
                <AppBar position="fixed" elevation={0} sx={{
                    background: '#fff',
                    borderBottom: '1px solid var(--border-light)',
                    color: 'var(--text-main)',
                }}>
                    <Toolbar sx={{ gap: 2 }}>
                        <IconButton onClick={() => setMobileOpen(true)} edge="start">
                            <MenuIcon sx={{ color: 'var(--primary)' }} />
                        </IconButton>
                        <Typography sx={{ fontWeight: 800, color: 'var(--primary)', flexGrow: 1 }}>
                            ClubConnect
                        </Typography>
                        <IconButton>
                            <MuiBadge badgeContent={0} color="error">
                                <NotificationsIcon sx={{ color: 'var(--text-secondary)' }} />
                            </MuiBadge>
                        </IconButton>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--primary)', fontSize: '0.8rem' }}>
                            {user?.profile.firstName?.[0]}
                        </Avatar>
                    </Toolbar>
                </AppBar>
            )}

            {/* Sidebar Drawer */}
            <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
                <Drawer
                    variant={isMobile ? 'temporary' : 'permanent'}
                    open={isMobile ? mobileOpen : true}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH,
                            boxSizing: 'border-box',
                            border: 'none',
                        },
                    }}
                >
                    <SidebarContent />
                </Drawer>
            </Box>

            {/* Main Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Top Header (Desktop) */}
                {!isMobile && (
                    <Box sx={{
                        background: '#fff',
                        borderBottom: '1px solid var(--border-light)',
                        px: 4, py: 1.5,
                        display: 'flex', alignItems: 'center', gap: 2,
                        position: 'sticky', top: 0, zIndex: 100,
                    }}>
                        {/* Search */}
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            background: 'var(--bg-page)', borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            px: 2, py: 0.8, flex: '0 0 280px',
                        }}>
                            <SearchIcon sx={{ color: 'var(--text-muted)', fontSize: '1.1rem' }} />
                            <InputBase
                                placeholder="Search..."
                                sx={{ fontSize: '0.88rem', color: 'var(--text-secondary)', flex: 1 }}
                            />
                        </Box>

                        <Box sx={{ flex: 1 }} />

                        {/* Notifications */}
                        <IconButton sx={{ color: 'var(--text-secondary)' }}>
                            <MuiBadge badgeContent={0} color="error">
                                <NotificationsIcon />
                            </MuiBadge>
                        </IconButton>

                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                        {/* User Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                    {user?.profile.firstName} {user?.profile.lastName}
                                </Typography>
                                <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {user?.role}
                                </Typography>
                            </Box>
                            <Avatar sx={{
                                width: 36, height: 36,
                                bgcolor: 'var(--primary)',
                                fontSize: '0.85rem', fontWeight: 700,
                                border: '2px solid var(--border-light)',
                            }}>
                                {user?.profile.firstName?.[0]}{user?.profile.lastName?.[0]}
                            </Avatar>
                            <IconButton size="small" sx={{ color: 'var(--text-dim)' }}>
                                <PersonIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                        </Box>
                    </Box>
                )}

                {/* Page Content */}
                <Box sx={{
                    flex: 1,
                    p: { xs: 3, md: 4 },
                    mt: { xs: '56px', md: 0 },
                    maxWidth: 1280,
                    width: '100%',
                    mx: 'auto',
                }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
};
