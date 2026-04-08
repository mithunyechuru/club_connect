import { Timestamp } from 'firebase/firestore';
import { qrCodeGenerator, QRCodeGenerator } from './qrCodeGenerator';
import { Event, EventType, EventStatus } from '../types';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

// Mock Timestamp to add missing methods
jest.mock('firebase/firestore', () => {
  const actual = jest.requireActual('firebase/firestore');
  return {
    ...actual,
    Timestamp: {
      ...actual.Timestamp,
      fromDate: (date: Date) => ({
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: (date.getTime() % 1000) * 1000000,
        toDate: () => date,
        toMillis: () => date.getTime(),
      }),
      fromMillis: (millis: number) => ({
        seconds: Math.floor(millis / 1000),
        nanoseconds: (millis % 1000) * 1000000,
        toDate: () => new Date(millis),
        toMillis: () => millis,
      }),
      now: () => {
        const date = new Date();
        return {
          seconds: Math.floor(date.getTime() / 1000),
          nanoseconds: (date.getTime() % 1000) * 1000000,
          toDate: () => date,
          toMillis: () => date.getTime(),
        };
      },
    },
  };
});

describe('QRCodeGenerator', () => {
  let generator: QRCodeGenerator;
  let mockEvent: Event;

  beforeEach(() => {
    generator = new QRCodeGenerator();

    // Create a mock event
    const now = Timestamp.now();
    const futureTime = Timestamp.fromMillis(now.toMillis() + 3600000); // 1 hour from now

    mockEvent = {
      eventId: 'event-123',
      clubId: 'club-456',
      name: 'Test Event',
      description: 'A test event',
      type: EventType.WORKSHOP,
      startTime: now,
      endTime: futureTime,
      venueId: 'venue-789',
      capacity: 50,
      registeredCount: 0,
      tags: ['test'],
      fee: 0,
      status: EventStatus.ACTIVE,
      location: 'Test Location',
      qrCodeData: '',
      createdAt: now,
    };
  });

  describe('generateQRCode', () => {
    it('should generate a QR code with unique data', () => {
      const qrCode = generator.generateQRCode(mockEvent);

      expect(qrCode).toBeDefined();
      expect(qrCode.qrCodeId).toBeDefined();
      expect(qrCode.eventId).toBe(mockEvent.eventId);
      expect(qrCode.qrCodeData).toBeDefined();
      expect(qrCode.qrCodeData.length).toBeGreaterThan(0);
      expect(qrCode.isActive).toBe(true);
    });

    it('should set expiration time to event end time', () => {
      const qrCode = generator.generateQRCode(mockEvent);

      expect(qrCode.expiresAt).toEqual(mockEvent.endTime);
    });

    it('should generate unique QR codes for the same event', () => {
      // Reset the mock to return different values
      const { v4 } = require('uuid');
      (v4 as jest.Mock)
        .mockReturnValueOnce('mock-uuid-first')
        .mockReturnValueOnce('mock-uuid-second');

      const qrCode1 = generator.generateQRCode(mockEvent);
      const qrCode2 = generator.generateQRCode(mockEvent);

      expect(qrCode1.qrCodeData).not.toBe(qrCode2.qrCodeData);
      expect(qrCode1.qrCodeId).not.toBe(qrCode2.qrCodeId);
    });

    it('should include event ID in QR code data', () => {
      const qrCode = generator.generateQRCode(mockEvent);

      expect(qrCode.qrCodeData).toContain(mockEvent.eventId);
    });

    it('should set generatedAt timestamp', () => {
      const beforeGeneration = Timestamp.now();
      const qrCode = generator.generateQRCode(mockEvent);
      const afterGeneration = Timestamp.now();

      const generatedAtMillis = qrCode.generatedAt.toMillis();
      expect(generatedAtMillis).toBeGreaterThanOrEqual(beforeGeneration.toMillis());
      expect(generatedAtMillis).toBeLessThanOrEqual(afterGeneration.toMillis());
    });
  });

  describe('isQRCodeValid', () => {
    it('should return true for active and non-expired QR code', () => {
      const qrCode = generator.generateQRCode(mockEvent);

      expect(generator.isQRCodeValid(qrCode)).toBe(true);
    });

    it('should return false for inactive QR code', () => {
      const qrCode = generator.generateQRCode(mockEvent);
      qrCode.isActive = false;

      expect(generator.isQRCodeValid(qrCode)).toBe(false);
    });

    it('should return false for expired QR code', () => {
      const pastTime = Timestamp.fromMillis(Date.now() - 3600000); // 1 hour ago
      const expiredEvent = {
        ...mockEvent,
        endTime: pastTime,
      };
      const qrCode = generator.generateQRCode(expiredEvent);

      expect(generator.isQRCodeValid(qrCode)).toBe(false);
    });

    it('should return false for inactive and expired QR code', () => {
      const pastTime = Timestamp.fromMillis(Date.now() - 3600000);
      const expiredEvent = {
        ...mockEvent,
        endTime: pastTime,
      };
      const qrCode = generator.generateQRCode(expiredEvent);
      qrCode.isActive = false;

      expect(generator.isQRCodeValid(qrCode)).toBe(false);
    });
  });

  describe('deactivateQRCode', () => {
    it('should set isActive to false', () => {
      const qrCode = generator.generateQRCode(mockEvent);
      expect(qrCode.isActive).toBe(true);

      const deactivated = generator.deactivateQRCode(qrCode);

      expect(deactivated.isActive).toBe(false);
    });

    it('should preserve other QR code properties', () => {
      const qrCode = generator.generateQRCode(mockEvent);
      const deactivated = generator.deactivateQRCode(qrCode);

      expect(deactivated.qrCodeId).toBe(qrCode.qrCodeId);
      expect(deactivated.eventId).toBe(qrCode.eventId);
      expect(deactivated.qrCodeData).toBe(qrCode.qrCodeData);
      expect(deactivated.generatedAt).toEqual(qrCode.generatedAt);
      expect(deactivated.expiresAt).toEqual(qrCode.expiresAt);
    });
  });

  describe('parseEventIdFromQRCode', () => {
    it('should extract event ID from valid QR code data', () => {
      const qrCode = generator.generateQRCode(mockEvent);
      const eventId = generator.parseEventIdFromQRCode(qrCode.qrCodeData);

      expect(eventId).toBe(mockEvent.eventId);
    });

    it('should return null for invalid QR code format', () => {
      const invalidData = 'INVALID_FORMAT';
      const eventId = generator.parseEventIdFromQRCode(invalidData);

      expect(eventId).toBeNull();
    });

    it('should return null for QR code with wrong prefix', () => {
      const invalidData = 'WRONG_PREFIX|event-123|123456|random';
      const eventId = generator.parseEventIdFromQRCode(invalidData);

      expect(eventId).toBeNull();
    });

    it('should return null for QR code with insufficient parts', () => {
      const invalidData = 'EVENT_CHECK_IN|event-123';
      const eventId = generator.parseEventIdFromQRCode(invalidData);

      expect(eventId).toBeNull();
    });
  });

  describe('updateEventWithQRCode', () => {
    it('should update event with QR code data', () => {
      const qrCode = generator.generateQRCode(mockEvent);
      const updatedEvent = generator.updateEventWithQRCode(mockEvent, qrCode);

      expect(updatedEvent.qrCodeData).toBe(qrCode.qrCodeData);
    });

    it('should preserve other event properties', () => {
      const qrCode = generator.generateQRCode(mockEvent);
      const updatedEvent = generator.updateEventWithQRCode(mockEvent, qrCode);

      expect(updatedEvent.eventId).toBe(mockEvent.eventId);
      expect(updatedEvent.clubId).toBe(mockEvent.clubId);
      expect(updatedEvent.name).toBe(mockEvent.name);
      expect(updatedEvent.description).toBe(mockEvent.description);
      expect(updatedEvent.type).toBe(mockEvent.type);
      expect(updatedEvent.capacity).toBe(mockEvent.capacity);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(qrCodeGenerator).toBeInstanceOf(QRCodeGenerator);
    });
  });

  describe('QR code data format', () => {
    it('should follow the expected format', () => {
      const qrCode = generator.generateQRCode(mockEvent);
      const parts = qrCode.qrCodeData.split('|');

      expect(parts.length).toBe(4);
      expect(parts[0]).toBe('EVENT_CHECK_IN');
      expect(parts[1]).toBe(mockEvent.eventId);
      expect(parts[2]).toMatch(/^\d+$/); // timestamp should be numeric
      expect(parts[3]).toBeDefined(); // random component
    });
  });
});
