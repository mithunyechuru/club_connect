import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { ClubOfficerRequest, RequestStatus } from '../types';

/**
 * Repository for managing ClubOfficerRequest entities in Firestore.
 * Collection: clubOfficerRequests
 */
export class ClubOfficerRequestRepository {
    private readonly collectionName = 'clubOfficerRequests';
    private readonly rejectedCollectionName = 'rejectedClubOfficerRequests';

    async getRequestById(requestId: string): Promise<ClubOfficerRequest | null> {
        try {
            const snap = await getDoc(doc(db, this.collectionName, requestId));
            if (!snap.exists()) return null;
            return { requestId: snap.id, ...snap.data() } as ClubOfficerRequest;
        } catch (error) {
            console.error('Error getting officer request by ID:', error);
            throw new Error(`Failed to get officer request ${requestId}`);
        }
    }

    async getPendingRequests(): Promise<ClubOfficerRequest[]> {
        try {
            // Fetch all + filter in-memory to avoid needing a Firestore composite index
            const snap = await getDocs(collection(db, this.collectionName));
            return snap.docs
                .map(d => ({ requestId: d.id, ...d.data() } as ClubOfficerRequest))
                .filter(r => r.status === RequestStatus.PENDING)
                .sort((a, b) => {
                    const aT = (a.requestedAt as any)?.toMillis?.() ?? 0;
                    const bT = (b.requestedAt as any)?.toMillis?.() ?? 0;
                    return bT - aT;
                });
        } catch (error) {
            console.error('Error getting pending officer requests:', error);
            throw new Error('Failed to get pending officer requests');
        }
    }

    async getAllRequests(): Promise<ClubOfficerRequest[]> {
        try {
            const snap = await getDocs(collection(db, this.collectionName));
            return snap.docs
                .map(d => ({ requestId: d.id, ...d.data() } as ClubOfficerRequest))
                .sort((a, b) => {
                    const aT = (a.requestedAt as any)?.toMillis?.() ?? 0;
                    const bT = (b.requestedAt as any)?.toMillis?.() ?? 0;
                    return bT - aT;
                });
        } catch (error) {
            console.error('Error getting all officer requests:', error);
            throw new Error('Failed to get all officer requests');
        }
    }

    async createRequest(
        data: Omit<ClubOfficerRequest, 'requestId'>
    ): Promise<ClubOfficerRequest> {
        try {
            const docRef = await addDoc(collection(db, this.collectionName), {
                ...data,
                requestedAt: data.requestedAt || Timestamp.now(),
            });
            return { requestId: docRef.id, ...data };
        } catch (error) {
            console.error('Error creating officer request:', error);
            throw new Error('Failed to create officer request');
        }
    }

    async updateRequestStatus(
        requestId: string,
        status: RequestStatus,
        adminId: string,
        notes?: string
    ): Promise<void> {
        try {
            const updates: Partial<ClubOfficerRequest> = {
                status,
                processedAt: Timestamp.now(),
                processedBy: adminId,
            };
            if (notes !== undefined) updates.notes = notes;
            await updateDoc(doc(db, this.collectionName, requestId), updates as Record<string, unknown>);
        } catch (error) {
            console.error('Error updating officer request status:', error);
            throw new Error(`Failed to update officer request ${requestId}`);
        }
    }

    /**
     * Archive a rejected request in a separate collection
     */
    async archiveRejectedRequest(request: ClubOfficerRequest): Promise<void> {
        try {
            await addDoc(collection(db, this.rejectedCollectionName), {
                ...request,
                archivedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error archiving rejected request:', error);
            throw new Error('Failed to archive rejected request');
        }
    }
}

export const clubOfficerRequestRepository = new ClubOfficerRequestRepository();
