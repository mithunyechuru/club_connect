import { qrCodeScanner } from './qrCodeScanner';
import { eventRepository } from '../repositories/eventRepository';
import { attendanceRepository } from '../repositories/attendanceRepository';
import { rsvpRepository } from '../repositories/rsvpRepository';
import { Timestamp } from '../types';

// Mock Dependencies
jest.mock('firebase/firestore', () => ({
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn((d) => ({ toDate: () => d })),
    },
}));

jest.mock('../repositories/eventRepository');
jest.mock('../repositories/attendanceRepository');
jest.mock('../repositories/rsvpRepository');

describe('Engagagement Services (Messaging & Attendance)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('QRCodeScanner', () => {
        it('should process a valid scan', async () => {
            const eventId = 'e1';
            const studentId = 's1';
            const now = new Date();

            (eventRepository.getEventById as jest.Mock).mockResolvedValue({
                eventId,
                startTime: Timestamp.fromDate(now),
            });
            (attendanceRepository.isPresent as jest.Mock).mockResolvedValue(false);
            (rsvpRepository.getRSVPById as jest.Mock).mockResolvedValue({});

            await expect(qrCodeScanner.processScan(`${eventId}:token`, studentId))
                .resolves.not.toThrow();

            expect(attendanceRepository.logAttendance).toHaveBeenCalled();
        });

        it('should reject invalid QR format', async () => {
            await expect(qrCodeScanner.processScan('invalid', 'u1'))
                .rejects.toThrow('Invalid QR code format');
        });

        it('should reject if already present', async () => {
            const eventId = 'e1';
            (eventRepository.getEventById as jest.Mock).mockResolvedValue({
                eventId,
                startTime: Timestamp.fromDate(new Date()),
            });
            (attendanceRepository.isPresent as jest.Mock).mockResolvedValue(true);

            await expect(qrCodeScanner.processScan(`${eventId}:token`, 'u1'))
                .rejects.toThrow('already recorded');
        });
    });
});
