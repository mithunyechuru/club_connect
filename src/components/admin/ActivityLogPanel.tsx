import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import { Refresh, History } from '@mui/icons-material';
import { AuditLog } from '../../types';
import { adminService } from '../../services/adminService';
import { GlassCard } from '../shared/DesignSystem';

const resourceColors: Record<string, { bg: string; color: string }> = {
    USER: { bg: 'rgba(107,15,26,0.08)', color: 'var(--primary)' },
    CLUB: { bg: 'rgba(201,151,58,0.10)', color: '#c9973a' },
    EVENT: { bg: 'rgba(59,130,246,0.10)', color: '#3b82f6' },
    SYSTEM: { bg: 'rgba(124,58,237,0.10)', color: '#7c3aed' },
};

export const ActivityLogPanel: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await adminService.getRecentSystemLogs(50);
            setLogs(data);
        } catch (e) {
            console.error('Error fetching audit logs:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    const formatDate = (ts: any) => {
        if (!ts) return '—';
        const d = ts.toDate?.() ?? new Date(ts);
        return d.toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatAction = (action: string) =>
        action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        System Activity Log
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 0.3 }}>
                        Audit trail of the last 50 admin actions
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchLogs} sx={{ color: 'var(--primary)' }}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: 'var(--primary)' }} />
                </Box>
            ) : logs.length === 0 ? (
                <GlassCard sx={{ py: 8, textAlign: 'center' }}>
                    <History sx={{ fontSize: '3rem', color: 'var(--text-dim)', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        No activity logs yet.
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-dim)', mt: 0.5 }}>
                        Admin actions will be recorded here automatically.
                    </Typography>
                </GlassCard>
            ) : (
                <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ background: 'rgba(107,15,26,0.04)' }}>
                                    {['Timestamp', 'Action', 'Resource Type', 'Resource ID', 'Details'].map(h => (
                                        <TableCell key={h} sx={{
                                            fontWeight: 700, fontSize: '0.76rem', color: 'var(--text-muted)',
                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                            borderBottom: '2px solid var(--border-light)', py: 1.5,
                                        }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map((log) => {
                                    const rc = resourceColors[log.resourceType] ?? resourceColors.SYSTEM;
                                    return (
                                        <TableRow
                                            key={log.logId}
                                            sx={{ '&:hover': { background: 'rgba(107,15,26,0.03)' }, transition: 'background 0.15s' }}
                                        >
                                            <TableCell>
                                                <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {formatDate(log.timestamp)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                    {formatAction(log.action)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={log.resourceType}
                                                    size="small"
                                                    sx={{
                                                        background: rc.bg, color: rc.color,
                                                        fontWeight: 600, fontSize: '0.72rem', height: 22,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {log.resourceId.slice(0, 12)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 320 }}>
                                                <Tooltip title={log.details} placement="top">
                                                    <Typography sx={{
                                                        fontSize: '0.8rem', color: 'var(--text-secondary)',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {log.details}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </GlassCard>
            )}
        </Box>
    );
};
