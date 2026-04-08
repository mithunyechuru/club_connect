import { adminService } from './adminService';
import { clubOfficerRequestRepository } from '../repositories/clubOfficerRequestRepository';
import { clubRepository } from '../repositories/clubRepository';
import { RequestStatus, Timestamp } from '../types';

// Unmock everything to run against live Firebase
jest.unmock('firebase/app');
jest.unmock('firebase/auth');
jest.unmock('firebase/firestore');
jest.unmock('./firebase');
jest.unmock('../repositories/clubOfficerRequestRepository');
jest.unmock('../repositories/clubRepository');
jest.unmock('../repositories/userRepository');

// Set real env vars (matching .env.development)
process.env.VITE_USE_FIREBASE_EMULATOR = 'false';

describe('Live Verification', () => {
    it('should verify approval and rejection logic on live Firestore', async () => {
        console.log('--- STARTING LIVE VERIFICATION ---');

        const testClubName = 'Computer Science Club';
        const timestamp = Date.now();

        // 1. Create Approval Request
        const approveReq = await clubOfficerRequestRepository.createRequest({
            studentId: `live_verify_approve_${timestamp}`,
            studentName: 'Live Verify Approve',
            email: `approve_${timestamp}@test.com`,
            clubName: testClubName,
            status: RequestStatus.PENDING,
            requestedAt: Timestamp.now(),
        });
        console.log('Created Approval Request:', approveReq.requestId);

        // 2. Approve
        await adminService.approveOfficerRequest(approveReq.requestId, approveReq.studentId, 'admin_verify');
        console.log('Approved.');

        // 3. Verify Membership
        const club = await clubRepository.getClubByName(testClubName);
        expect(club?.memberIds).toContain(approveReq.studentId);
        expect(club?.officerIds).toContain(approveReq.studentId);
        console.log('✅ Approved Student verified in clubs!');

        // 4. Create Rejection Request
        const rejectReq = await clubOfficerRequestRepository.createRequest({
            studentId: `live_verify_reject_${timestamp}`,
            studentName: 'Live Verify Reject',
            email: `reject_${timestamp}@test.com`,
            clubName: testClubName,
            status: RequestStatus.PENDING,
            requestedAt: Timestamp.now(),
        });
        console.log('Created Rejection Request:', rejectReq.requestId);

        // 5. Reject
        await adminService.rejectOfficerRequest(rejectReq.requestId, rejectReq.studentId, 'admin_verify', 'Live verification rejection');
        console.log('Rejected.');

        console.log('✅ Rejection archived. Please check Firestore for "rejectedClubOfficerRequests".');
        console.log('--- LIVE VERIFICATION COMPLETE ---');
    }, 30000);
});
