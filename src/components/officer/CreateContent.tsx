import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Tabs, Tab, Grid, MenuItem,
    Checkbox, FormControlLabel, CircularProgress,
    Stack, IconButton, Button
} from '@mui/material';
import {
    AddCircle, Groups, Event as EventIcon, Announcement, 
    Delete, Security, CloudUpload, Search, Person, Image as ImageIcon
} from '@mui/icons-material';
import { GlassCard, GradientButton, StyledInput } from '../shared/DesignSystem';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Chip } from '@mui/material';
import { clubRepository } from '../../repositories/clubRepository';
import { eventRepository } from '../../repositories/eventRepository';
import { engagementRepository } from '../../repositories/engagementRepository';
import { venueRepository } from '../../repositories/venueRepository';
import { clubMediaService } from '../../services/clubMediaService';
import { 
    Club, Event, Engagement, EngagementType, EventType, 
    ClubRole, Timestamp, Venue, EventStatus 
} from '../../types';
import { useToast } from '../../context/ToastContext';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`content-tabpanel-${index}`}
            aria-labelledby={`content-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}


const ENGAGEMENT_TYPE_OPTIONS = [
    { value: EngagementType.SURVEY, label: '📝 Survey' },
    { value: EngagementType.POLL, label: '📊 Quick Poll' },
    { value: EngagementType.CHALLENGE, label: '🏆 Challenge' },
    { value: EngagementType.DISCUSSION, label: '💬 Discussion Topic' },
];

export const CreateContent: React.FC = () => {
    const { user, isAdmin, isOfficer } = useAuth();
    const { showToast } = useToast();
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [myClubs, setMyClubs] = useState<Club[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Logo State
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Form States
    const [clubForm, setClubForm] = useState({
        name: '',
        description: '',
        category: '',
        privacy: 'public',
        meetingDate: '',
        meetingTime: '',
        isRecurring: false,
        venueId: '',
        notifyAll: true
    });

    const [eventForm, setEventForm] = useState({
        name: '',
        description: '',
        clubId: '',
        clubName: '',
        type: EventType.WORKSHOP,
        startTime: '',
        endTime: '',
        registrationDeadline: '',
        capacity: 50,
        venueId: '',
        location: '',
        imageUrl: '',
        notifyMembers: true
    });

    const [engagementForm, setEngagementForm] = useState({
        type: EngagementType.POLL,
        title: '',
        description: '',
        clubId: '',
        pollOptions: ['', ''],
        deadline: '',
        venueId: '',
        date: '',
        time: '',
        notifyMembers: true
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const clubs = isAdmin ? await clubRepository.getAllClubs() : await clubRepository.getClubsByOfficer(user.userId);
                setMyClubs(clubs);
                const allVenues = await venueRepository.getAllVenues();
                setVenues(allVenues);
                
                if (clubs.length > 0) {
                    setEventForm(prev => ({ ...prev, clubId: clubs[0].clubId }));
                    setEngagementForm(prev => ({ ...prev, clubId: clubs[0].clubId }));
                }
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };
        fetchData();
    }, [user, isAdmin]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
                showToast('File size exceeds 2MB limit.', 'error');
                return;
            }
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    // Submissions
    const handleClubSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        // Requirement: Only Admin or Officer can create clubs
        if (!isAdmin && !isOfficer) {
            showToast('Permission Denied: Only administrators or club officers can create new clubs.', 'error');
            return;
        }

        setLoading(true);
        try {
            let logoUrl = '';
            if (logoFile) {
                // Use a temporary ID for storage if needed, or rely on a unique timestamp
                const tempId = `temp_${Date.now()}`;
                logoUrl = await clubMediaService.uploadLogo(tempId, logoFile);
            }

            const clubData: Omit<Club, 'clubId'> = {
                name: clubForm.name,
                description: clubForm.description,
                category: clubForm.category,
                parentClubId: null,
                officerIds: [user.userId],
                memberIds: [user.userId],
                managerId: user.userId,
                memberRoles: { [user.userId]: ClubRole.PRESIDENT },
                documentIds: [],
                imageUrl: logoUrl || undefined,
                createdAt: Timestamp.now(),
            };
            await clubRepository.createClub(clubData);
            showToast('Club created successfully!', 'success');
            setClubForm({
                name: '', description: '', category: '', privacy: 'public',
                meetingDate: '', meetingTime: '', isRecurring: false,
                venueId: '', notifyAll: true
            });
            setLogoFile(null);
            setLogoPreview(null);
        } catch (error) {
            console.error('Error creating club:', error);
            showToast('Failed to create club', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEventSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        if (!eventForm.name || !eventForm.startTime || !eventForm.endTime) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        setLoading(true);
        try {
            const selectedClub = myClubs.find(c => c.clubId === eventForm.clubId);
            const eventData: Omit<Event, 'eventId'> = {
                clubId: eventForm.clubId || 'unassigned',
                clubName: eventForm.clubName || selectedClub?.name || 'Unassigned',
                name: eventForm.name,
                description: eventForm.description,
                type: eventForm.type,
                startTime: Timestamp.fromDate(new Date(eventForm.startTime)),
                endTime: Timestamp.fromDate(new Date(eventForm.endTime)),
                registrationDeadline: eventForm.registrationDeadline ? Timestamp.fromDate(new Date(eventForm.registrationDeadline)) : undefined,
                capacity: eventForm.capacity,
                registeredCount: 0,
                venueId: eventForm.venueId || 'default-venue',
                location: eventForm.location,
                imageUrl: eventForm.imageUrl || undefined,
                status: EventStatus.ACTIVE,
                qrCodeData: `CONNECT-${Date.now()}`,
                tags: [],
                fee: 0,
                createdAt: Timestamp.now(),
            };
            await eventRepository.createEvent(eventData);
            showToast(`Event "${eventForm.name}" created successfully!`, 'success');
            setEventForm({
                name: '', description: '', clubId: myClubs[0]?.clubId || '', clubName: '',
                type: EventType.WORKSHOP, startTime: '', endTime: '',
                registrationDeadline: '', capacity: 50, venueId: '', location: '', imageUrl: '',
                notifyMembers: true
            });
        } catch (error) {
            console.error('Error creating event:', error);
            showToast('Failed to create event. Please check if all required fields are filled.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEngagementSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Basic Validation
        if (!engagementForm.title || !engagementForm.description) {
            showToast('Title and Description are required.', 'error');
            return;
        }
        if (engagementForm.type === EngagementType.POLL) {
            const validOptions = engagementForm.pollOptions.filter(o => o.trim() !== '');
            if (validOptions.length < 2) {
                showToast('Polls must have at least 2 options.', 'error');
                return;
            }
        }

        setLoading(true);
        try {
            const selectedClub = myClubs.find(c => c.clubId === engagementForm.clubId);
            const engagementData: Omit<Engagement, 'engagementId'> = {
                clubId: engagementForm.clubId || 'unassigned',
                clubName: selectedClub?.name || engagementForm.clubId || 'Unassigned',
                type: engagementForm.type,
                title: engagementForm.title,
                description: engagementForm.description,
                options: engagementForm.type === EngagementType.POLL 
                    ? engagementForm.pollOptions.filter(o => o.trim() !== '').map(text => ({ text, votes: 0 }))
                    : undefined,
                venueId: engagementForm.venueId || undefined,
                date: engagementForm.date ? Timestamp.fromDate(new Date(engagementForm.date)) : undefined,
                time: engagementForm.time || undefined,
                deadline: engagementForm.deadline ? Timestamp.fromDate(new Date(engagementForm.deadline)) : undefined,
                createdBy: user.userId,
                createdAt: Timestamp.now(),
                status: 'ACTIVE'
            };
            await engagementRepository.createEngagement(engagementData);
            showToast(`Engagement "${engagementForm.title}" launched successfully!`, 'success');
            setEngagementForm(prev => ({
                ...prev,
                title: '', description: '', pollOptions: ['', ''],
                deadline: '', date: '', time: ''
            }));
        } catch (error) {
            console.error('Error creating engagement:', error);
            showToast('Failed to create engagement. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addPollOption = () => {
        setEngagementForm(prev => ({
            ...prev,
            pollOptions: [...prev.pollOptions, '']
        }));
    };

    const removePollOption = (index: number) => {
        if (engagementForm.pollOptions.length <= 2) return;
        setEngagementForm(prev => ({
            ...prev,
            pollOptions: prev.pollOptions.filter((_, i) => i !== index)
        }));
    };

    const updatePollOption = (index: number, value: string) => {
        const newOptions = [...engagementForm.pollOptions];
        newOptions[index] = value;
        setEngagementForm(prev => ({
            ...prev,
            pollOptions: newOptions
        }));
    };

    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 8 }}>
            {/* Header */}
            <GlassCard sx={{ p: 3, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                        width: 44, height: 44, borderRadius: '12px', 
                        bgcolor: 'rgba(67, 97, 238, 0.1)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                        <AddCircle sx={{ color: 'var(--primary)', fontSize: '1.8rem' }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
                        Create New Content
                    </Typography>
                </Box>
                
                {user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                {user.displayName || 'User Name'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end', mt: 0.2 }}>
                                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                    {isAdmin ? 'Administrator' : 'Club Officer'}
                                </Typography>
                                <Chip 
                                    label={isAdmin ? 'Admin' : 'President'} 
                                    size="small" 
                                    sx={{ 
                                        height: 18, fontSize: '0.6rem', fontWeight: 900,
                                        bgcolor: '#d4a373', color: 'white', borderRadius: '4px'
                                    }} 
                                />
                            </Box>
                        </Box>
                        <Avatar 
                            src={user.photoURL} 
                            sx={{ 
                                width: 44, height: 44, 
                                border: '2px solid rgba(67, 97, 238, 0.2)',
                                bgcolor: '#5e1717' // Match dark avatar background in screenshot
                            }}
                        >
                            <Person />
                        </Avatar>
                    </Box>
                )}
            </GlassCard>

            {/* Access Notice */}
            <Box sx={{ 
                p: 2.5, mb: 4, borderRadius: '12px', 
                backgroundColor: 'rgba(67, 97, 238, 0.05)',
                borderLeft: '5px solid var(--primary)',
                display: 'flex', alignItems: 'center', gap: 2
            }}>
                <Security sx={{ color: 'var(--primary)', fontSize: '1.6rem' }} />
                <Typography variant="body2" sx={{ color: 'var(--text-main)', fontWeight: 500, lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--primary)' }}>{isAdmin ? 'Administrator' : 'President'} Access:</strong> You have special privileges to create and manage club content. All changes will be notified to members automatically.
                </Typography>
            </Box>

            <GlassCard sx={{ p: 0, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'var(--border-light)', bgcolor: 'var(--bg-page)' }}>
                    <Tabs 
                        value={tabValue} 
                        onChange={handleTabChange} 
                        variant="fullWidth"
                        sx={{
                            '& .MuiTab-root': { 
                                py: 2.5, fontWeight: 800, fontSize: '0.8rem', 
                                color: 'var(--text-muted)', textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            },
                            '& .Mui-selected': { color: '#5e1717 !important' },
                            '& .MuiTabs-indicator': { backgroundColor: '#5e1717', height: 4 }
                        }}
                    >
                        <Tab icon={<Groups sx={{ fontSize: '1.2rem' }} />} iconPosition="start" label="New Club" />
                        <Tab icon={<EventIcon sx={{ fontSize: '1.2rem' }} />} iconPosition="start" label="New Event" />
                        <Tab icon={<Announcement sx={{ fontSize: '1.2rem' }} />} iconPosition="start" label="Engagement" />
                    </Tabs>
                </Box>

                <Box sx={{ p: 4 }}>
                    {/* ── New Club Tab ────────────────────────────────────────── */}
                    <TabPanel value={tabValue} index={0}>
                            <form onSubmit={handleClubSubmit}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Club Name</Typography>
                                        <StyledInput 
                                            fullWidth required 
                                            placeholder="Computer Science Club"
                                            value={clubForm.name}
                                            onChange={e => setClubForm({ ...clubForm, name: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Description</Typography>
                                        <StyledInput 
                                            fullWidth required multiline rows={4}
                                            placeholder="Brief description of the club's purpose and activities..."
                                            value={clubForm.description}
                                            onChange={e => setClubForm({ ...clubForm, description: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Category</Typography>
                                        <StyledInput 
                                            fullWidth required select
                                            value={clubForm.category}
                                            onChange={e => setClubForm({ ...clubForm, category: e.target.value })}
                                        >
                                            <MenuItem value="">Select category</MenuItem>
                                            <MenuItem value="Academic">Academic</MenuItem>
                                            <MenuItem value="Technical">Technical</MenuItem>
                                            <MenuItem value="Cultural">Cultural</MenuItem>
                                            <MenuItem value="Sports">Sports</MenuItem>
                                            <MenuItem value="Arts">Arts</MenuItem>
                                        </StyledInput>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Privacy</Typography>
                                        <StyledInput 
                                            fullWidth select
                                            value={clubForm.privacy}
                                            onChange={e => setClubForm({ ...clubForm, privacy: e.target.value })}
                                        >
                                            <MenuItem value="public">Public (Anyone can join)</MenuItem>
                                            <MenuItem value="private">Private (Approval required)</MenuItem>
                                            <MenuItem value="restricted">Restricted (Invite only)</MenuItem>
                                        </StyledInput>
                                    </Grid>

                                    {/* Club Logo/Image Section */}
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Club Logo/Image</Typography>
                                        <Box 
                                            onClick={() => logoInputRef.current?.click()}
                                            sx={{ 
                                                p: logoPreview ? 1 : 4, border: '1px dashed var(--border-light)', 
                                                borderRadius: '8px', textAlign: 'center',
                                                bgcolor: 'white', cursor: 'pointer',
                                                transition: '0.3s', '&:hover': { bgcolor: 'rgba(0,0,0,0.01)', borderColor: 'var(--primary)' },
                                                position: 'relative', minHeight: 120,
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            <input 
                                                type="file" 
                                                hidden 
                                                accept="image/*" 
                                                ref={logoInputRef}
                                                onChange={handleLogoChange}
                                            />
                                            
                                            {logoPreview ? (
                                                <Box sx={{ position: 'relative', width: '100%', maxWidth: 200 }}>
                                                    <img 
                                                        src={logoPreview} 
                                                        alt="Club Logo Preview" 
                                                        style={{ width: '100%', height: 'auto', borderRadius: '8px', maxHeight: 150, objectFit: 'contain' }} 
                                                    />
                                                    <IconButton 
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setLogoFile(null);
                                                            setLogoPreview(null);
                                                        }}
                                                        sx={{ 
                                                            position: 'absolute', top: -10, right: -10, 
                                                            bgcolor: 'var(--primary)', color: 'white',
                                                            '&:hover': { bgcolor: '#c1121f' }
                                                        }}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            ) : (
                                                <>
                                                    <CloudUpload sx={{ fontSize: '2rem', color: 'var(--text-main)', mb: 1 }} />
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                        Click to upload or drag and drop
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                                                        PNG, JPG (Max. 2MB)
                                                    </Typography>
                                                </>
                                            )}
                                        </Box>
                                    </Grid>

                                    {/* Assign Roles Section */}
                                    <Grid item xs={12} sx={{ mt: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Groups sx={{ color: 'var(--text-main)', fontSize: '1.4rem' }} />
                                            <Typography variant="h6" sx={{ fontWeight: 700 }}>Assign Roles</Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 3 }}>
                                            Invite members and assign roles after creating the club
                                        </Typography>
                                        
                                        <Grid container spacing={2}>
                                            {[
                                                { title: 'Vice President', desc: 'Can manage events and members' },
                                                { title: 'Secretary', desc: 'Can manage documents and meetings' },
                                                { title: 'Treasurer', desc: 'Can manage finances and budgets' },
                                                { title: 'Members', desc: 'Regular club members' }
                                            ].map((role, idx) => (
                                                <Grid item xs={12} sm={6} md={3} key={idx}>
                                                    <Box sx={{ 
                                                        p: 2.5, height: '100%', border: '1px solid var(--border-light)', 
                                                        borderRadius: '12px', bgcolor: 'white',
                                                        display: 'flex', flexDirection: 'column', gap: 1
                                                    }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--primary)' }}>{role.title}</Typography>
                                                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', mb: 2 }}>{role.desc}</Typography>
                                                        <Button 
                                                            variant="contained" size="small" 
                                                            startIcon={<AddCircle />}
                                                            onClick={() => showToast(`Invite feature for ${role.title} will be available once the club is created.`, 'info')}
                                                            sx={{ 
                                                                mt: 'auto', textTransform: 'none', borderRadius: '8px',
                                                                bgcolor: 'var(--primary)', boxShadow: 'none'
                                                            }}
                                                        >
                                                            Invite
                                                        </Button>
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Grid>
                                    
                                    <Grid item xs={12} sx={{ mt: 4 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Security sx={{ color: 'var(--text-main)', fontSize: '1.4rem' }} />
                                            <Typography variant="h6" sx={{ fontWeight: 700 }}>Venue Booking</Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 2 }}>
                                            Book a venue for your club's regular meetings
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Preferred Venue</Typography>
                                        <StyledInput 
                                            fullWidth select
                                            value={clubForm.venueId}
                                            onChange={e => setClubForm({ ...clubForm, venueId: e.target.value })}
                                        >
                                            <MenuItem value="">Select venue</MenuItem>
                                            {venues.map(v => <MenuItem key={v.venueId} value={v.venueId}>{v.name}</MenuItem>)}
                                        </StyledInput>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>First Meeting Date</Typography>
                                        <StyledInput 
                                            fullWidth type="date"
                                            value={clubForm.meetingDate}
                                            onChange={e => setClubForm({ ...clubForm, meetingDate: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Meeting Time</Typography>
                                        <StyledInput 
                                            fullWidth type="time"
                                            value={clubForm.meetingTime}
                                            onChange={e => setClubForm({ ...clubForm, meetingTime: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <FormControlLabel 
                                            control={<Checkbox checked={clubForm.isRecurring} onChange={e => setClubForm({ ...clubForm, isRecurring: e.target.checked })} />}
                                            label="Recurring meeting (weekly)"
                                            sx={{ '& .MuiTypography-root': { fontSize: '0.9rem', fontWeight: 500 } }}
                                        />
                                    </Grid>
                                    
                                    <Grid item xs={12}>
                                        <Button 
                                            type="button"
                                            variant="contained" startIcon={<Search />}
                                            sx={{ 
                                                textTransform: 'none', borderRadius: '8px', px: 3, py: 1,
                                                bgcolor: 'var(--primary)', boxShadow: '0 4px 12px rgba(67, 97, 238, 0.2)'
                                            }}
                                        >
                                            Check Availability
                                        </Button>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <FormControlLabel 
                                            control={<Checkbox checked={clubForm.notifyAll} onChange={e => setClubForm({ ...clubForm, notifyAll: e.target.checked })} />}
                                            label="Notify all students about this new club"
                                            sx={{ '& .MuiTypography-root': { fontSize: '0.9rem', fontWeight: 500 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <GradientButton type="submit" fullWidth disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddCircle />}>
                                            Create Club
                                        </GradientButton>
                                    </Grid>
                                </Grid>
                            </form>
                        </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <Box sx={{ mb: 4 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                    Create New Event
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                                    Share a new experience with the community
                                </Typography>
                            </Box>
                        </Box>

                        <form onSubmit={handleEventSubmit}>
                            <Grid container spacing={2.5}>
                                <Grid item xs={12}>
                                    <StyledInput 
                                        fullWidth label="Event Name *"
                                        value={eventForm.name}
                                        onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <StyledInput 
                                        select fullWidth label="Category *"
                                        value={eventForm.type}
                                        onChange={e => setEventForm({ ...eventForm, type: e.target.value as EventType })}
                                    >
                                        <MenuItem value={EventType.WORKSHOP}>🛠 Workshop</MenuItem>
                                        <MenuItem value={EventType.SEMINAR}>🎓 Seminar</MenuItem>
                                        <MenuItem value={EventType.HACKATHON}>💻 Hackathon</MenuItem>
                                        <MenuItem value={EventType.COMPETITION}>🏆 Competition</MenuItem>
                                        <MenuItem value={EventType.SOCIAL_GATHERING}>🎉 Cultural / Social</MenuItem>
                                        <MenuItem value={EventType.MEETING}>📋 Technical / Meeting</MenuItem>
                                    </StyledInput>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <StyledInput 
                                        select fullWidth label="Target Club (Optional)"
                                        value={eventForm.clubId}
                                        onChange={e => setEventForm({ ...eventForm, clubId: e.target.value })}
                                    >
                                        <MenuItem value="">Select a club</MenuItem>
                                        {myClubs.map(club => (
                                            <MenuItem key={club.clubId} value={club.clubId}>
                                                {club.name}
                                            </MenuItem>
                                        ))}
                                    </StyledInput>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <StyledInput 
                                        fullWidth label="Club Name Override (optional)"
                                        value={eventForm.clubName}
                                        onChange={e => setEventForm({ ...eventForm, clubName: e.target.value })}
                                        placeholder={myClubs.find(c => c.clubId === eventForm.clubId)?.name || "Enter club name"}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <StyledInput 
                                        fullWidth type="datetime-local" label="Event Date & Start Time *"
                                        value={eventForm.startTime}
                                        onChange={e => setEventForm({ ...eventForm, startTime: e.target.value })}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <StyledInput 
                                        fullWidth type="datetime-local" label="End Time *"
                                        value={eventForm.endTime}
                                        onChange={e => setEventForm({ ...eventForm, endTime: e.target.value })}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <StyledInput 
                                        fullWidth type="datetime-local" label="Registration Deadline"
                                        value={eventForm.registrationDeadline}
                                        onChange={e => setEventForm({ ...eventForm, registrationDeadline: e.target.value })}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <StyledInput 
                                        fullWidth type="number" label="Maximum Participants *"
                                        value={eventForm.capacity}
                                        onChange={e => setEventForm({ ...eventForm, capacity: Number(e.target.value) })}
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Venue *</Typography>
                                    <StyledInput 
                                        select fullWidth
                                        value={eventForm.venueId}
                                        onChange={e => {
                                            const selectedVenue = venues.find(v => v.venueId === e.target.value);
                                            setEventForm({ 
                                                ...eventForm, 
                                                venueId: e.target.value,
                                                location: selectedVenue ? `${selectedVenue.name} (${selectedVenue.building})` : eventForm.location
                                            });
                                        }}
                                    >
                                        <MenuItem value="">Select a venue</MenuItem>
                                        {venues.map(v => (
                                            <MenuItem key={v.venueId} value={v.venueId}>
                                                {v.name}
                                            </MenuItem>
                                        ))}
                                        <MenuItem value="other">Other / External Location</MenuItem>
                                    </StyledInput>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Location Details</Typography>
                                    <StyledInput 
                                        fullWidth 
                                        placeholder={eventForm.venueId === 'other' ? "Enter external address" : "Specific room or directions"}
                                        value={eventForm.location}
                                        onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <StyledInput 
                                        fullWidth label="Event Poster / Image URL (optional)"
                                        value={eventForm.imageUrl}
                                        onChange={e => setEventForm({ ...eventForm, imageUrl: e.target.value })}
                                        InputProps={{ startAdornment: <ImageIcon sx={{ mr: 1, color: 'var(--text-dim)', fontSize: '1.1rem' }} /> }}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <StyledInput 
                                        fullWidth multiline rows={4} label="Event Description"
                                        value={eventForm.description}
                                        onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                                    />
                                </Grid>

                                <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                    <Button 
                                        type="button"
                                        onClick={() => setTabValue(0)}
                                        sx={{ color: 'var(--text-dim)', textTransform: 'none', fontWeight: 600 }}
                                    >
                                        Cancel
                                    </Button>
                                    <GradientButton type="submit" disabled={loading} sx={{ px: 4 }}>
                                        {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                                        Create Event
                                    </GradientButton>
                                </Grid>
                            </Grid>
                        </form>
                    </TabPanel>

                    {/* ── Engagement Tab ───────────────────────────────────────── */}
                    <TabPanel value={tabValue} index={2}>
                        <form onSubmit={handleEngagementSubmit}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Select Club (Optional)</Typography>
                                    <StyledInput 
                                        fullWidth select
                                        value={engagementForm.clubId}
                                        onChange={e => setEngagementForm({ ...engagementForm, clubId: e.target.value })}
                                    >
                                        <MenuItem value="">Choose a club</MenuItem>
                                        {myClubs.map(club => (
                                            <MenuItem key={club.clubId} value={club.clubId}>
                                                {club.name}
                                            </MenuItem>
                                        ))}
                                    </StyledInput>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Engagement Type *</Typography>
                                    <StyledInput 
                                        fullWidth select required
                                        value={engagementForm.type}
                                        onChange={e => setEngagementForm({ ...engagementForm, type: e.target.value as EngagementType })}
                                    >
                                        <MenuItem value="">Select type</MenuItem>
                                        {ENGAGEMENT_TYPE_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                    </StyledInput>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Title *</Typography>
                                    <StyledInput 
                                        fullWidth required
                                        placeholder="What should our next workshop be about?"
                                        value={engagementForm.title}
                                        onChange={e => setEngagementForm({ ...engagementForm, title: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Description *</Typography>
                                    <StyledInput 
                                        fullWidth required multiline rows={4}
                                        placeholder="Provide details about this engagement activity..."
                                        value={engagementForm.description}
                                        onChange={e => setEngagementForm({ ...engagementForm, description: e.target.value })}
                                    />
                                </Grid>

                                {engagementForm.type === EngagementType.POLL && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'var(--text-main)' }}>Poll Options</Typography>
                                        <Stack spacing={2}>
                                            {engagementForm.pollOptions.map((opt, idx) => (
                                                <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
                                                    <StyledInput 
                                                        fullWidth size="small"
                                                        placeholder={`Option ${idx + 1}`}
                                                        value={opt}
                                                        onChange={e => updatePollOption(idx, e.target.value)}
                                                    />
                                                    <IconButton 
                                                        color="error" 
                                                        onClick={() => removePollOption(idx)}
                                                        disabled={engagementForm.pollOptions.length <= 2}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Box>
                                            ))}
                                            <Button 
                                                type="button"
                                                startIcon={<AddCircle />} 
                                                variant="outlined" 
                                                onClick={addPollOption}
                                                sx={{ 
                                                    alignSelf: 'flex-start',
                                                    textTransform: 'none',
                                                    borderRadius: '8px',
                                                    borderColor: 'var(--border-light)',
                                                    color: 'var(--text-secondary)'
                                                }}
                                            >
                                                Add Option
                                            </Button>
                                        </Stack>
                                    </Grid>
                                )}

                                <Grid item xs={12} sx={{ mt: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Security sx={{ color: 'var(--text-main)', fontSize: '1.4rem' }} />
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Venue Booking (Optional)</Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Venue</Typography>
                                    <StyledInput 
                                        fullWidth select
                                        value={engagementForm.venueId}
                                        onChange={e => setEngagementForm({ ...engagementForm, venueId: e.target.value })}
                                    >
                                        <MenuItem value="">Select venue (if in-person)</MenuItem>
                                        {venues.map(v => <MenuItem key={v.venueId} value={v.venueId}>{v.name}</MenuItem>)}
                                    </StyledInput>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Date</Typography>
                                    <StyledInput 
                                        fullWidth type="date"
                                        value={engagementForm.date}
                                        onChange={e => setEngagementForm({ ...engagementForm, date: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Time</Typography>
                                    <StyledInput 
                                        fullWidth type="time"
                                        value={engagementForm.time}
                                        onChange={e => setEngagementForm({ ...engagementForm, time: e.target.value })}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Button 
                                        type="button"
                                        variant="contained" startIcon={<Search />}
                                        sx={{ 
                                            textTransform: 'none', borderRadius: '8px', px: 3, py: 1,
                                            bgcolor: 'var(--primary)', boxShadow: '0 4px 12px rgba(67, 97, 238, 0.2)'
                                        }}
                                    >
                                        Check Availability
                                    </Button>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'var(--text-main)' }}>Deadline (if applicable)</Typography>
                                    <StyledInput 
                                        fullWidth type="datetime-local"
                                        value={engagementForm.deadline}
                                        onChange={e => setEngagementForm({ ...engagementForm, deadline: e.target.value })}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControlLabel 
                                        control={<Checkbox checked={engagementForm.notifyMembers} onChange={e => setEngagementForm({ ...engagementForm, notifyMembers: e.target.checked })} />}
                                        label="Pin to club board and notify members"
                                        sx={{ '& .MuiTypography-root': { fontSize: '0.9rem', fontWeight: 500 } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sx={{ mt: 2 }}>
                                    <GradientButton type="submit" sx={{ px: 4 }} disabled={loading}>
                                        {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                                        Launch Engagement
                                    </GradientButton>
                                </Grid>
                            </Grid>
                        </form>
                    </TabPanel>
                </Box>
            </GlassCard>
        </Box>
    );
};
