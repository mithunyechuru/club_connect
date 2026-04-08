import { Timestamp } from 'firebase/firestore';
import { PaymentService, PaymentError } from './paymentService';
import { paymentRepository } from '../repositories/paymentRepository';
import { Transaction, TransactionType, TransactionStatus } from '../types';

// Mock the payment repository
jest.mock('../repositories/paymentRepository');

describe('PaymentService', () => {
  let paymentService: PaymentService;
  const mockPaymentRepository = paymentRepository as jest.Mocked<typeof paymentRepository>;

  beforeEach(() => {
    paymentService = new PaymentService();
    jest.clearAllMocks();
  });

  describe('processEventPayment', () => {
    const userId = 'user123';
    const eventId = 'event456';
    const amount = 50.0;
    const currency = 'USD';
    const paymentMethod = 'card';

    it('should process successful event payment', async () => {
      const pendingTransaction: Transaction = {
        transactionId: 'txn123',
        userId,
        eventId,
        amount,
        currency,
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.PENDING,
        paymentMethod,
        createdAt: Timestamp.now(),
      };

      const completedTransaction: Transaction = {
        ...pendingTransaction,
        status: TransactionStatus.COMPLETED,
        completedAt: Timestamp.now(),
        externalTransactionId: 'sim_123456',
      };

      mockPaymentRepository.createTransaction.mockResolvedValue(pendingTransaction);
      mockPaymentRepository.updateTransaction.mockResolvedValue(completedTransaction);

      // Mock Math.random to ensure success (> 0.05)
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = await paymentService.processEventPayment(
        userId,
        eventId,
        amount,
        currency,
        paymentMethod
      );

      expect(result.success).toBe(true);
      // ... (other expects)
      randomSpy.mockRestore();
      expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);
      expect(result.receipt).toBeDefined();
      expect(result.receipt?.transactionId).toBe('txn123');
      expect(result.receipt?.amount).toBe(amount);
      expect(mockPaymentRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          eventId,
          amount,
          currency,
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.PENDING,
          paymentMethod,
        })
      );
    });

    it('should handle payment failure', async () => {
      const pendingTransaction: Transaction = {
        transactionId: 'txn123',
        userId,
        eventId,
        amount,
        currency,
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.PENDING,
        paymentMethod,
        createdAt: Timestamp.now(),
      };

      mockPaymentRepository.createTransaction.mockResolvedValue(pendingTransaction);
      // Mock updateTransaction to return the updates applied to the transaction
      mockPaymentRepository.updateTransaction.mockImplementation(async (_id, updates) => ({
        ...pendingTransaction,
        ...updates,
      }) as Transaction);

      // Mock Math.random to force failure (<= 0.05)
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.01);

      const result = await paymentService.processEventPayment(
        userId,
        eventId,
        amount,
        currency,
        paymentMethod
      );

      expect(result.success).toBe(false);
      expect(result.transaction.status).toBe(TransactionStatus.FAILED);
      expect(result.error).toBe('Payment processing failed');
      expect(result.receipt).toBeUndefined();

      randomSpy.mockRestore();
    });

    it('should throw error for missing user ID', async () => {
      await expect(
        paymentService.processEventPayment('', eventId, amount, currency, paymentMethod)
      ).rejects.toThrow(PaymentError);
      await expect(
        paymentService.processEventPayment('', eventId, amount, currency, paymentMethod)
      ).rejects.toThrow('User ID and Event ID are required');
    });

    it('should throw error for missing event ID', async () => {
      await expect(
        paymentService.processEventPayment(userId, '', amount, currency, paymentMethod)
      ).rejects.toThrow(PaymentError);
    });

    it('should throw error for zero amount', async () => {
      await expect(
        paymentService.processEventPayment(userId, eventId, 0, currency, paymentMethod)
      ).rejects.toThrow(PaymentError);
      await expect(
        paymentService.processEventPayment(userId, eventId, 0, currency, paymentMethod)
      ).rejects.toThrow('Payment amount must be greater than zero');
    });

    it('should throw error for negative amount', async () => {
      await expect(
        paymentService.processEventPayment(userId, eventId, -10, currency, paymentMethod)
      ).rejects.toThrow(PaymentError);
    });

    it('should use default currency and payment method', async () => {
      const pendingTransaction: Transaction = {
        transactionId: 'txn123',
        userId,
        eventId,
        amount,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.PENDING,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
      };

      mockPaymentRepository.createTransaction.mockResolvedValue(pendingTransaction);
      mockPaymentRepository.updateTransaction.mockResolvedValue({
        ...pendingTransaction,
        status: TransactionStatus.COMPLETED,
        completedAt: Timestamp.now(),
      });

      await paymentService.processEventPayment(userId, eventId, amount);

      expect(mockPaymentRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'USD',
          paymentMethod: 'card',
        })
      );
    });

    it('should handle repository errors', async () => {
      mockPaymentRepository.createTransaction.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        paymentService.processEventPayment(userId, eventId, amount)
      ).rejects.toThrow('Database error');
    });
  });

  describe('processMembershipPayment', () => {
    const userId = 'user123';
    const clubId = 'club456';
    const amount = 100.0;
    const currency = 'USD';
    const paymentMethod = 'paypal';

    it('should process successful membership payment', async () => {
      const pendingTransaction: Transaction = {
        transactionId: 'txn789',
        userId,
        clubId,
        amount,
        currency,
        type: TransactionType.MEMBERSHIP_FEE,
        status: TransactionStatus.PENDING,
        paymentMethod,
        createdAt: Timestamp.now(),
      };

      const completedTransaction: Transaction = {
        ...pendingTransaction,
        status: TransactionStatus.COMPLETED,
        completedAt: Timestamp.now(),
        externalTransactionId: 'sim_789012',
      };

      mockPaymentRepository.createTransaction.mockResolvedValue(pendingTransaction);
      mockPaymentRepository.updateTransaction.mockResolvedValue(completedTransaction);

      const result = await paymentService.processMembershipPayment(
        userId,
        clubId,
        amount,
        currency,
        paymentMethod
      );

      expect(result.success).toBe(true);
      expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);
      expect(result.transaction.type).toBe(TransactionType.MEMBERSHIP_FEE);
      expect(result.receipt).toBeDefined();
      expect(mockPaymentRepository.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          clubId,
          amount,
          currency,
          type: TransactionType.MEMBERSHIP_FEE,
          status: TransactionStatus.PENDING,
          paymentMethod,
        })
      );
    });

    it('should throw error for missing user ID', async () => {
      await expect(
        paymentService.processMembershipPayment('', clubId, amount, currency, paymentMethod)
      ).rejects.toThrow(PaymentError);
    });

    it('should throw error for missing club ID', async () => {
      await expect(
        paymentService.processMembershipPayment(userId, '', amount, currency, paymentMethod)
      ).rejects.toThrow(PaymentError);
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        paymentService.processMembershipPayment(userId, clubId, 0, currency, paymentMethod)
      ).rejects.toThrow(PaymentError);
    });
  });

  describe('generateReceipt', () => {
    it('should generate receipt for completed transaction', async () => {
      const completedTransaction: Transaction = {
        transactionId: 'txn123',
        userId: 'user123',
        eventId: 'event456',
        amount: 50.0,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.COMPLETED,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
        completedAt: Timestamp.now(),
      };

      const receipt = await paymentService.generateReceipt(completedTransaction);

      expect(receipt.transactionId).toBe('txn123');
      expect(receipt.userId).toBe('user123');
      expect(receipt.amount).toBe(50.0);
      expect(receipt.currency).toBe('USD');
      expect(receipt.eventId).toBe('event456');
      expect(receipt.paymentMethod).toBe('card');
      expect(receipt.timestamp).toBeDefined();
    });

    it('should throw error for incomplete transaction', async () => {
      const pendingTransaction: Transaction = {
        transactionId: 'txn123',
        userId: 'user123',
        eventId: 'event456',
        amount: 50.0,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.PENDING,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
      };

      await expect(paymentService.generateReceipt(pendingTransaction)).rejects.toThrow(
        PaymentError
      );
      await expect(paymentService.generateReceipt(pendingTransaction)).rejects.toThrow(
        'Cannot generate receipt for incomplete transaction'
      );
    });

    it('should use createdAt if completedAt is missing', async () => {
      const createdAt = Timestamp.now();
      const completedTransaction: Transaction = {
        transactionId: 'txn123',
        userId: 'user123',
        eventId: 'event456',
        amount: 50.0,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.COMPLETED,
        paymentMethod: 'card',
        createdAt,
      };

      const receipt = await paymentService.generateReceipt(completedTransaction);

      expect(receipt.timestamp).toBe(createdAt);
    });
  });

  describe('sendReceipt', () => {
    it('should log receipt sending', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const receipt = {
        transactionId: 'txn123',
        userId: 'user123',
        amount: 50.0,
        currency: 'USD',
        paymentMethod: 'card',
        timestamp: Timestamp.now(),
      };

      await paymentService.sendReceipt(receipt, 'user@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Receipt sent to user@example.com for transaction txn123'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getTransaction', () => {
    it('should retrieve transaction by ID', async () => {
      const transaction: Transaction = {
        transactionId: 'txn123',
        userId: 'user123',
        eventId: 'event456',
        amount: 50.0,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.COMPLETED,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
      };

      mockPaymentRepository.getTransactionById.mockResolvedValue(transaction);

      const result = await paymentService.getTransaction('txn123');

      expect(result).toEqual(transaction);
      expect(mockPaymentRepository.getTransactionById).toHaveBeenCalledWith('txn123');
    });

    it('should return null for non-existent transaction', async () => {
      mockPaymentRepository.getTransactionById.mockResolvedValue(null);

      const result = await paymentService.getTransaction('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserTransactions', () => {
    it('should retrieve all transactions for a user', async () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn1',
          userId: 'user123',
          eventId: 'event1',
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
        {
          transactionId: 'txn2',
          userId: 'user123',
          clubId: 'club1',
          amount: 100.0,
          currency: 'USD',
          type: TransactionType.MEMBERSHIP_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'paypal',
          createdAt: Timestamp.now(),
        },
      ];

      mockPaymentRepository.getTransactionsByUser.mockResolvedValue(transactions);

      const result = await paymentService.getUserTransactions('user123');

      expect(result).toEqual(transactions);
      expect(result).toHaveLength(2);
      expect(mockPaymentRepository.getTransactionsByUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('getEventTransactions', () => {
    it('should retrieve all transactions for an event', async () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn1',
          userId: 'user1',
          eventId: 'event456',
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
        {
          transactionId: 'txn2',
          userId: 'user2',
          eventId: 'event456',
          amount: 50.0,
          currency: 'USD',
          type: TransactionType.EVENT_FEE,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'card',
          createdAt: Timestamp.now(),
        },
      ];

      mockPaymentRepository.getTransactionsByEvent.mockResolvedValue(transactions);

      const result = await paymentService.getEventTransactions('event456');

      expect(result).toEqual(transactions);
      expect(result).toHaveLength(2);
      expect(mockPaymentRepository.getTransactionsByEvent).toHaveBeenCalledWith('event456');
    });
  });

  describe('payment processing simulation', () => {
    it('should simulate successful payments most of the time', async () => {
      const userId = 'user123';
      const eventId = 'event456';
      const amount = 50.0;

      const pendingTransaction: Transaction = {
        transactionId: 'txn123',
        userId,
        eventId,
        amount,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.PENDING,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
      };

      mockPaymentRepository.createTransaction.mockResolvedValue(pendingTransaction);
      mockPaymentRepository.updateTransaction.mockImplementation(async (_id, updates) => ({
        ...pendingTransaction,
        ...updates,
      }));

      // Mock Math.random to return 0.5 (should succeed)
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = await paymentService.processEventPayment(userId, eventId, amount);

      expect(result.success).toBe(true);

      randomSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle very large payment amounts', async () => {
      const userId = 'user123';
      const eventId = 'event456';
      const amount = 999999.99;

      const pendingTransaction: Transaction = {
        transactionId: 'txn123',
        userId,
        eventId,
        amount,
        currency: 'USD',
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.PENDING,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
      };

      mockPaymentRepository.createTransaction.mockResolvedValue(pendingTransaction);
      mockPaymentRepository.updateTransaction.mockResolvedValue({
        ...pendingTransaction,
        status: TransactionStatus.COMPLETED,
        completedAt: Timestamp.now(),
      });

      const result = await paymentService.processEventPayment(userId, eventId, amount);

      expect(result.success).toBe(true);
      expect(result.transaction.amount).toBe(amount);
    });

    it('should handle different currencies', async () => {
      const userId = 'user123';
      const eventId = 'event456';
      const amount = 50.0;
      const currency = 'EUR';

      const pendingTransaction: Transaction = {
        transactionId: 'txn123',
        userId,
        eventId,
        amount,
        currency,
        type: TransactionType.EVENT_FEE,
        status: TransactionStatus.PENDING,
        paymentMethod: 'card',
        createdAt: Timestamp.now(),
      };

      mockPaymentRepository.createTransaction.mockResolvedValue(pendingTransaction);
      mockPaymentRepository.updateTransaction.mockResolvedValue({
        ...pendingTransaction,
        status: TransactionStatus.COMPLETED,
        completedAt: Timestamp.now(),
      });

      const result = await paymentService.processEventPayment(
        userId,
        eventId,
        amount,
        currency
      );

      expect(result.success).toBe(true);
      expect(result.transaction.currency).toBe('EUR');
    });
  });
});
