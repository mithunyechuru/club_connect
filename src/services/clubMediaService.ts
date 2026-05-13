import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export class ClubMediaService {
    private readonly STORAGE_PATH = 'club-media';

    /**
     * Upload a logo for a club
     * @param clubId - The ID of the club (or a temp ID if not yet created)
     * @param file - The file to upload
     * @returns Promise<string> The download URL
     */
    async uploadLogo(clubId: string, file: File): Promise<string> {
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${this.STORAGE_PATH}/${clubId}/logo/${timestamp}_${sanitizedFileName}`;
        const storageRef = ref(storage, filePath);

        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    }
}

export const clubMediaService = new ClubMediaService();
