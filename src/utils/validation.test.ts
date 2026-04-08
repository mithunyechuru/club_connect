import { describe, it, expect } from '@jest/globals';
import { isValidEmail, isValidPassword, isPositiveNumber, isValidDateRange } from './validation';

describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@university.edu')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should return true for passwords with 8+ characters', () => {
      expect(isValidPassword('password123')).toBe(true);
      expect(isValidPassword('12345678')).toBe(true);
    });

    it('should return false for passwords with less than 8 characters', () => {
      expect(isValidPassword('pass')).toBe(false);
      expect(isValidPassword('1234567')).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(100)).toBe(true);
    });

    it('should return false for zero and negative numbers', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
    });
  });

  describe('isValidDateRange', () => {
    it('should return true when end date is after start date', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');
      expect(isValidDateRange(start, end)).toBe(true);
    });

    it('should return false when end date is before or equal to start date', () => {
      const start = new Date('2024-01-02');
      const end = new Date('2024-01-01');
      expect(isValidDateRange(start, end)).toBe(false);
      expect(isValidDateRange(start, start)).toBe(false);
    });
  });
});
