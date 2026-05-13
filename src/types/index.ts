import { Timestamp } from 'firebase/firestore';
export { Timestamp };

export enum UserRole {
  STUDENT = 'STUDENT',
  CLUB_OFFICER = 'CLUB_OFFICER',
  ADMINISTRATOR = 'ADMINISTRATOR',
}

export enum ClubRole {
  PRESIDENT = 'PRESIDENT',
  VICE_PRESIDENT = 'VICE_PRESIDENT',
  SECRETARY = 'SECRETARY',
  MEMBER = 'MEMBER',
}

export enum EventType {
  WORKSHOP = 'WORKSHOP',
  HACKATHON = 'HACKATHON',
  SEMINAR = 'SEMINAR',
  SOCIAL_GATHERING = 'SOCIAL_GATHERING',
  MEETING = 'MEETING',
  COMPETITION = 'COMPETITION',
}

export enum EventStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum RSVPStatus {
  CONFIRMED = 'CONFIRMED',
  WAITLISTED = 'WAITLISTED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationType {
  EVENT_CREATED = 'EVENT_CREATED',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  EVENT_REMINDER_24H = 'EVENT_REMINDER_24H',
  EVENT_REMINDER_1H = 'EVENT_REMINDER_1H',
  MEMBERSHIP_APPROVED = 'MEMBERSHIP_APPROVED',
  MEMBERSHIP_REJECTED = 'MEMBERSHIP_REJECTED',
  WAITLIST_SPOT_AVAILABLE = 'WAITLIST_SPOT_AVAILABLE',
  BADGE_EARNED = 'BADGE_EARNED',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  interests?: string[];
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  eventReminders: boolean;
  clubAnnouncements: boolean;
}

export const POINT_VALUES = {
  ATTENDANCE: 10,
  PARTICIPATION: 20,
  WINNING: 50,
  FEEDBACK: 5,
  BADGE_EARNED: 10,
};

export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  profile: UserProfile;
  preferences: NotificationPreferences;
  displayName?: string;
  photoURL?: string;
  totalPoints: number;
  eventsAttendedCount: number;
  badgesEarnedCount: number;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export interface Club {
  clubId: string;
  name: string;
  description: string;
  parentClubId: string | null;
  officerIds: string[];
  memberIds: string[];
  managerId: string | null;
  memberRoles: Record<string, ClubRole>;
  documentIds: string[];
  tierConfig?: MembershipTier;
  category: string;
  imageUrl?: string;
  createdAt: Timestamp;
}

export interface MembershipTier {
  name: string;
  benefits: string[];
  fee?: number;
}

export interface Event {
  eventId: string;
  clubId: string;
  name: string;
  description: string;
  type: EventType;
  startTime: Timestamp;
  endTime: Timestamp;
  venueId: string;
  capacity: number;
  registeredCount: number;
  tags: string[];
  fee: number;
  status: EventStatus;
  location: string;
  qrCodeData: string;
  createdAt: Timestamp;
  // Extended fields
  imageUrl?: string;
  registrationDeadline?: Timestamp;
  clubName?: string;
  // Past event specific fields
  guestSpeaker?: string;
  actualParticipantCount?: number;
  images?: string[];
  externalLink?: string;
  organizedBy?: string;
}

export interface RSVP {
  rsvpId: string;
  eventId: string;
  studentId: string;
  status: RSVPStatus;
  waitlistPosition: number;
  registeredAt: Timestamp;
  paymentCompleted: boolean;
}

export interface Venue {
  venueId: string;
  name: string; // Auto-generated: "{Type} - Floor {Floor}"
  type: 'Multipurpose' | 'Seminar';
  floor: number; // 1-5
  building: string; // "Main Block"
  capacity: number;
  facilities: string[]; // ["Projector", "AC", etc.]
  imageUrl?: string;
  description: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: Timestamp;
  // Legacy fields for backward compatibility
  location?: string;
  equipment?: string[];
  features?: string[];
  isAvailable?: boolean;
}

export interface AttendanceRecord {
  attendanceId: string;
  eventId: string;
  studentId: string;
  timestamp: Timestamp;
  method: 'QR_CODE' | 'MANUAL';
  recordedBy?: string; // Optional metadata for who recorded it
}

export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: Timestamp;
  deliveredAt?: Timestamp;
  retryCount: number;
}

export interface Certificate {
  certificateId: string;
  studentId: string;
  eventId: string;
  studentName: string;
  eventName: string;
  eventDate: Timestamp;
  organizerSignature: string;
  templateId?: string;
  pdfUrl: string;
  generatedAt: Timestamp;
}

export interface Badge {
  badgeId: string;
  name: string;
  description: string;
  type: BadgeType;
  requiredCount: number;
  iconUrl: string;
}

