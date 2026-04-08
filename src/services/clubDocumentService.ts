import { Timestamp } from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  getMetadata,
  UploadMetadata
} from 'firebase/storage';
import { storage, db } from './firebase';
import { ClubDocument } from '../types';
import { clubRepository } from '../repositories/clubRepository';
import { collection, addDoc, doc, getDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';

/**
 * Service for managing club documents
 * Handles document upload to Firebase Storage, association with clubs,
 * retrieval, deletion, and signed URL generation
 * 
 * Requirements: 2.5
 */
export class ClubDocumentService {
  private readonly DOCUMENTS_COLLECTION = 'clubDocuments';
  private readonly STORAGE_PATH = 'club-documents';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ];

  /**
   * Upload a document to Firebase Storage and associate it with a club
   * @param clubId - The ID of the club
   * @param file - The file to upload
   * @param title - The document title
   * @param uploadedBy - The ID of the user uploading the document
   * @returns Promise<ClubDocument> The created document record
   * @throws Error if validation fails or upload fails
   */
  async uploadDocument(
    clubId: string,
    file: File,
    title: string,
    uploadedBy: string
  ): Promise<ClubDocument> {
    // Validate inputs
    this.validateDocumentUpload(file, title);

    // Verify club exists
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(file.name);
    const filePath = `${this.STORAGE_PATH}/${clubId}/${timestamp}_${sanitizedFileName}`;
    const storageRef = ref(storage, filePath);

    // Upload file to Firebase Storage
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        clubId,
        uploadedBy,
        title,
        originalName: file.name
      }
    };

    try {
      await uploadBytes(storageRef, file, metadata);
      const fileUrl = await getDownloadURL(storageRef);

      // Create document record in Firestore
      const documentData: Omit<ClubDocument, 'documentId'> = {
        clubId,
        title: title.trim(),
        fileUrl,
        uploadedBy,
        uploadedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, this.DOCUMENTS_COLLECTION), documentData);
      const documentId = docRef.id;

      // Update club's documentIds array
      const updatedDocumentIds = [...club.documentIds, documentId];
      await clubRepository.updateClub(clubId, { documentIds: updatedDocumentIds });

      return {
        documentId,
        ...documentData
      };
    } catch (error) {
      // Clean up storage if Firestore operation fails
      try {
        await deleteObject(storageRef);
      } catch (cleanupError) {
        console.error('Failed to clean up storage after error:', cleanupError);
      }
      throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a document by ID
   * @param documentId - The ID of the document
   * @returns Promise<ClubDocument | null> The document if found
   */
  async getDocumentById(documentId: string): Promise<ClubDocument | null> {
    try {
      const docRef = doc(db, this.DOCUMENTS_COLLECTION, documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        documentId: docSnap.id,
        ...docSnap.data()
      } as ClubDocument;
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  }

  /**
   * Get all documents for a club
   * @param clubId - The ID of the club
   * @returns Promise<ClubDocument[]> Array of documents
   */
  async getDocumentsByClub(clubId: string): Promise<ClubDocument[]> {
    try {
      const q = query(
        collection(db, this.DOCUMENTS_COLLECTION),
        where('clubId', '==', clubId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        documentId: doc.id,
        ...doc.data()
      } as ClubDocument));
    } catch (error) {
      console.error('Error fetching club documents:', error);
      return [];
    }
  }

  /**
   * Delete a document from storage and database
   * @param documentId - The ID of the document to delete
   * @param clubId - The ID of the club (for verification)
   * @returns Promise<void>
   * @throws Error if document not found or deletion fails
   */
  async deleteDocument(documentId: string, clubId: string): Promise<void> {
    // Get document record
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Verify document belongs to the specified club
    if (document.clubId !== clubId) {
      throw new Error('Document does not belong to the specified club');
    }

    // Get club to update documentIds
    const club = await clubRepository.getClubById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    try {
      // Delete from Firebase Storage
      const fileRef = ref(storage, document.fileUrl);
      await deleteObject(fileRef);

      // Delete from Firestore
      await deleteDoc(doc(db, this.DOCUMENTS_COLLECTION, documentId));

      // Update club's documentIds array
      const updatedDocumentIds = club.documentIds.filter(id => id !== documentId);
      await clubRepository.updateClub(clubId, { documentIds: updatedDocumentIds });
    } catch (error) {
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a signed URL for document access
   * Note: Firebase Storage download URLs are already signed and long-lived
   * This method returns the existing download URL
   * @param documentId - The ID of the document
   * @returns Promise<string> The signed URL
   * @throws Error if document not found
   */
  async getSignedUrl(documentId: string): Promise<string> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Firebase Storage download URLs are already signed and long-lived
    // For additional security, you could implement custom token generation
    return document.fileUrl;
  }

  /**
   * Get document metadata from storage
   * @param documentId - The ID of the document
   * @returns Promise<any> The storage metadata
   * @throws Error if document not found
   */
  async getDocumentMetadata(documentId: string): Promise<any> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    try {
      const fileRef = ref(storage, document.fileUrl);
      const metadata = await getMetadata(fileRef);
      return metadata;
    } catch (error) {
      throw new Error(`Failed to get document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate document upload
   * @param file - The file to validate
   * @param title - The document title
   * @throws Error if validation fails
   */
  private validateDocumentUpload(file: File, title: string): void {
    // Validate title
    if (!title || title.trim().length === 0) {
      throw new Error('Document title cannot be empty');
    }
    if (title.trim().length > 200) {
      throw new Error('Document title is too long (maximum 200 characters)');
    }

    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validate file type
    if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Allowed types: PDF, Word, Excel, Images, Text`);
    }
  }

  /**
   * Sanitize file name to remove special characters
   * @param fileName - The original file name
   * @returns string The sanitized file name
   */
  private sanitizeFileName(fileName: string): string {
    // Remove special characters and spaces, keep only alphanumeric, dots, hyphens, and underscores
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}

export const clubDocumentService = new ClubDocumentService();
