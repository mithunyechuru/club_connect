import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, Tooltip, CircularProgress, IconButton,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Button, TextField,
} from '@mui/material';
import { CheckCircle, Cancel, HourglassEmpty, Refresh } from '@mui/icons-material';
import { ClubOfficerRequest, RequestStatus } from '../../types';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../shared/DesignSystem';

// ─── Status chip colours ────────────────────────────────────────────────────
const statusConfig: Record<RequestStatus, { label: string; color: string; bg: string }> = {
    [RequestStatus.PENDING]: { label: 'Pending', color: '#c9973a', bg: 'rgba(201,151,58,0.12)' },
    [RequestStatus.APPROVED]: { label: 'Approved', color: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
    [RequestStatus.REJECTED]: { label: 'Rejected', color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
};

interface Props {
    onPendingCountChange?: (count: number) => void;
    filterStatus?: RequestStatus;
}

export const PendingRequestsPanel: React.FC<Props> = ({ onPendingCountChange, filterStatus = RequestStatus.PENDING }) => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<ClubOfficerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Reject dialog state
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean; request: ClubOfficerRequest | null }>({
        open: false, request: null,
    });
    const [rejectNotes, setRejectNotes] = useState('');

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const all = await adminService.getAllOfficerRequests();
            const filtered = all.filter(r => r.status === filterStatus);
            setRequests(filtered);

            // Only update global pending count if we are in pending mode
            if (filterStatus === RequestStatus.PENDING) {
                onPendingCountChange?.(filtered.length);
            } else {
                // Otherwise calculate it separately just in case
                const pendingCount = all.filter(r => r.status === RequestStatus.PENDING).length;
                onPendingCountChange?.(pendingCount);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [onPendingCountChange, filterStatus]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    // Auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    const handleApprove = async (req: ClubOfficerRequest) => {
        if (!user) return;
        setActionLoading(req.requestId);
        try {
            await adminService.approveOfficerRequest(req.requestId, req.studentId, user.userId);
            setToast({ msg: `✓ ${req.studentName} approved as Club Officer.`, type: 'success' });
            await fetchRequests();
        } catch {
            setToast({ msg: 'Failed to approve request.', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const openRejectDialog = (req: ClubOfficerRequest) => {
        setRejectNotes('');
        setRejectDialog({ open: true, request: req });
    };

    const handleReject = async () => {
        if (!user || !rejectDialog.request) return;
        const req = rejectDialog.request;
        setRejectDialog({ open: false, request: null });
        setActionLoading(req.requestId);
        try {
            await adminService.rejectOfficerRequest(req.requestId, req.studentId, user.userId, rejectNotes || undefined);
            setToast({ msg: `✗ ${req.studentName}'s request has been rejected.`, type: 'success' });
            await fetchRequests();
        } catch {
            setToast({ msg: 'Failed to reject request.', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (ts: any) => {
        if (!ts) return '—';
        const d = ts.toDate?.() ?? new Date(ts);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const isRejectedView = filterStatus === RequestStatus.REJECTED;

    return (
        <Box>
            {/* Toast */}
            {toast && (
                <Box sx={{
                    position: 'fixed', top: 24, right: 24, zIndex: 9999,
                    background: toast.type === 'success' ? '#166534' : '#991b1b',
                    color: '#fff', px: 3, py: 1.5, borderRadius: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                    fontSize: '0.88rem', fontWeight: 500,
                    animation: 'fadeInDown 0.25s ease',
                }}>
                    {toast.msg}
                </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {isRejectedView ? 'Rejected Applications' : 'Club Officer Applications'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 0.3 }}>
                        {isRejectedView
                            ? 'History of rejected club officer/manager requests'
                            : 'Review and manage pending club officer/manager requests'}
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchRequests} sx={{ color: 'var(--primary)' }}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: 'var(--primary)' }} />
                </Box>
            ) : requests.length === 0 ? (
                <GlassCard sx={{ py: 8, textAlign: 'center' }}>
                    <HourglassEmpty sx={{ fontSize: '3rem', color: 'var(--text-dim)', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        {isRejectedView ? 'No rejected requests found.' : 'No pending requests found.'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-dim)', mt: 0.5 }}>
                        {isRejectedView
                            ? 'History of rejected applications will appear here.'
                            : 'When students apply to become Club Officers, their requests will appear here.'}
                    </Typography>
                </GlassCard>
            ) : (
                <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ background: 'rgba(107,15,26,0.04)' }}>
                                    {['Request ID', 'Manager Name', 'Email', 'Club Name', 'Request Date', 'Status', 'Actions'].map(h => (
                                        <TableCell key={h} sx={{
                                            fontWeight: 700, fontSize: '0.76rem', color: 'var(--text-muted)',
                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                            borderBottom: '2px solid var(--border-light)',
                                            py: 1.5,
                                        }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {requests.map((req) => {
                                    const cfg = statusConfig[req.status];
                                    const isPending = req.status === RequestStatus.PENDING;
                                    const busy = actionLoading === req.requestId;
                                    return (
                                        <TableRow
                                            key={req.requestId}
                                            sx={{
                                                '&:hover': { background: 'rgba(107,15,26,0.03)' },
                                                transition: 'background 0.15s',
                                            }}
                                        >
                                            {/* Request ID */}
                                            <TableCell>
                                                <Tooltip title={req.requestId}>
                                                    <Typography
                                                        sx={{
                                                            fontFamily: 'monospace', fontSize: '0.75rem',
                                                            color: 'var(--text-muted)',
                                                            background: 'var(--bg-page)', px: 1, py: 0.3,
                                                            borderRadius: '4px', display: 'inline-block',
                                                        }}
                                                    >
                                                        #{req.requestId.slice(0, 8).toUpperCase()}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>

                                            {/* Name */}
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                                    {req.studentName}
                                                </Typography>
                                            </TableCell>

                                            {/* Email */}
                                            <TableCell>
                                                <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    {req.email}
                                                </Typography>
                                            </TableCell>

                                            {/* Club */}
                                            <TableCell>
                                                <Chip
                                                    label={req.clubName}
                                                    size="small"
                                                    sx={{
                                                        background: 'rgba(107,15,26,0.08)',
                                                        color: 'var(--primary)', fontWeight: 600,
                                                        fontSize: '0.78rem', height: 24,
                                                    }}
                                                />
                                            </TableCell>

                                            {/* Date */}
                                            <TableCell>
                                                <Typography sx={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                                                    {formatDate(req.requestedAt)}
                                                </Typography>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Box sx={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 0.6,
                                                        background: cfg.bg, color: cfg.color,
                                                        px: 1.5, py: 0.4, borderRadius: '20px',
                                                        fontSize: '0.75rem', fontWeight: 700,
                                                        textTransform: 'uppercase', letterSpacing: '0.4px',
                                                        width: 'fit-content'
                                                    }}>
                                                        {cfg.label}
                                                    </Box>
                                                    {isRejectedView && req.notes && (
                                                        <Tooltip title={req.notes}>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: 'var(--text-muted)',
                                                                    fontStyle: 'italic',
                                                                    maxWidth: 150,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    display: 'block'
                                                                }}
                                                            >
                                                                Reason: {req.notes}
                                                            </Typography>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell>
                                                {isPending ? (
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Tooltip title="Approve">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={busy}
                                                                    onClick={() => handleApprove(req)}
                                                                    sx={{
                                                                        color: '#16a34a',
                                                                        background: 'rgba(22,163,74,0.08)',
                                                                        '&:hover': { background: 'rgba(22,163,74,0.18)' },
                                                                        borderRadius: '8px', p: 0.8,
                                                                    }}
                                                                >
                                                                    {busy ? <CircularProgress size={16} sx={{ color: '#16a34a' }} /> : <CheckCircle fontSize="small" />}
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title="Reject">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={busy}
                                                                    onClick={() => openRejectDialog(req)}
                                                                    sx={{
                                                                        color: '#dc2626',
                                                                        background: 'rgba(220,38,38,0.08)',
                                                                        '&:hover': { background: 'rgba(220,38,38,0.18)' },
                                                                        borderRadius: '8px', p: 0.8,
                                                                    }}
                                                                >
                                                                    <Cancel fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Box>
                                                ) : (
                                                    <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                                        {req.status === RequestStatus.APPROVED ? 'Approved' : 'Rejected'}
                                                        {req.processedAt && ` • ${formatDate(req.processedAt)}`}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </GlassCard>
            )}

            {/* Reject Dialog */}
            <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, request: null })} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    Reject Application
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2, color: 'var(--text-muted)' }}>
                        You are about to reject <strong>{rejectDialog.request?.studentName}</strong>'s application
                        to manage <strong>{rejectDialog.request?.clubName}</strong>.
                        Optionally provide a reason (visible in the audit log).
                    </DialogContentText>
                    <TextField
                        fullWidth multiline rows={3}
                        label="Reason (optional)"
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setRejectDialog({ open: false, request: null })} sx={{ color: 'var(--text-muted)' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleReject}
                        sx={{ background: '#dc2626', '&:hover': { background: '#b91c1c' }, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                        Confirm Rejection
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
