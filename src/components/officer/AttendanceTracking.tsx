import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Typography,
    Box,
    Grid,
    CircularProgress,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton,
    Alert,
    Divider
} from '@mui/material';
import { QrCodeScanner, CheckCircle, PersonSearch, RadioButtonUnchecked, Close, CenterFocusStrong } from '@mui/icons-material';
import { GlassCard, GradientButton, StyledInput } from '../shared/DesignSystem';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material';
import { eventRepository } from '../../repositories/eventRepository';
import { rsvpRepository } from '../../repositories/rsvpRepository';
import { userRepository } from '../../repositories/userRepository';
import { attendanceRepository } from '../../repositories/attendanceRepository';
import { manualAttendanceService } from '../../services/manualAttendanceService';
import { qrCodeScanner } from '../../services/qrCodeScanner';
import { useAuth } from '../../context/AuthContext';
import { Event, User, RSVP, RSVPStatus, AttendanceRecord } from '../../types';

export const AttendanceTracking: React.FC = () => {
    const { user } = useAuth();
    const { eventId } = useParams<{ eventId: string }>();
    const [event, setEvent] = useState<Event | null>(null);
    const [rsvps, setRsvps] = useState<RSVP[]>([]);
    const [students, setStudents] = useState<Record<string, User>>({});
    const [attendance, setAttendance] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannedId, setScannedId] = useState('');

    useEffect(() => {
        const fetchAttendanceData = async () => {
            if (!eventId) return;
            try {
                const eventData = await eventRepository.getEventById(eventId);
                setEvent(eventData);

                const eventRsvps = await rsvpRepository.getRSVPsByEvent(eventId);
                const confirmedRsvps = eventRsvps.filter(r => r.status === RSVPStatus.CONFIRMED);
                setRsvps(confirmedRsvps);

                const studentData = await Promise.all(
                    confirmedRsvps.map(r => userRepository.getUserById(r.studentId))
                );
                const studentMap: Record<string, User> = {};
                studentData.forEach(s => { if (s) studentMap[s.userId] = s; });
                setStudents(studentMap);

                const records = await attendanceRepository.getAttendanceByEvent(eventId);
                const attendanceMap: Record<string, boolean> = {};
                records.forEach((r: AttendanceRecord) => { attendanceMap[r.studentId] = true; });
                setAttendance(attendanceMap);
            } catch (error) {
                console.error('Error fetching attendance data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAttendanceData();
    }, [eventId]);

    const handleCheckIn = async (studentId: string) => {
        if (!eventId || !user) return;
        try {
            await manualAttendanceService.markPresent(eventId, studentId, user.userId);
            setAttendance(prev => ({ ...prev, [studentId]: true }));
        } catch (error) {
            console.error('Error checking in:', error);
        }
    };

    const handleSimulateScan = async () => {
        if (!eventId || !scannedId) return;
        try {
            const qrToken = qrCodeScanner.generateQRToken(eventId);
            await qrCodeScanner.processScan(qrToken, scannedId);
            setAttendance(prev => ({ ...prev, [scannedId]: true }));
            setScannerOpen(false);
            setScannedId('');
        } catch (error: any) {
            alert(error.message || 'Scan failed');
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress /></Box>;
    if (!event) return <Alert severity="error">Event not found.</Alert>;

    const filteredRsvps = rsvps.filter(r => {
        const student = students[r.studentId];
        if (!student) return false;
        const name = `${student.profile.firstName} ${student.profile.lastName}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    return (
        <Box>
            <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Attendance Tracking</Typography>
                    <Typography variant="body1" sx={{ color: 'var(--text-muted)' }}>
                        {event.name} • {event.startTime.toDate().toLocaleDateString()}
                    </Typography>
                </Box>
                <GradientButton startIcon={<QrCodeScanner />} onClick={() => setScannerOpen(true)}>Launch Scanner</GradientButton>
            </Box>

            <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                    <GlassCard sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="h2" sx={{ fontWeight: 800, mb: 1 }}>
                            {Object.keys(attendance).length} / {rsvps.length}
                        </Typography>
                        <Typography variant="body1" color="var(--text-dim)" sx={{ mb: 4 }}>Students Checked In</Typography>

                        <Box sx={{ p: 3, borderRadius: 3, background: 'rgba(255,255,255,0.02)', mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>QR Code for Check-in</Typography>
                            <Box
                                sx={{
                                    width: 180,
                                    height: 180,
                                    bgcolor: 'white',
                                    margin: '0 auto',
                                    p: 2,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Box sx={{ width: '100%', height: '100%', border: '4px solid black', position: 'relative' }}>
                                    <Box sx={{ position: 'absolute', top: 10, left: 10, width: 30, height: 30, bgcolor: 'black' }} />
                                    <Box sx={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, bgcolor: 'black' }} />
                                    <Box sx={{ position: 'absolute', bottom: 10, left: 10, width: 30, height: 30, bgcolor: 'black' }} />
                                    <Box sx={{ m: 6, width: 40, height: 40, border: '2px solid black' }} />
                                </Box>
                            </Box>
                        </Box>
                    </GlassCard>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Box sx={{ mb: 3 }}>
                        <StyledInput
                            fullWidth
                            placeholder="Search by student name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: <PersonSearch sx={{ mr: 1, color: 'var(--text-dim)' }} /> }}
                        />
                    </Box>
                    <GlassCard sx={{ p: 0 }}>
                        <List>
                            {filteredRsvps.length > 0 ? (
                                filteredRsvps.map((rsvp, idx) => {
                                    const student = students[rsvp.studentId];
                                    const isCheckedIn = attendance[rsvp.studentId];
                                    return (
                                        <React.Fragment key={rsvp.rsvpId}>
                                            <ListItem
                                                secondaryAction={
                                                    isCheckedIn ? (
                                                        <IconButton disabled sx={{ color: 'var(--secondary)' }}><CheckCircle /></IconButton>
                                                    ) : (
                                                        <IconButton onClick={() => handleCheckIn(rsvp.studentId)} sx={{ color: 'var(--text-dim)' }}>
                                                            <RadioButtonUnchecked />
                                                        </IconButton>
                                                    )
                                                }
                                            >
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                        {student?.profile.firstName[0]}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={`${student?.profile.firstName} ${student?.profile.lastName}`}
                                                    secondary={student?.email}
                                                    primaryTypographyProps={{ fontWeight: 600, color: isCheckedIn ? 'var(--text-dim)' : 'var(--text-main)' }}
                                                />
                                            </ListItem>
                                            {idx < filteredRsvps.length - 1 && <Divider sx={{ borderColor: 'var(--border-glass)' }} />}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-dim)' }}>No RSVP'd students match your search.</Box>
                            )}
                        </List>
                    </GlassCard>
                </Grid>
            </Grid>

            {/* QR Scanner Simulation Dialog */}
            <Dialog
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                PaperProps={{ sx: { borderRadius: 4, background: 'var(--bg-main)', border: '1px solid var(--border-glass)', minWidth: 400 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    QR Attendance Scanner
                    <IconButton onClick={() => setScannerOpen(false)}><Close /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Box sx={{
                            width: 240, height: 240, border: '2px dashed var(--primary)',
                            borderRadius: 4, margin: '0 auto 24px', position: 'relative',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(107,15,26,0.03)'
                        }}>
                            <CenterFocusStrong sx={{ fontSize: '4rem', color: 'var(--primary)', opacity: 0.5 }} />
                            {/* Scanning Animation simulation - simple pulsing box */}
                            <Box sx={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                                background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)',
                                animation: 'scanLine 2s infinite ease-in-out'
                            }} />
                        </Box>

                        <Typography variant="body1" sx={{ mb: 3, color: 'var(--text-muted)' }}>
                            Simulate scanning a student's QR code.
                        </Typography>

                        <StyledInput
                            fullWidth
                            label="Student ID"
                            placeholder="Enter or select student ID"
                            value={scannedId}
                            onChange={(e) => setScannedId(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid var(--border-glass)' }}>
                    <Button onClick={() => setScannerOpen(false)} sx={{ color: 'var(--text-dim)' }}>Cancel</Button>
                    <GradientButton
                        disabled={!scannedId}
                        onClick={handleSimulateScan}
                    >
                        Simulate Scan
                    </GradientButton>
                </DialogActions>
            </Dialog>

            <style>{`
                @keyframes scanLine {
                    0% { top: 0% }
                    50% { top: 100% }
                    100% { top: 0% }
                }
            `}</style>
        </Box>
    );
};