export enum BadgeType {
  ATTENDANCE_MILESTONE = 'ATTENDANCE_MILESTONE',
  CLUB_PARTICIPATION = 'CLUB_PARTICIPATION',
  EVENT_ORGANIZATION = 'EVENT_ORGANIZATION',
  FEEDBACK_CONTRIBUTOR = 'FEEDBACK_CONTRIBUTOR',
}

export interface UserBadge {
  userBadgeId: string;
  userId: string;
  badgeId: string;
  earnedAt: Timestamp;
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface MembershipRequest {
  requestId: string;
  studentId: string;
  clubId: string;
  status: RequestStatus;
  message: string;
  requestedAt: Timestamp;
  processedAt?: Timestamp;
}

export interface ClubOfficerRequest {
  requestId: string;
  studentId: string;
  studentName: string;
  email: string;
  clubName: string;
  status: RequestStatus;
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  notes?: string;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export interface Booking {
  bookingId: string;
  venueId: string;
  eventId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: BookingStatus;
  createdAt: Timestamp;
}

export interface VenueConflict {
  conflictId: string;
  conflictingBookingIds: string[];
  detectedAt: Timestamp;
  resolution?: string;
}

export interface QRCode {
  qrCodeId: string;
  eventId: string;
  qrCodeData: string;
  generatedAt: Timestamp;
  expiresAt: Timestamp;
  isActive: boolean;
}

export interface ForumThread {
  threadId: string;
  clubId: string;
  authorId: string;
  title: string;
  content: string;
  isPinned: boolean;
  replyIds: string[];
  createdAt: Timestamp;
  lastActivityAt: Timestamp;
}

export interface ForumReply {
  replyId: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: Timestamp;
}

export interface DirectMessage {
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  sentAt: Timestamp;
}

export interface BlockedUser {
  blockId: string;
  blockerId: string;
  blockedUserId: string;
  blockedAt: Timestamp;
}

export enum TransactionType {
  EVENT_FEE = 'EVENT_FEE',
  MEMBERSHIP_FEE = 'MEMBERSHIP_FEE',
  REFUND = 'REFUND',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface Transaction {
  transactionId: string;
  userId: string;
  eventId?: string;
  clubId?: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  paymentMethod: string;
  externalTransactionId?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface FeedbackQuestion {
  questionId: string;
  questionText: string;
  questionType: 'text' | 'rating' | 'multiple_choice';
  options?: string[];
  required: boolean;
}

export interface FeedbackForm {
  formId: string;
  eventId: string;
  questions: FeedbackQuestion[];
  createdAt: Timestamp;
}

export interface FeedbackResponse {
  responseId: string;
  formId: string;
  studentId: string;
  answers: Record<string, string>;
  overallRating: number;
  submittedAt: Timestamp;
}

export interface CertificateTemplate {
  templateId: string;
  name: string;
  templateContent: string;
  placeholders: Record<string, string>;
}

export interface ClubDocument {
  documentId: string;
  clubId: string;
  title: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

export interface ClubAnnouncement {
  announcementId: string;
  clubId: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: Timestamp;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  participationScore: number;
  eventsAttended: number;
  badgesEarned: number;
  rank: number;
}

export interface EventAnalytics {
  eventId: string;
  rsvpCount: number;
  attendanceCount: number;
  attendanceRate: number;
  noShowRate: number;
  averageRating?: number;
  feedbackSummary: Record<string, number>;
}

export interface ClubAnalytics {
  clubId: string;
  totalEvents: number;
  totalAttendance: number;
  totalRSVPs: number;
  averageAttendanceRate: number;
  averageClubRating?: number;
  eventBreakdown: EventAnalytics[];
}

export interface SearchFilter {
  query: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  location?: string;
  tags?: string[];
}

export interface AuditLog {
  logId: string;
  userId: string;
  action: string;
  resourceType: 'CLUB' | 'EVENT' | 'USER' | 'SYSTEM';
  resourceId: string;
  details: string;
  timestamp: Timestamp;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

// ─── Engagement Types ───────────────────────────────────────────────────────

export enum EngagementType {
  SURVEY = 'SURVEY',
  POLL = 'POLL',
  CHALLENGE = 'CHALLENGE',
  DISCUSSION = 'DISCUSSION',
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Engagement {
  engagementId: string;
  clubId: string;
  clubName: string;
  type: EngagementType;
  title: string;
  description: string;
  options?: PollOption[]; // For POLL
  venueId?: string;
  date?: Timestamp;
  time?: string;
  deadline?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  status: 'ACTIVE' | 'EXPIRED' | 'CLOSED';
}

// ─── Settings Types ──────────────────────────────────────────────────────────

export type AppTheme = 'light' | 'dark';

export interface SystemSettings {
  settingsId: string;
  universityName: string;
  universityLogoUrl: string;
  defaultEventDurationHours: number;
  maxParticipantsPerEvent: number;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface UserAppSettings {
  theme: AppTheme;
  updatedAt: Timestamp;
}
