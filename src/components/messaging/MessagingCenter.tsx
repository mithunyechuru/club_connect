import React, { useEffect, useState } from 'react';
import {
    Grid,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    TextField,
    IconButton,
    Paper,
    Stack,
    Tab,
    Tabs
} from '@mui/material';
import { Send, Chat, Groups, Search, Settings } from '@mui/icons-material';
import { StyledInput } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { forumService } from '../../services/forumService';
import { clubRepository } from '../../repositories/clubRepository';
import { Club, ForumThread } from '../../types';

export const MessagingCenter: React.FC = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState(0);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [activeClub, setActiveClub] = useState<Club | null>(null);
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [activeThread, setActiveThread] = useState<ForumThread | null>(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchClubs = async () => {
            if (!user) return;
            try {
                const userClubs = await clubRepository.getClubsByMember(user.userId);
                setClubs(userClubs);
                if (userClubs.length > 0) setActiveClub(userClubs[0]);
            } catch (error) {
                console.error('Error fetching clubs:', error);
            }
        };
        fetchClubs();
    }, [user]);

    useEffect(() => {
        const fetchThreads = async () => {
            if (!activeClub) return;
            try {
                const clubThreads = await forumService.getClubThreads(activeClub.clubId);
                setThreads(clubThreads);
                if (clubThreads.length > 0) setActiveThread(clubThreads[0]);
            } catch (error) {
                console.error('Error fetching threads:', error);
            }
        };
        fetchThreads();
    }, [activeClub]);

    const handleSendMessage = async () => {
        if (!message.trim() || !activeThread || !user) return;
        try {
            await forumService.postReply(activeThread.threadId, user.userId, message);
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <Box sx={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 800 }}>Messaging</Typography>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <Tab icon={<Groups />} label="Forums" sx={{ fontWeight: 700 }} />
                    <Tab icon={<Chat />} label="Direct Messages" sx={{ fontWeight: 700 }} />
                </Tabs>
            </Box>

            <Grid container spacing={0} sx={{ flexGrow: 1, backgroundColor: 'var(--bg-surface-glass)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                {/* Sidebar - Clubs/Conversations */}
                <Grid item xs={12} md={3} sx={{ borderRight: '1px solid var(--border-glass)', height: '100%', overflowY: 'auto' }}>
                    <Box sx={{ p: 2 }}>
                        <StyledInput
                            fullWidth
                            placeholder="Search conversations..."
                            size="small"
                            InputProps={{ startAdornment: <Search sx={{ fontSize: 20, mr: 1, color: 'var(--text-dim)' }} /> }}
                        />
                    </Box>
                    <List>
                        {clubs.map((club) => (
                            <ListItem
                                key={club.clubId}
                                onClick={() => setActiveClub(club)}
                                sx={{
                                    cursor: 'pointer',
                                    backgroundColor: activeClub?.clubId === club.clubId ? 'var(--primary-glow)' : 'transparent',
                                    '&:hover': { backgroundColor: 'var(--border-glass)' }
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'var(--primary)' }}>{club.name[0]}</Avatar>
                                </ListItemAvatar>
                                <ListItemText primary={club.name} primaryTypographyProps={{ fontWeight: 600 }} />
                            </ListItem>
                        ))}
                    </List>
                </Grid>

                {/* Middle - Threads (if Forums) */}
                <Grid item xs={12} md={3} sx={{ borderRight: '1px solid var(--border-glass)', height: '100%', overflowY: 'auto', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Threads</Typography>
                        <IconButton size="small"><Settings fontSize="small" /></IconButton>
                    </Box>
                    <List>
                        {threads.map((thread) => (
                            <ListItem
                                key={thread.threadId}
                                onClick={() => setActiveThread(thread)}
                                sx={{
                                    cursor: 'pointer',
                                    backgroundColor: activeThread?.threadId === thread.threadId ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' }
                                }}
                            >
                                <ListItemText
                                    primary={thread.title}
                                    secondary={thread.content.substring(0, 40) + '...'}
                                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Grid>

                {/* Chat Area */}
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {activeThread ? (
                        <>
                            <Box sx={{ p: 3, borderBottom: '1px solid var(--border-glass)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{activeThread.title}</Typography>
                                <Typography variant="caption" color="var(--text-dim)">Started in {activeClub?.name}</Typography>
                            </Box>

                            <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                                    <Paper sx={{ p: 2, borderRadius: '20px 20px 20px 0', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-glass)' }}>
                                        <Typography variant="body2">{activeThread.content}</Typography>
                                    </Paper>
                                    <Typography variant="caption" sx={{ ml: 1, color: 'var(--text-dim)' }}>Administrator • 10:30 AM</Typography>
                                </Box>

                                <Box sx={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
                                    <Paper sx={{ p: 2, borderRadius: '20px 20px 0 20px', backgroundColor: 'var(--primary)', color: 'white' }}>
                                        <Typography variant="body2">I'm excited for the next event! When will it be announced?</Typography>
                                    </Paper>
                                    <Typography variant="caption" sx={{ mr: 1, color: 'var(--text-dim)', textAlign: 'right', display: 'block' }}>You • 10:45 AM</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ p: 3, borderTop: '1px solid var(--border-glass)' }}>
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        maxRows={4}
                                        placeholder="Type your message..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 4,
                                                backgroundColor: 'rgba(255,255,255,0.05)'
                                            }
                                        }}
                                    />
                                    <IconButton
                                        onClick={handleSendMessage}
                                        sx={{
                                            width: 50,
                                            height: 50,
                                            backgroundColor: 'var(--primary)',
                                            color: 'white',
                                            '&:hover': { backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }
                                        }}
                                    >
                                        <Send />
                                    </IconButton>
                                </Stack>
                            </Box>
                        </>
                    ) : (
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                            <Chat sx={{ fontSize: 100, mb: 2 }} />
                            <Typography variant="h5">Select a conversation to start chatting</Typography>
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};
