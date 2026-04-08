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
import { db } from '../services/firebase';
import { Transaction, TransactionStatus, TransactionType } from '../types';

/**
 * Repository for managing payment transactions in Firestore
 */
export class PaymentRepository {
  private collectionName = 'transactions';

  /**
   * Create a new transaction
   * @param transactionData - The transaction data (without transactionId)
   * @returns Promise<Transaction> The created transaction with ID
   */
  async createTransaction(
    transactionData: Omit<Transaction, 'transactionId'>
  ): Promise<Transaction> {
    const transactionsRef = collection(db, this.collectionName);
    const docRef = await addDoc(transactionsRef, transactionData);

    return {
      transactionId: docRef.id,
      ...transactionData,
    };
  }

  /**
   * Update a transaction
   * @param transactionId - The ID of the transaction
   * @param updates - The fields to update
   * @returns Promise<Transaction> The updated transaction
   */
  async updateTransaction(
    transactionId: string,
    updates: Partial<Omit<Transaction, 'transactionId'>>
  ): Promise<Transaction> {
    const transactionRef = doc(db, this.collectionName, transactionId);
    await updateDoc(transactionRef, updates);

    const updatedDoc = await getDoc(transactionRef);
    if (!updatedDoc.exists()) {
      throw new Error(`Transaction with ID ${transactionId} not found after update`);
    }

    return {
      transactionId: updatedDoc.id,
      ...updatedDoc.data(),
    } as Transaction;
  }

  /**
   * Get a transaction by ID
   * @param transactionId - The ID of the transaction
   * @returns Promise<Transaction | null> The transaction if found
   */
  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    const transactionRef = doc(db, this.collectionName, transactionId);
    const transactionDoc = await getDoc(transactionRef);

    if (!transactionDoc.exists()) {
      return null;
    }

    return {
      transactionId: transactionDoc.id,
      ...transactionDoc.data(),
    } as Transaction;
  }

  /**
   * Get all transactions for a user
   * @param userId - The ID of the user
   * @param status - Optional status filter
   * @returns Promise<Transaction[]> Array of transactions
   */
  async getTransactionsByUser(
    userId: string,
    status?: TransactionStatus
  ): Promise<Transaction[]> {
    const transactionsRef = collection(db, this.collectionName);
    let q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      q = query(
        transactionsRef,
        where('userId', '==', userId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      transactionId: doc.id,
      ...doc.data(),
    })) as Transaction[];
  }

  /**
   * Get all transactions for an event
   * @param eventId - The ID of the event
   * @param status - Optional status filter
   * @returns Promise<Transaction[]> Array of transactions
   */
  async getTransactionsByEvent(
    eventId: string,
    status?: TransactionStatus
  ): Promise<Transaction[]> {
    const transactionsRef = collection(db, this.collectionName);
    let q = query(
      transactionsRef,
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      q = query(
        transactionsRef,
        where('eventId', '==', eventId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      transactionId: doc.id,
      ...doc.data(),
    })) as Transaction[];
  }

  /**
   * Get all transactions for a club
   * @param clubId - The ID of the club
   * @param status - Optional status filter
   * @returns Promise<Transaction[]> Array of transactions
   */
  async getTransactionsByClub(
    clubId: string,
    status?: TransactionStatus
  ): Promise<Transaction[]> {
    const transactionsRef = collection(db, this.collectionName);
    let q = query(
      transactionsRef,
      where('clubId', '==', clubId),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      q = query(
        transactionsRef,
        where('clubId', '==', clubId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      transactionId: doc.id,
      ...doc.data(),
    })) as Transaction[];
  }

  /**
   * Get all transactions by type
   * @param type - The transaction type
   * @param status - Optional status filter
   * @returns Promise<Transaction[]> Array of transactions
   */
  async getTransactionsByType(
    type: TransactionType,
    status?: TransactionStatus
  ): Promise<Transaction[]> {
    const transactionsRef = collection(db, this.collectionName);
    let q = query(
      transactionsRef,
      where('type', '==', type),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      q = query(
        transactionsRef,
        where('type', '==', type),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      transactionId: doc.id,
      ...doc.data(),
    })) as Transaction[];
  }

  /**
   * Get completed transactions for an event
   * @param eventId - The ID of the event
   * @returns Promise<Transaction[]> Array of completed transactions
   */
  async getCompletedEventTransactions(eventId: string): Promise<Transaction[]> {
    return this.getTransactionsByEvent(eventId, TransactionStatus.COMPLETED);
  }

  /**
   * Get failed transactions for a user
   * @param userId - The ID of the user
   * @returns Promise<Transaction[]> Array of failed transactions
   */
  async getFailedUserTransactions(userId: string): Promise<Transaction[]> {
    return this.getTransactionsByUser(userId, TransactionStatus.FAILED);
  }
}

export const paymentRepository = new PaymentRepository();
