/**
 * Service for sensitive data protection and security
 */
export class SecurityService {
    /**
     * Mask sensitive student ID for UI display (e.g., "S12345" -> "S***45")
     * @param studentId - The ID of the student
     * @returns string - The masked ID
     */
    maskStudentId(studentId: string): string {
        if (studentId.length < 4) return '****';
        return studentId[0] + '*'.repeat(studentId.length - 3) + studentId.slice(-2);
    }

    /**
     * Mask email for UI display (e.g., "user@example.com" -> "u***@example.com")
     * @param email - The email to mask
     * @returns string - The masked email
     */
    maskEmail(email: string): string {
        const [name, domain] = email.split('@');
        if (name.length <= 2) return `${name[0]}***@${domain}`;
        return `${name[0]}***${name.slice(-1)}@${domain}`;
    }

    /**
     * Simulate end-to-end encryption for a data string
     * In a real app, this would use a cryptographic library like Forge or Crypto-JS
     * @param data - The raw data string
     * @returns string - The "encrypted" data
     */
    encryptData(data: string): string {
        // Simulated encryption: Base64 + simple shifts
        // Production should use AES-256
        return btoa(data.split('').reverse().join(''));
    }

    /**
     * Simulate decryption for a data string
     * @param encryptedData - The "encrypted" data string
     * @returns string - The original data
     */
    decryptData(encryptedData: string): string {
        try {
            const decoded = atob(encryptedData);
            return decoded.split('').reverse().join('');
        } catch (error) {
            console.error('Decryption failed:', error);
            return 'DECRYPTION_ERROR';
        }
    }
}

export const securityService = new SecurityService();
