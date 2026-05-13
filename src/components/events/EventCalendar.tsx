import React, { useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Grid,
    Popover,
    useTheme,
    alpha,
    Divider,
    Stack,
} from '@mui/material';
import {
    ChevronLeft,
    ChevronRight,
    LocationOn,
    Schedule,
    Groups,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Event, EventType } from '../../types';
import { GlassCard, Badge, GradientButton } from '../shared/DesignSystem';

interface EventCalendarProps {
    events: Event[];
}

export const EventCalendar: React.FC<EventCalendarProps> = ({ events }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleEventClick = (event: React.MouseEvent<HTMLElement>, eventData: Event) => {
        setAnchorEl(event.currentTarget);
        setSelectedEvent(eventData);
    };

    const handleClosePopover = () => {
        setAnchorEl(null);
        setSelectedEvent(null);
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();

    const calendarDays = [];
    const totalSlots = 42; // 6 rows of 7 days
    
    // Generate all 42 slots (6 weeks) to handle padding and year transitions automatically
    for (let i = 0; i < totalSlots; i++) {
        const d = new Date(year, month, i - firstDay + 1);
        calendarDays.push({
            day: d.getDate(),
            month: d.getMonth(),
            year: d.getFullYear(),
            isCurrentMonth: d.getMonth() === month,
        });
    }

    const getEventColor = (type: EventType) => {
        switch (type) {
            case EventType.WORKSHOP: return '#1e3c72';
            case EventType.HACKATHON: return '#c9973a';
            case EventType.SEMINAR: return '#059669';
            case EventType.SOCIAL_GATHERING: return '#3b82f6';
            case EventType.COMPETITION: return '#dc2626';
            default: return 'var(--primary)';
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text-main)' }}>
                    {monthNames[month]} {year}
                </Typography>
                <Stack direction="row" spacing={1}>
                    <IconButton onClick={handlePrevMonth} sx={{ border: '1px solid var(--border-light)' }}>
                        <ChevronLeft />
                    </IconButton>
                    <IconButton onClick={handleNextMonth} sx={{ border: '1px solid var(--border-light)' }}>
                        <ChevronRight />
                    </IconButton>
                </Stack>
            </Box>

            <GlassCard sx={{ p: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <Grid container columns={7}>
                    {daysOfWeek.map(day => (
                        <Grid item xs={1} key={day} sx={{ 
                            p: 2, 
                            textAlign: 'center', 
                            background: 'var(--primary)', 
                            color: '#fff',
                            fontWeight: 700,
                            borderRight: day === 'Sat' ? 'none' : '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {day}
                        </Grid>
                    ))}
                    {calendarDays.map((dateObj, index) => {
                        const dayEvents = events.filter(e => {
                            const eventDate = e.startTime.toDate();
                            return eventDate.getDate() === dateObj.day &&
                                   eventDate.getMonth() === dateObj.month &&
                                   eventDate.getFullYear() === dateObj.year;
                        });

                        const isToday = new Date().toDateString() === new Date(dateObj.year, dateObj.month, dateObj.day).toDateString();

                        return (
                            <Grid item xs={1} key={index} sx={{ 
                                height: 140, 
                                border: '1px solid var(--border-light)',
                                p: 1,
                                background: dateObj.isCurrentMonth ? (isToday ? alpha(theme.palette.primary.main, 0.05) : 'var(--bg-card)') : 'var(--bg-main)',
                                position: 'relative',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    background: alpha(theme.palette.primary.main, 0.02)
                                }
                            }}>
                                <Typography sx={{ 
                                    fontWeight: dateObj.isCurrentMonth ? 700 : 400, 
                                    color: dateObj.isCurrentMonth ? (isToday ? 'var(--primary)' : 'var(--text-main)') : 'var(--text-dim)',
                                    mb: 1,
                                    fontSize: '0.9rem'
                                }}>
                                    {dateObj.day}
                                </Typography>
                                <Stack spacing={0.5}>
                                    {dayEvents.slice(0, 3).map(event => (
                                        <Box 
                                            key={event.eventId}
                                            onClick={(e) => handleEventClick(e, event)}
                                            sx={{ 
                                                p: '4px 8px',
                                                borderRadius: '4px',
                                                background: getEventColor(event.type),
                                                color: '#fff',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                '&:hover': { opacity: 0.9, transform: 'translateX(2px)' },
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {event.name}
                                        </Box>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <Typography variant="caption" sx={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', mt: 0.5, display: 'block' }}>
                                            + {dayEvents.length - 3} more
                                        </Typography>
                                    )}
                                </Stack>
                            </Grid>
                        );
                    })}
                </Grid>
            </GlassCard>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClosePopover}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    sx: {
                        p: 3,
                        width: 320,
                        borderRadius: 3,
                        boxShadow: 'var(--shadow-card-hover)',
                        border: '1px solid var(--border-light)',
                    }
                }}
            >
                {selectedEvent && (
                    <Stack spacing={2}>
                        <Box>
                            <Badge color="accent" sx={{ mb: 1.5 }}>{selectedEvent.type.replace('_', ' ')}</Badge>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{selectedEvent.name}</Typography>
                        </Box>
                        
                        <Divider sx={{ borderColor: 'var(--border-light)' }} />

                        <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Schedule sx={{ fontSize: '1.2rem', color: 'var(--primary)' }} />
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {selectedEvent.startTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                    <Typography variant="caption" color="var(--text-dim)">
                                        {selectedEvent.startTime.toDate().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <LocationOn sx={{ fontSize: '1.2rem', color: 'var(--primary)' }} />
                                <Typography variant="body2" color="var(--text-main)">{selectedEvent.location}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Groups sx={{ fontSize: '1.2rem', color: 'var(--primary)' }} />
                                <Typography variant="body2" color="var(--text-main)">
                                    {selectedEvent.registeredCount} / {selectedEvent.capacity} Registered
                                </Typography>
                            </Box>
                        </Stack>

                        <GradientButton 
                            variant="contained" 
                            fullWidth 
                            onClick={() => {
                                handleClosePopover();
                                // Navigate to search results with this event's name to highlight it
                                navigate(`/events?q=${encodeURIComponent(selectedEvent.name)}`);
                            }}
                        >
                            View Details
                        </GradientButton>
                    </Stack>
                )}
            </Popover>
        </Box>
    );
};
