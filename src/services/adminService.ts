import { userRepository } from '../repositories/userRepository';
import { auditRepository } from '../repositories/auditRepository';
import { clubOfficerRequestRepository } from '../repositories/clubOfficerRequestRepository';
import { clubRepository } from '../repositories/clubRepository';
import { UserRole, AuditLog, ClubOfficerRequest, RequestStatus } from '../types';
import { Timestamp, arrayUnion } from 'firebase/firestore';

/**
 * Service for system-wide administrative tasks
 */
export class AdminService {
    /**
     * Change a user's role in the system
     */
    async changeUserRole(adminId: string, targetUserId: string, newRole: UserRole): Promise<void> {
        try {
            await userRepository.updateUser(targetUserId, { role: newRole });
            await auditRepository.logAction({
                userId: adminId,
                action: `CHANGE_ROLE_${newRole}`,
                resourceType: 'USER',
                resourceId: targetUserId,
                details: `Administrator ${adminId} changed role of user ${targetUserId} to ${newRole}`,
                timestamp: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error changing user role:', error);
            throw new Error('Failed to update user role');
        }
    }

    /**
     * Get recent system audit logs
     */
    async getRecentSystemLogs(limit: number = 50): Promise<AuditLog[]> {
        return auditRepository.getRecentLogs(limit);
    }

    /**
     * Log a system-wide configuration change
     */
    async logConfigChange(adminId: string, settingName: string, details: string): Promise<void> {
        await auditRepository.logAction({
            userId: adminId,
            action: `CONFIG_CHANGE_${settingName}`,
            resourceType: 'SYSTEM',
            resourceId: 'GLOBAL_CONFIG',
            details,
            timestamp: Timestamp.now(),
        });
    }

    // ─── Club Officer Request Management ────────────────────────────────────

    /**
     * Get all pending club officer requests
     */
    async getPendingOfficerRequests(): Promise<ClubOfficerRequest[]> {
        return clubOfficerRequestRepository.getPendingRequests();
    }

    /**
     * Get all club officer requests (all statuses)
     */
    async getAllOfficerRequests(): Promise<ClubOfficerRequest[]> {
        return clubOfficerRequestRepository.getAllRequests();
    }

    /**
     * Approve a club officer request:
     * 1. Promotes the student to CLUB_OFFICER
     * 2. Marks the request as APPROVED
     * 3. Logs the action
     */
    async approveOfficerRequest(
        requestId: string,
        studentId: string,
        adminId: string
    ): Promise<void> {
        try {
            // 1. Fetch the request to get the clubName
            const request = await clubOfficerRequestRepository.getRequestById(requestId);
            if (!request) throw new Error('Request not found');

            // 2. Promote user role in users collection
            await userRepository.updateUser(studentId, { role: UserRole.CLUB_OFFICER });

            // 3. Update the club document with the new managerId and add to members
            const club = await clubRepository.getClubByName(request.clubName);
            if (club) {
                // Update using any to support 'managerId' field and ensure they are in officerIds and memberIds arrays
                await clubRepository.updateClub(club.clubId, {
                    managerId: studentId,
                    officerIds: arrayUnion(studentId),
                    memberIds: arrayUnion(studentId)
                });
            }

            // 4. Mark request approved
            await clubOfficerRequestRepository.updateRequestStatus(
                requestId,
                RequestStatus.APPROVED,
                adminId
            );

            // 5. Audit log
            await auditRepository.logAction({
                userId: adminId,
                action: 'APPROVE_OFFICER_REQUEST',
                resourceType: 'USER',
                resourceId: studentId,
                details: `Admin ${adminId} approved club officer request ${requestId} for student ${studentId}. Linked to club: ${request.clubName}`,
                timestamp: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error approving officer request:', error);
            throw new Error('Failed to approve club officer request');
        }
    }

    /**
     * Reject a club officer request:
     * 1. Marks the request as REJECTED (user stays STUDENT)
     * 2. Logs the action
     */
    async rejectOfficerRequest(
        requestId: string,
        studentId: string,
        adminId: string,
        notes?: string
    ): Promise<void> {
        try {
            // 1. Fetch the request to archive it
            const request = await clubOfficerRequestRepository.getRequestById(requestId);

            // 2. Mark request rejected in the main collection
            await clubOfficerRequestRepository.updateRequestStatus(
                requestId,
                RequestStatus.REJECTED,
                adminId,
                notes
            );

            // 3. Archive in the rejected collection
            if (request) {
                await clubOfficerRequestRepository.archiveRejectedRequest({
                    ...request,
                    status: RequestStatus.REJECTED,
                    processedAt: Timestamp.now(),
                    processedBy: adminId,
                    notes: notes || ''
                });
            }

            // 4. Audit log
            await auditRepository.logAction({
                userId: adminId,
                action: 'REJECT_OFFICER_REQUEST',
                resourceType: 'USER',
                resourceId: studentId,
                details: `Admin ${adminId} rejected club officer request ${requestId} for student ${studentId}`,
                timestamp: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error rejecting officer request:', error);
            throw new Error('Failed to reject club officer request');
        }
    }
}

export const adminService = new AdminService();
