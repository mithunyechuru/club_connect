import { Timestamp } from 'firebase/firestore';
import { PaymentRepository } from './paymentRepository';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('../services/firebase', () => ({
  db: {},
}));

describe('PaymentRepository', () => {
  let paymentRepository: PaymentRepository;

  beforeEach(() => {
    paymentRepository = new PaymentRepository();
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should create a new transaction', async () => {
      const transactionData: Omit<Transaction, 'transactionId'> = {
        userId: 'user123',
        eventId: 'event456',
        amount: 50.0,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.PENDING,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
      };

      const mockDocRef = { id: 'txn123' };
      (collection as jest.Mock).mockReturnValue({});
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await paymentRepository.createTransaction(transactionData);

      expect(result.transactionId).toBe('txn123');
      expect(result.userId).toBe('user123');
      expect(result.amount).toBe(50.0);
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction', async () => {
      const transactionId = 'txn123';
      const updates = {
        status: TransactionStatus.COMPLETED,
        completedAt: Timestamp.now(),
      };

      const updatedData = {
        transactionId,
        userId: 'user123',
        eventId: 'event456',
        amount: 50.0,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.COMPLETED,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
        completedAt: updates.completedAt,
      };

      (doc as jest.Mock).mockReturnValue({});
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: transactionId,
        data: () => updatedData,
      });

      const result = await paymentRepository.updateTransaction(transactionId, updates);

      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw error if transaction not found after update', async () => {
      const transactionId = 'nonexistent';
      const updates = { status: TransactionStatus.COMPLETED };

      (doc as jest.Mock).mockReturnValue({});
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      await expect(
        paymentRepository.updateTransaction(transactionId, updates)
      ).rejects.toThrow(`Transaction with ID ${transactionId} not found after update`);
    });
  });

  describe('getTransactionById', () => {
    it('should retrieve a transaction by ID', async () => {
      const transactionId = 'txn123';
      const transactionData = {
        userId: 'user123',
        eventId: 'event456',
        amount: 50.0,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.COMPLETED,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
      };

      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: transactionId,
        data: () => transactionData,
      });

      const result = await paymentRepository.getTransactionById(transactionId);

      expect(result).not.toBeNull();
      expect(result?.transactionId).toBe(transactionId);
      expect(result?.userId).toBe('user123');
    });

    it('should return null if transaction not found', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await paymentRepository.getTransactionById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTransactionsByUser', () => {
    it('should retrieve all transactions for a user', async () => {
      const userId = 'user123';
      const transactions = [
        {
          userId,
          eventId: 'event1',
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
        {
          userId,
          eventId: 'event2',
          amount: 75.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: transactions.map((data, index) => ({
          id: `txn${index}`,
          data: () => data,
        })),
      });

      const result = await paymentRepository.getTransactionsByUser(userId);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(userId);
      expect(result[1].userId).toBe(userId);
    });

    it('should filter transactions by status', async () => {
      const userId = 'user123';
      const transactions = [
        {
          userId,
          eventId: 'event1',
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: transactions.map((data, index) => ({
          id: `txn${index}`,
          data: () => data,
        })),
      });

      const result = await paymentRepository.getTransactionsByUser(
        userId,
        TransactionStatus.COMPLETED
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(TransactionStatus.COMPLETED);
    });
  });

  describe('getTransactionsByEvent', () => {
    it('should retrieve all transactions for an event', async () => {
      const eventId = 'event456';
      const transactions = [
        {
          userId: 'user1',
          eventId,
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
        {
          userId: 'user2',
          eventId,
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'paypal',
          createdAt: Timestamp.now(),
        },
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: transactions.map((data, index) => ({
          id: `txn${index}`,
          data: () => data,
        })),
      });

      const result = await paymentRepository.getTransactionsByEvent(eventId);

      expect(result).toHaveLength(2);
      expect(result[0].eventId).toBe(eventId);
      expect(result[1].eventId).toBe(eventId);
    });
  });

  describe('getTransactionsByClub', () => {
    it('should retrieve all transactions for a club', async () => {
      const clubId = 'club789';
      const transactions = [
        {
          userId: 'user1',
          clubId,
          amount: 100.0,
          currency: 'USD',
          type: TransactionType.MEMBERSHIP_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: transactions.map((data, index) => ({
          id: `txn${index}`,
          data: () => data,
        })),
      });

      const result = await paymentRepository.getTransactionsByClub(clubId);

      expect(result).toHaveLength(1);
      expect(result[0].clubId).toBe(clubId);
      expect(result[0].type).toBe(TransactionType.MEMBERSHIP_FEE);
    });
  });

  describe('getTransactionsByType', () => {
    it('should retrieve all transactions by type', async () => {
      const transactions = [
        {
          userId: 'user1',
          eventId: 'event1',
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
        {
          userId: 'user2',
          eventId: 'event2',
          amount: 75.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: transactions.map((data, index) => ({
          id: `txn${index}`,
          data: () => data,
        })),
      });

      const result = await paymentRepository.getTransactionsByType(
        TransactionType.EVENT_FEE
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(TransactionType.EVENT_FEE);
      expect(result[1].type).toBe(TransactionType.EVENT_FEE);
    });
  });

  describe('getCompletedEventTransactions', () => {
    it('should retrieve only completed transactions for an event', async () => {
      const eventId = 'event456';
      const transactions = [
        {
          userId: 'user1',
          eventId,
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: transactions.map((data, index) => ({
          id: `txn${index}`,
          data: () => data,
        })),
      });

      const result = await paymentRepository.getCompletedEventTransactions(eventId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(TransactionStatus.COMPLETED);
    });
  });

  describe('getFailedUserTransactions', () => {
    it('should retrieve only failed transactions for a user', async () => {
      const userId = 'user123';
      const transactions = [
        {
          userId,
          eventId: 'event1',
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.FAILED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: transactions.map((data, index) => ({
          id: `txn${index}`,
          data: () => data,
        })),
      });

      const result = await paymentRepository.getFailedUserTransactions(userId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(TransactionStatus.FAILED);
    });
  });
});
