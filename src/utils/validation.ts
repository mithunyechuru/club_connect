/**
 * Validation utility functions
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmail(email: string): void {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }
}

export function isValidPassword(password: string): boolean {
  // Password must be at least 8 characters
  return password.length >= 8;
}

export function validatePassword(password: string): void {
  if (!isValidPassword(password)) {
    throw new Error('Password must be at least 8 characters long');
  }
}

export function validateName(name: string, fieldName: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  if (name.trim().length > 100) {
    throw new Error(`${fieldName} is too long (maximum 100 characters)`);
  }
}

export function isPositiveNumber(value: number): boolean {
  return value > 0;
}

export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return endDate > startDate;
}

