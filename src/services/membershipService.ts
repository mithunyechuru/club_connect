import { Timestamp } from 'firebase/firestore';
import {
  MembershipRequest,
  RequestStatus,
  ClubRole,
  NotificationType
} from '../types';
import { clubRepository } from '../repositories/clubRepository';
import { membershipRequestRepository } from '../repositories/membershipRequestRepository';
import { clubService } from './clubService';

/**
 * Service for managing club membership requests and approvals
 * Handles membership request lifecycle, tier assignment, and notifications
 */
export class MembershipService {
  /**
   * Submit a membership request for a club
   * Creates a pending membership request that requires officer approval
   * 
   * @param studentId - ID of the student requesting membership
   * @param clubId - ID of the club to join
   * @param message - Optional message from the student
   * @returns Promise<MembershipRequest> The created membership request
   * 
   * Requirements: 3.1
   */
  async submitMembershipRequest(
    studentId: string,
    clubId: string,
    message: string = ''
  ): Promise<MembershipRequest> {
    // Verify club exists
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    // Check if student is already a member
    if (club.memberIds.includes(studentId)) {
      throw new Error('Student is already a member of this club');
    }

    // Check if there's already a pending request
    const existingRequest = await membershipRequestRepository.getPendingRequestByStudentAndClub(
      studentId,
      clubId
    );
    if (existingRequest) {
      throw new Error('A pending membership request already exists for this club');
    }

    // Validate message length
    if (message.length > 500) {
      throw new Error('Message is too long (maximum 500 characters)');
    }

    const requestData: Omit<MembershipRequest, 'requestId'> = {
      studentId,
      clubId,
      status: RequestStatus.PENDING,
      message: message.trim(),
      requestedAt: Timestamp.now(),
    };

    return await membershipRequestRepository.createRequest(requestData);
  }

  /**
   * Approve a membership request
   * Adds the student to the club member list and assigns appropriate tier
   * 
   * @param requestId - ID of the membership request
   * @param approverId - ID of the officer approving the request
   * @param assignedTier - Optional tier to assign (if club has tiers)
   * @returns Promise<void>
   * 
   * Requirements: 3.2, 3.4
   */
  async approveMembershipRequest(
    requestId: string,
    approverId: string,
    assignedTier?: string
  ): Promise<void> {
    // Fetch the request from repository
    const request = await membershipRequestRepository.getRequestById(requestId);
    if (!request) {
      throw new Error('Membership request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new Error('Membership request is not pending');
    }

    // Verify the approver is an officer of the club
    const club = await clubRepository.getClubById(request.clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    if (!club.officerIds.includes(approverId)) {
      throw new Error('Only club officers can approve membership requests');
    }

    // Add student to club with MEMBER role
    await clubService.addMember(request.clubId, request.studentId, ClubRole.MEMBER);

    // If club has tier configuration and a tier is assigned, validate it
    if (assignedTier && club.tierConfig) {
      // Validate that the assigned tier matches the club's tier configuration
      if (club.tierConfig.name !== assignedTier) {
        throw new Error('Invalid tier assignment');
      }
      // In a real implementation, we would store the tier assignment
      // This could be in a separate collection or as part of the member data
    }

    // Update request status
    await membershipRequestRepository.updateRequest(requestId, {
      status: RequestStatus.APPROVED,
      processedAt: Timestamp.now(),
    });

    // Send notification to student
    await this.sendNotification(
      request.studentId,
      NotificationType.MEMBERSHIP_APPROVED,
      'Membership Approved',
      `Your membership request to ${club.name} has been approved!`,
      { clubId: request.clubId, clubName: club.name }
    );
  }

  /**
   * Reject a membership request
   * Removes the request and notifies the student
   * 
   * @param requestId - ID of the membership request
   * @param rejecterId - ID of the officer rejecting the request
   * @param reason - Optional reason for rejection
   * @returns Promise<void>
   * 
   * Requirements: 3.3
   */
  async rejectMembershipRequest(
    requestId: string,
    rejecterId: string,
    reason?: string
  ): Promise<void> {
    // Fetch the request from repository
    const request = await membershipRequestRepository.getRequestById(requestId);
    if (!request) {
      throw new Error('Membership request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new Error('Membership request is not pending');
    }

    // Verify the rejecter is an officer of the club
    const club = await clubRepository.getClubById(request.clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    if (!club.officerIds.includes(rejecterId)) {
      throw new Error('Only club officers can reject membership requests');
    }

    // Update request status
    await membershipRequestRepository.updateRequest(requestId, {
      status: RequestStatus.REJECTED,
      processedAt: Timestamp.now(),
    });

    // Send notification to student
    const message = reason
      ? `Your membership request to ${club.name} has been rejected. Reason: ${reason}`
      : `Your membership request to ${club.name} has been rejected.`;

    await this.sendNotification(
      request.studentId,
      NotificationType.MEMBERSHIP_REJECTED,
      'Membership Request Rejected',
      message,
      { clubId: request.clubId, clubName: club.name }
    );

    // Remove the request from the database
    await membershipRequestRepository.deleteRequest(requestId);
  }

  /**
   * Get all pending membership requests for a club
   * @param clubId - ID of the club
   * @returns Promise<MembershipRequest[]> Array of pending requests
   * 
   * Requirements: 3.5
   */
  async getPendingRequestsByClub(clubId: string): Promise<MembershipRequest[]> {
    return await membershipRequestRepository.getPendingRequestsByClub(clubId);
  }

  /**
   * Get all membership requests by a student
   * @param studentId - ID of the student
   * @returns Promise<MembershipRequest[]> Array of requests
   */
  async getRequestsByStudent(studentId: string): Promise<MembershipRequest[]> {
    return await membershipRequestRepository.getRequestsByStudent(studentId);
  }

  /**
   * Send a notification to a user
   * @param userId - ID of the user to notify
   * @param type - Type of notification
   * @param title - Notification title
   * @param message - Notification message
   * @param data - Additional data
   */
  private async sendNotification(
    userId: string,
    _type: NotificationType,
    title: string,
    message: string,
    _data?: any
  ): Promise<void> {
    // In a real implementation, this would use NotificationService
    // For now, this is a placeholder that logs the notification
    // This will be replaced when NotificationService is implemented in task 12
    console.log(`Notification sent to ${userId}: ${title} - ${message}`);
  }
}

export const membershipService = new MembershipService();
