import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export class EventMediaService {
    private readonly STORAGE_PATH = 'event-media';

    /**
     * Upload an image for an event (poster or gallery image)
     * @param eventId - The ID of the event (or a temp ID if not yet created)
     * @param file - The file to upload
     * @param type - 'poster' or 'gallery'
     * @returns Promise<string> The download URL
     */
    async uploadMedia(eventId: string, file: File, type: 'poster' | 'gallery'): Promise<string> {
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${this.STORAGE_PATH}/${eventId}/${type}/${timestamp}_${sanitizedFileName}`;
        const storageRef = ref(storage, filePath);

        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    }

    /**
     * Upload multiple gallery images
     */
    async uploadGallery(eventId: string, files: File[]): Promise<string[]> {
        const uploadPromises = files.map(file => this.uploadMedia(eventId, file, 'gallery'));
        return await Promise.all(uploadPromises);
    }
}

export const eventMediaService = new EventMediaService();
