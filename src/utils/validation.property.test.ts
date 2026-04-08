import { describe, it } from '@jest/globals';
import fc from 'fast-check';
import { isPositiveNumber, isValidDateRange } from './validation';

// Feature: university-club-event-management, Testing Infrastructure
describe('Validation Utils - Property-Based Tests', () => {
  describe('isPositiveNumber', () => {
    it('should return true for all positive numbers', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000000 }), (num) => {
          return isPositiveNumber(num) === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should return false for all non-positive numbers', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000000, max: 0 }), (num) => {
          return isPositiveNumber(num) === false;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('isValidDateRange', () => {
    it('should return true when end date is after start date', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date(2000, 0, 1), max: new Date(2050, 0, 1) }),
          fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }), // 1ms to 1 year
          (startDate, offsetMs) => {
            const endDate = new Date(startDate.getTime() + offsetMs);
            return isValidDateRange(startDate, endDate) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when dates are equal or end is before start', () => {
      fc.assert(
        fc.property(
          fc.date(),
          fc.integer({ min: -365 * 24 * 60 * 60 * 1000, max: 0 }), // -1 year to 0
          (startDate, offsetMs) => {
            const endDate = new Date(startDate.getTime() + offsetMs);
            return isValidDateRange(startDate, endDate) === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
