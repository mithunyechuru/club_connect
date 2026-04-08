import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { clubDocumentService } from './clubDocumentService';
import { clubRepository } from '../repositories/clubRepository';
import { Timestamp } from 'firebase/firestore';
import { Club, ClubRole } from '../types';

// Mock Firebase modules
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
  getMetadata: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  }
}));

jest.mock('./firebase', () => ({
  storage: {},
  db: {}
}));

// Import mocked modules
import * as firebaseStorage from 'firebase/storage';
import * as firebaseFirestore from 'firebase/firestore';

describe('ClubDocumentService', () => {
  const mockClub: Club = {
    clubId: 'club1',
    name: 'Test Club',
    description: 'Test Description',
    parentClubId: null,
    officerIds: ['user1'],
    memberIds: ['user1', 'user2'],
    memberRoles: {
      user1: ClubRole.PRESIDENT,
      user2: ClubRole.MEMBER
    },
    documentIds: [],
    managerId: null,
    category: 'Test Category',
    createdAt: Timestamp.now()
  };

  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('uploadDocument', () => {
    it('should upload a document and associate it with a club', async () => {
      // Mock clubRepository
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(mockClub);
      jest.spyOn(clubRepository, 'updateClub').mockResolvedValue();

      // Mock Firebase Storage
      const mockRef = { fullPath: 'club-documents/club1/test.pdf' };
      (firebaseStorage.ref as jest.Mock).mockReturnValue(mockRef);
      (firebaseStorage.uploadBytes as any).mockResolvedValue({});
      (firebaseStorage.getDownloadURL as any).mockResolvedValue('https://storage.example.com/test.pdf');

      // Mock Firestore
      const mockDocRef = { id: 'doc1' };
      (firebaseFirestore.addDoc as any).mockResolvedValue(mockDocRef);
      (firebaseFirestore.collection as any).mockReturnValue({});

      const result = await clubDocumentService.uploadDocument(
        'club1',
        mockFile,
        'Test Document',
        'user1'
      );

      expect(result.documentId).toBe('doc1');
      expect(result.clubId).toBe('club1');
      expect(result.title).toBe('Test Document');
      expect(result.uploadedBy).toBe('user1');
      expect(result.fileUrl).toBe('https://storage.example.com/test.pdf');
      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        documentIds: ['doc1']
      });
    });

    it('should throw error if club not found', async () => {
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(null);

      await expect(
        clubDocumentService.uploadDocument('club1', mockFile, 'Test Document', 'user1')
      ).rejects.toThrow('Club not found');
    });

    it('should throw error if title is empty', async () => {
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(mockClub);

      await expect(
        clubDocumentService.uploadDocument('club1', mockFile, '', 'user1')
      ).rejects.toThrow('Document title cannot be empty');
    });

    it('should throw error if title is too long', async () => {
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(mockClub);
      const longTitle = 'a'.repeat(201);

      await expect(
        clubDocumentService.uploadDocument('club1', mockFile, longTitle, 'user1')
      ).rejects.toThrow('Document title is too long');
    });

    it('should throw error if file size exceeds limit', async () => {
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(mockClub);
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf'
      });

      await expect(
        clubDocumentService.uploadDocument('club1', largeFile, 'Test Document', 'user1')
      ).rejects.toThrow('File size exceeds maximum allowed size');
    });

    it('should throw error if file type is not allowed', async () => {
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(mockClub);
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });

      await expect(
        clubDocumentService.uploadDocument('club1', invalidFile, 'Test Document', 'user1')
      ).rejects.toThrow('File type application/x-msdownload is not allowed');
    });

    it('should clean up storage if Firestore operation fails', async () => {
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(mockClub);

      const mockRef = { fullPath: 'club-documents/club1/test.pdf' };
      (firebaseStorage.ref as any).mockReturnValue(mockRef);
      (firebaseStorage.uploadBytes as any).mockResolvedValue({});
      (firebaseStorage.getDownloadURL as any).mockResolvedValue('https://storage.example.com/test.pdf');
      (firebaseStorage.deleteObject as any).mockResolvedValue(undefined);

      (firebaseFirestore.collection as any).mockReturnValue({});
      (firebaseFirestore.addDoc as any).mockRejectedValue(new Error('Firestore error'));

      await expect(
        clubDocumentService.uploadDocument('club1', mockFile, 'Test Document', 'user1')
      ).rejects.toThrow('Failed to upload document');

      expect(firebaseStorage.deleteObject).toHaveBeenCalled();
    });

    it('should sanitize file names with special characters', async () => {
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(mockClub);
      jest.spyOn(clubRepository, 'updateClub').mockResolvedValue();

      const mockRef = { fullPath: 'club-documents/club1/test.pdf' };
      (firebaseStorage.ref as any).mockReturnValue(mockRef);
      (firebaseStorage.uploadBytes as any).mockResolvedValue({});
      (firebaseStorage.getDownloadURL as any).mockResolvedValue('https://storage.example.com/test.pdf');

      const mockDocRef = { id: 'doc1' };
      (firebaseFirestore.addDoc as any).mockResolvedValue(mockDocRef);
      (firebaseFirestore.collection as any).mockReturnValue({});

      const specialFile = new File(['test'], 'test file (1).pdf', { type: 'application/pdf' });
      await clubDocumentService.uploadDocument('club1', specialFile, 'Test Document', 'user1');

      // Verify ref was called with sanitized filename
      expect(firebaseStorage.ref).toHaveBeenCalled();
    });
  });

  describe('getDocumentById', () => {
    it('should return document if found', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'doc1',
        data: () => ({
          clubId: 'club1',
          title: 'Test Document',
          fileUrl: 'https://storage.example.com/test.pdf',
          uploadedBy: 'user1',
          uploadedAt: Timestamp.now()
        })
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);

      const result = await clubDocumentService.getDocumentById('doc1');

      expect(result).not.toBeNull();
      expect(result?.documentId).toBe('doc1');
      expect(result?.title).toBe('Test Document');
    });

    it('should return null if document not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);

      const result = await clubDocumentService.getDocumentById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockRejectedValue(new Error('Firestore error'));

      const result = await clubDocumentService.getDocumentById('doc1');

      expect(result).toBeNull();
    });
  });

  describe('getDocumentsByClub', () => {
    it('should return all documents for a club', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            clubId: 'club1',
            title: 'Document 1',
            fileUrl: 'https://storage.example.com/doc1.pdf',
            uploadedBy: 'user1',
            uploadedAt: Timestamp.now()
          })
        },
        {
          id: 'doc2',
          data: () => ({
            clubId: 'club1',
            title: 'Document 2',
            fileUrl: 'https://storage.example.com/doc2.pdf',
            uploadedBy: 'user1',
            uploadedAt: Timestamp.now()
          })
        }
      ];

      const mockQuerySnapshot = {
        docs: mockDocs
      };

      (firebaseFirestore.collection as any).mockReturnValue({});
      (firebaseFirestore.query as any).mockReturnValue({});
      (firebaseFirestore.where as any).mockReturnValue({});
      (firebaseFirestore.getDocs as any).mockResolvedValue(mockQuerySnapshot);

      const result = await clubDocumentService.getDocumentsByClub('club1');

      expect(result).toHaveLength(2);
      expect(result[0].documentId).toBe('doc1');
      expect(result[1].documentId).toBe('doc2');
    });

    it('should return empty array if no documents found', async () => {
      const mockQuerySnapshot = {
        docs: []
      };

      (firebaseFirestore.collection as any).mockReturnValue({});
      (firebaseFirestore.query as any).mockReturnValue({});
      (firebaseFirestore.where as any).mockReturnValue({});
      (firebaseFirestore.getDocs as any).mockResolvedValue(mockQuerySnapshot);

      const result = await clubDocumentService.getDocumentsByClub('club1');

      expect(result).toHaveLength(0);
    });

    it('should return empty array on error', async () => {
      (firebaseFirestore.collection as jest.Mock).mockReturnValue({});
      (firebaseFirestore.query as jest.Mock).mockReturnValue({});
      (firebaseFirestore.where as jest.Mock).mockReturnValue({});
      (firebaseFirestore.getDocs as any).mockRejectedValue(new Error('Firestore error'));

      const result = await clubDocumentService.getDocumentsByClub('club1');

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document from storage and database', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'doc1',
        data: () => ({
          clubId: 'club1',
          title: 'Test Document',
          fileUrl: 'https://storage.example.com/test.pdf',
          uploadedBy: 'user1',
          uploadedAt: Timestamp.now()
        })
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);
      (firebaseFirestore.deleteDoc as any).mockResolvedValue(undefined);

      const mockRef = { fullPath: 'club-documents/club1/test.pdf' };
      (firebaseStorage.ref as any).mockReturnValue(mockRef);
      (firebaseStorage.deleteObject as any).mockResolvedValue(undefined);

      const clubWithDoc = { ...mockClub, documentIds: ['doc1'] };
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(clubWithDoc);
      jest.spyOn(clubRepository, 'updateClub').mockResolvedValue();

      await clubDocumentService.deleteDocument('doc1', 'club1');

      expect(firebaseStorage.deleteObject).toHaveBeenCalled();
      expect(firebaseFirestore.deleteDoc).toHaveBeenCalled();
      expect(clubRepository.updateClub).toHaveBeenCalledWith('club1', {
        documentIds: []
      });
    });

    it('should throw error if document not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);

      await expect(
        clubDocumentService.deleteDocument('nonexistent', 'club1')
      ).rejects.toThrow('Document not found');
    });

    it('should throw error if document does not belong to club', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'doc1',
        data: () => ({
          clubId: 'club2',
          title: 'Test Document',
          fileUrl: 'https://storage.example.com/test.pdf',
          uploadedBy: 'user1',
          uploadedAt: Timestamp.now()
        })
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);

      await expect(
        clubDocumentService.deleteDocument('doc1', 'club1')
      ).rejects.toThrow('Document does not belong to the specified club');
    });

    it('should throw error if club not found', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'doc1',
        data: () => ({
          clubId: 'club1',
          title: 'Test Document',
          fileUrl: 'https://storage.example.com/test.pdf',
          uploadedBy: 'user1',
          uploadedAt: Timestamp.now()
        })
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);
      jest.spyOn(clubRepository, 'getClubById').mockResolvedValue(null);

      await expect(
        clubDocumentService.deleteDocument('doc1', 'club1')
      ).rejects.toThrow('Club not found');
    });
  });

  describe('getSignedUrl', () => {
    it('should return the document URL', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'doc1',
        data: () => ({
          clubId: 'club1',
          title: 'Test Document',
          fileUrl: 'https://storage.example.com/test.pdf',
          uploadedBy: 'user1',
          uploadedAt: Timestamp.now()
        })
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);

      const result = await clubDocumentService.getSignedUrl('doc1');

      expect(result).toBe('https://storage.example.com/test.pdf');
    });

    it('should throw error if document not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);

      await expect(
        clubDocumentService.getSignedUrl('nonexistent')
      ).rejects.toThrow('Document not found');
    });
  });

  describe('getDocumentMetadata', () => {
    it('should return document metadata from storage', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'doc1',
        data: () => ({
          clubId: 'club1',
          title: 'Test Document',
          fileUrl: 'https://storage.example.com/test.pdf',
          uploadedBy: 'user1',
          uploadedAt: Timestamp.now()
        })
      };

      const mockMetadata = {
        size: 1024,
        contentType: 'application/pdf',
        customMetadata: {
          clubId: 'club1',
          uploadedBy: 'user1'
        }
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);
      (firebaseStorage.ref as any).mockReturnValue({});
      (firebaseStorage.getMetadata as any).mockResolvedValue(mockMetadata);

      const result = await clubDocumentService.getDocumentMetadata('doc1');

      expect(result.size).toBe(1024);
      expect(result.contentType).toBe('application/pdf');
    });

    it('should throw error if document not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (firebaseFirestore.doc as any).mockReturnValue({});
      (firebaseFirestore.getDoc as any).mockResolvedValue(mockDocSnap);

      await expect(
        clubDocumentService.getDocumentMetadata('nonexistent')
      ).rejects.toThrow('Document not found');
    });
  });
});
