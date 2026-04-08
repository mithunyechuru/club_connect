import fc from 'fast-check';
import { AuthenticationService } from './authenticationService';

// Mock Firebase modules to avoid import.meta.env issues
jest.mock('./firebase', () => ({
  auth: {},
  db: {},
  realtimeDb: {},
  storage: {},
}));

jest.mock('firebase/auth');
jest.mock('firebase/firestore');
jest.mock('firebase/database');

describe('AuthenticationService Property Tests', () => {
  // Feature: university-club-event-management, Property 3: Password Storage Security
  describe('Property 3: Password Storage Security', () => {
    /**
     * **Validates: Requirements 1.3**
     * 
     * For any stored user password, the stored value should be a cryptographic hash
     * (not plaintext) and should verify correctly against the original password.
     */
    it(
      'should hash passwords and verify them correctly',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 8, maxLength: 100 }),
            async (password) => {
              // Hash the password
              const hash = await AuthenticationService.hashPassword(password);

              // Verify hash is not the same as plaintext
              expect(hash).not.toBe(password);

              // Verify hash is a valid BCrypt hash (starts with $2a$ or $2b$)
              expect(hash).toMatch(/^\$2[ab]\$/);

              // Verify hash length is appropriate for BCrypt (60 characters)
              expect(hash.length).toBe(60);

              // Verify password can be verified against hash
              const isValid = await AuthenticationService.verifyPassword(
                password,
                hash
              );
              expect(isValid).toBe(true);

              // Verify wrong password fails verification
              const wrongPassword = password + 'wrong';
              const isInvalid = await AuthenticationService.verifyPassword(
                wrongPassword,
                hash
              );
              expect(isInvalid).toBe(false);
            }
          ),
          { numRuns: 20 }
        );
      },
      30000
    );

    it(
      'should produce different hashes for the same password (salt)',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 8, maxLength: 100 }),
            async (password) => {
              // Hash the same password twice
              const hash1 = await AuthenticationService.hashPassword(password);
              const hash2 = await AuthenticationService.hashPassword(password);

              // Hashes should be different due to salt
              expect(hash1).not.toBe(hash2);

              // Both hashes should verify the password
              const isValid1 = await AuthenticationService.verifyPassword(
                password,
                hash1
              );
              const isValid2 = await AuthenticationService.verifyPassword(
                password,
                hash2
              );
              expect(isValid1).toBe(true);
              expect(isValid2).toBe(true);
            }
          ),
          { numRuns: 10 }
        );
      },
      30000
    );
  });
});
