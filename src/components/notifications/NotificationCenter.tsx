import React, { useEffect, useState } from 'react';
import {
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    CircularProgress,
    Stack,
    Chip,
    Divider,
    Button
} from '@mui/material';
import {
    Notifications,
    Event,
    Groups,
    EmojiEvents,
    Announcement,
    CheckCircle
} from '@mui/icons-material';
import { GlassCard } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { notificationRepository } from '../../repositories/notificationRepository';
import { Notification, NotificationType } from '../../types';

export const NotificationCenter: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await notificationRepository.getNotificationsByUser(user.userId, 50);
            setNotifications(res.notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await notificationRepository.markAsRead(notificationId);
            setNotifications(prev => prev.map(n =>
                n.notificationId === notificationId ? { ...n, isRead: true } : n
            ));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        try {
            await notificationRepository.markAllAsRead(user.userId);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.EVENT_CREATED:
            case NotificationType.EVENT_UPDATED:
            case NotificationType.EVENT_REMINDER_24H:
            case NotificationType.EVENT_REMINDER_1H:
                return <Event sx={{ color: 'var(--primary)' }} />;
            case NotificationType.MEMBERSHIP_APPROVED:
            case NotificationType.MEMBERSHIP_REJECTED:
                return <Groups sx={{ color: '#3b82f6' }} />;
            case NotificationType.BADGE_EARNED:
                return <EmojiEvents sx={{ color: 'var(--accent-gold)' }} />;
            case NotificationType.ANNOUNCEMENT:
                return <Announcement sx={{ color: 'var(--text-main)' }} />;
            default:
                return <Notifications />;
        }
    };

    const filteredNotifications = filter === 'ALL'
        ? notifications
        : notifications.filter(n => !n.isRead);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Notifications</Typography>
                    <Typography variant="body1" sx={{ color: 'var(--text-muted)' }}>
                        Stay updated with your clubs and events.
                    </Typography>
                </Box>
                <Button
                    variant="text"
                    onClick={handleMarkAllRead}
                    disabled={!notifications.some(n => !n.isRead)}
                    sx={{ color: 'var(--primary)', fontWeight: 600 }}
                >
                    Mark all as read
                </Button>
            </Box>

            <Stack direction="row" spacing={1} sx={{ mb: 4 }}>
                <Chip
                    label="All"
                    onClick={() => setFilter('ALL')}
                    sx={{
                        backgroundColor: filter === 'ALL' ? 'var(--primary)' : '#fff',
                        color: filter === 'ALL' ? 'white' : 'var(--text-muted)',
                        border: `1px solid ${filter === 'ALL' ? 'var(--primary)' : 'var(--border-light)'}`,
                    }}
                />
                <Chip
                    label={`Unread (${notifications.filter(n => !n.isRead).length})`}
                    onClick={() => setFilter('UNREAD')}
                    sx={{
                        backgroundColor: filter === 'UNREAD' ? 'var(--primary)' : '#fff',
                        color: filter === 'UNREAD' ? 'white' : 'var(--text-muted)',
                        border: `1px solid ${filter === 'UNREAD' ? 'var(--primary)' : 'var(--border-light)'}`,
                    }}
                />
            </Stack>

            <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
                {filteredNotifications.length > 0 ? (
                    <List sx={{ p: 0 }}>
                        {filteredNotifications.map((notif, index) => (
                            <React.Fragment key={notif.notificationId}>
                                <ListItem
                                    sx={{
                                        p: 3,
                                        backgroundColor: notif.isRead ? 'transparent' : 'rgba(107,15,26,0.03)',
                                        borderLeft: notif.isRead ? '4px solid transparent' : '4px solid var(--primary)',
                                        '&:hover': { backgroundColor: 'var(--bg-page)' },
                                    }}
                                    secondaryAction={
                                        !notif.isRead && (
                                            <IconButton edge="end" onClick={() => handleMarkAsRead(notif.notificationId)}>
                                                <CheckCircle sx={{ color: 'var(--text-dim)', fontSize: 20 }} />
                                            </IconButton>
                                        )
                                    }
                                >
                                    <ListItemIcon sx={{ minWidth: 56 }}>
                                        <Box
                                            sx={{
                                                width: 40, height: 40,
                                                borderRadius: '10px',
                                                backgroundColor: 'var(--bg-page)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid var(--border-light)',
                                            }}
                                        >
                                            {getIcon(notif.type)}
                                        </Box>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={notif.title}
                                        secondary={
                                            <Box component="span">
                                                <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 1 }}>{notif.message}</Typography>
                                                <Typography variant="caption" sx={{ color: 'var(--text-dim)' }}>
                                                    {notif.createdAt.toDate().toLocaleString()}
                                                </Typography>
                                            </Box>
                                        }
                                        primaryTypographyProps={{ fontWeight: 700, mb: 0.5, color: notif.isRead ? 'var(--text-muted)' : 'var(--text-main)' }}
                                    />
                                </ListItem>
                                {index < filteredNotifications.length - 1 && <Divider sx={{ borderColor: 'var(--border-light)' }} />}
                            </React.Fragment>
                        ))}
                    </List>
                ) : (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Notifications sx={{ fontSize: 64, color: 'var(--text-dim)', mb: 2, opacity: 0.2 }} />
                        <Typography variant="h6" color="var(--text-dim)">No notifications found.</Typography>
                    </Box>
                )}
            </GlassCard>
        </Box>
    );
};
