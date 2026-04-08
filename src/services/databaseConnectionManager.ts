import { Firestore } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Database connection pool entry
 */
interface PooledConnection {
  connection: Firestore;
  lastUsed: Date;
  inUse: boolean;
}

/**
 * Database error log entry
 */
interface DatabaseErrorLog {
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  context: Record<string, unknown>;
}

/**
 * Database Connection Manager
 * Implements connection pooling, retry logic, idle connection cleanup, and error logging
 * Validates: Requirements 28.1, 28.2, 28.3, 28.4, 28.5
 */
export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private connectionPool: PooledConnection[] = [];
  private readonly maxPoolSize: number = 10;
  private readonly maxRetries: number = 3;
  private readonly idleTimeoutMs: number = 5 * 60 * 1000; // 5 minutes
  private readonly retryDelayMs: number = 1000; // 1 second base delay
  private errorLogs: DatabaseErrorLog[] = [];
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize the connection pool with the primary connection
    this.connectionPool.push({
      connection: db,
      lastUsed: new Date(),
      inUse: false,
    });

    // Start idle connection cleanup
    this.startIdleConnectionCleanup();
  }

  /**
   * Get singleton instance of DatabaseConnectionManager
   */
  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  /**
   * Get a connection from the pool
   * Implements connection pooling logic (Requirement 28.2)
   * @returns Promise<Firestore> A database connection
   */
  public async getConnection(): Promise<Firestore> {
    // Find an available connection
    const availableConnection = this.connectionPool.find(
      (pooled) => !pooled.inUse
    );

    if (availableConnection) {
      availableConnection.inUse = true;
      availableConnection.lastUsed = new Date();
      return availableConnection.connection;
    }

    // If pool is not at max size, create a new connection
    if (this.connectionPool.length < this.maxPoolSize) {
      const newConnection: PooledConnection = {
        connection: db,
        lastUsed: new Date(),
        inUse: true,
      };
      this.connectionPool.push(newConnection);
      return newConnection.connection;
    }

    // Wait for a connection to become available
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.connectionPool.find((pooled) => !pooled.inUse);
        if (available) {
          clearInterval(checkInterval);
          available.inUse = true;
          available.lastUsed = new Date();
          resolve(available.connection);
        }
      }, 100);
    });
  }

  /**
   * Release a connection back to the pool
   * @param connection The connection to release
   */
  public releaseConnection(connection: Firestore): void {
    const pooledConnection = this.connectionPool.find(
      (pooled) => pooled.connection === connection
    );

    if (pooledConnection) {
      pooledConnection.inUse = false;
      pooledConnection.lastUsed = new Date();
    }
  }

  /**
   * Execute a database operation with retry logic
   * Implements retry mechanism with exponential backoff (Requirement 28.3)
   * @param operation The database operation to execute
   * @returns Promise<T> The result of the operation
   */
  public async executeWithRetry<T>(
    operation: (connection: Firestore) => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const connection = await this.getConnection();
        try {
          const result = await operation(connection);
          this.releaseConnection(connection);
          return result;
        } catch (error) {
          this.releaseConnection(connection);
          throw error;
        }
      } catch (error) {
        lastError = error as Error;
        
        // Log the error
        this.logError('ConnectionRetry', lastError.message, {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
        });

        // If this is not the last attempt, wait before retrying
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelayMs * Math.pow(2, attempt); // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const finalError = new Error(
      `Database operation failed after ${this.maxRetries} retries: ${lastError?.message}`
    );
    this.logError('ConnectionFailure', finalError.message, {
      originalError: lastError?.message,
      retries: this.maxRetries,
    });
    throw finalError;
  }

  /**
   * Start idle connection cleanup
   * Implements idle connection cleanup (Requirement 28.4)
   */
  private startIdleConnectionCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      const now = new Date();
      const connectionsToRemove: number[] = [];

      this.connectionPool.forEach((pooled, index) => {
        // Skip the first connection (primary connection)
        if (index === 0) return;

        const idleTime = now.getTime() - pooled.lastUsed.getTime();
        if (!pooled.inUse && idleTime > this.idleTimeoutMs) {
          connectionsToRemove.push(index);
        }
      });

      // Remove idle connections (in reverse order to maintain indices)
      connectionsToRemove.reverse().forEach((index) => {
        this.connectionPool.splice(index, 1);
      });

      if (connectionsToRemove.length > 0) {
        console.log(`Cleaned up ${connectionsToRemove.length} idle connections`);
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop idle connection cleanup
   */
  public stopIdleConnectionCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Log a database error
   * Implements error logging (Requirement 28.5)
   * @param errorType The type of error
   * @param errorMessage The error message
   * @param context Additional context information
   */
  public logError(
    errorType: string,
    errorMessage: string,
    context: Record<string, unknown> = {}
  ): void {
    const errorLog: DatabaseErrorLog = {
      timestamp: new Date(),
      errorType,
      errorMessage,
      context,
    };

    this.errorLogs.push(errorLog);

    // Log to console
    console.error(
      `[Database Error] ${errorType} at ${errorLog.timestamp.toISOString()}: ${errorMessage}`,
      context
    );

    // Keep only the last 1000 error logs
    if (this.errorLogs.length > 1000) {
      this.errorLogs = this.errorLogs.slice(-1000);
    }
  }

  /**
   * Get error logs
   * @param limit Maximum number of logs to return
   * @returns DatabaseErrorLog[] Array of error logs
   */
  public getErrorLogs(limit: number = 100): DatabaseErrorLog[] {
    return this.errorLogs.slice(-limit);
  }

  /**
   * Get connection pool status
   * @returns Object with pool statistics
   */
  public getPoolStatus(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxPoolSize: number;
  } {
    const activeConnections = this.connectionPool.filter(
      (pooled) => pooled.inUse
    ).length;

    return {
      totalConnections: this.connectionPool.length,
      activeConnections,
      idleConnections: this.connectionPool.length - activeConnections,
      maxPoolSize: this.maxPoolSize,
    };
  }

  /**
   * Sleep utility for retry delays
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear all error logs
   */
  public clearErrorLogs(): void {
    this.errorLogs = [];
  }
}

// Export singleton instance
export const dbConnectionManager = DatabaseConnectionManager.getInstance();
