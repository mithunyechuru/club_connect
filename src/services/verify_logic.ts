import { adminService } from './adminService';
import { clubOfficerRequestRepository } from '../repositories/clubOfficerRequestRepository';
import { clubRepository } from '../repositories/clubRepository';
import { RequestStatus, Timestamp } from '../types';

// This script is intended to be run in a test environment or via npx ts-node
// It performs a live verification of the approval and rejection logic.

async function verify() {
    console.log('--- STARTING VERIFICATION ---');

    const testClubName = 'Computer Science Club';

    // 1. Create a dummy request for approval
    const approveReq = await clubOfficerRequestRepository.createRequest({
        studentId: 'test_student_approve_' + Date.now(),
        studentName: 'Verify Approve Student',
        email: 'approve@test.com',
        clubName: testClubName,
        status: RequestStatus.PENDING,
        requestedAt: Timestamp.now(),
    });
    console.log('Created Approval Request:', approveReq.requestId);

    // 2. Approve it
    await adminService.approveOfficerRequest(approveReq.requestId, approveReq.studentId, 'admin_verify');
    console.log('Approved Request.');

    // 3. Verify club has the member
    const club = await clubRepository.getClubByName(testClubName);
    if (club?.memberIds.includes(approveReq.studentId)) {
        console.log('✅ SUCCESS: Student added to club members!');
    } else {
        console.log('❌ FAILURE: Student NOT found in club members.');
    }

    // 4. Create a dummy request for rejection
    const rejectReq = await clubOfficerRequestRepository.createRequest({
        studentId: 'test_student_reject_' + Date.now(),
        studentName: 'Verify Reject Student',
        email: 'reject@test.com',
        clubName: 'Tech Enthusiasts',
        status: RequestStatus.PENDING,
        requestedAt: Timestamp.now(),
    });
    console.log('Created Rejection Request:', rejectReq.requestId);

    // 5. Reject it
    await adminService.rejectOfficerRequest(rejectReq.requestId, rejectReq.studentId, 'admin_verify', 'Verification test rejection');
    console.log('Rejected Request.');

    console.log('--- VERIFICATION COMPLETE ---');
    console.log('Please check your Firestore Console for the "rejectedClubOfficerRequests" collection.');
}

verify().catch(e => {
    console.error('Verification failed:', e);
});
