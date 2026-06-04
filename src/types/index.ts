// ═══════════════════════════════════════════════════════════
// AttendAI — TypeScript Interfaces
// ═══════════════════════════════════════════════════════════

// ── User ──────────────────────────────────────────────────
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoUrl?: string;
  phone?: string;
  department: string;
  enrollmentId?: string;
  employeeId?: string;
  faceEnrolled: boolean;
  faceDescriptors?: number[][];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  department: string;
  enrollmentId?: string;
  employeeId?: string;
  phone?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ── Subject ───────────────────────────────────────────────
export interface SubjectSchedule {
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  teacherId: string;
  teacherName: string;
  totalClasses: number;
  schedule: SubjectSchedule[];
  isActive: boolean;
  createdAt: string;
  enrolledCount?: number;
}

// ── Attendance Session ────────────────────────────────────
export type SessionStatus = 'active' | 'closed';

export interface AttendanceSession {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: SessionStatus;
  sessionToken: string;
  tokenExpiresAt: string;
  locationLat?: number;
  locationLng?: number;
  locationRadius?: number;
  totalEnrolled: number;
  totalPresent: number;
  createdAt: string;
}

// ── Attendance Record ─────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'proxy_detected' | 'late';
export type VerificationMethod = 'face_recognition' | 'manual_override';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  subjectId: string;
  studentId: string;
  studentName: string;
  enrollmentId: string;
  date: string;
  markedAt: string;
  status: AttendanceStatus;
  verificationMethod: VerificationMethod;
  faceMatchScore: number;
  faceMatchThreshold: number;
  ipAddress?: string;
  deviceInfo?: string;
  locationLat?: number;
  locationLng?: number;
  overrideBy?: string;
  overrideReason?: string;
  flagged: boolean;
  flagReason?: string;
}

// ── Notification ──────────────────────────────────────────
export type NotificationType = 'absent_alert' | 'low_attendance' | 'proxy_detected' | 'system';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ── System Settings ───────────────────────────────────────
export interface SystemSettings {
  id: string;
  faceMatchThreshold: number;
  attendanceWindowMinutes: number;
  lateThresholdMinutes: number;
  minimumAttendancePercent: number;
  geofencingEnabled: boolean;
  campusLat: number;
  campusLng: number;
  campusRadius: number;
  maxFaceEnrollmentPhotos: number;
  sessionTokenRefreshSeconds: number;
  emailNotificationsEnabled: boolean;
}

// ── Audit Log ─────────────────────────────────────────────
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// ── API Response Wrappers ─────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Dashboard Stats ───────────────────────────────────────
export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalSubjects: number;
  activeSessions: number;
  todayAttendancePercent: number;
  proxyAttemptsToday: number;
  departmentWise: { department: string; percentage: number }[];
  attendanceTrend: { date: string; percentage: number }[];
}

export interface StudentDashboardData {
  todaySchedule: (Subject & { sessionActive: boolean; sessionId?: string })[];
  subjectAttendance: {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    totalClasses: number;
    attended: number;
    percentage: number;
  }[];
  recentActivity: AttendanceRecord[];
  unreadNotifications: number;
}

export interface TeacherDashboardData {
  todayClasses: (Subject & { sessionActive: boolean; sessionId?: string })[];
  activeSession?: AttendanceSession;
  recentSessions: AttendanceSession[];
  subjectOverview: {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    avgAttendance: number;
    totalClasses: number;
  }[];
}

// ── Face Recognition ──────────────────────────────────────
export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  descriptor?: Float32Array;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FaceVerificationResult {
  matched: boolean;
  score: number;
  threshold: number;
  studentId?: string;
  studentName?: string;
}

// ── Subject Enrollment ────────────────────────────────────
export interface SubjectEnrollment {
  id: string;
  subjectId: string;
  studentId: string;
}
