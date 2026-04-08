/**
 * Formats Firebase Auth error codes into user-friendly messages
 * @param errorCode - The Firebase Auth error code (e.g., 'auth/email-already-in-use')
 * @returns A localized, readable error message
 */
export const formatAuthError = (errorCode: string): string => {
    switch (errorCode) {
        // Registration Errors
        case 'auth/email-already-in-use':
            return 'This email address is already registered. Please try logging in instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled. Please contact support.';
        case 'auth/weak-password':
            return 'Your password is too weak. Please use at least 6 characters.';

        // Login Errors
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please check your spelling or register.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again or reset your password.';
        case 'auth/invalid-credential':
            return 'Invalid email or password. Please check your credentials and try again.';

        // General Errors
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection and try again.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Your account has been temporarily locked. Please try again later.';

        default:
            console.warn('Unhandled Firebase Auth error:', errorCode);
            return 'An unexpected error occurred. Please try again.';
    }
};
