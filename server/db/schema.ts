// ═══════════════════════════════════════════════════════════
// AttendAI — Drizzle ORM Schema (Neon PostgreSQL)
// ═══════════════════════════════════════════════════════════

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  real,
  timestamp,
  date,
  jsonb,
  doublePrecision,
  unique,
} from 'drizzle-orm/pg-core';

// ── Users ─────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().$type<'student' | 'teacher' | 'admin'>(),
  photoUrl: text('photo_url'),
  phone: varchar('phone', { length: 20 }),
  department: varchar('department', { length: 100 }).notNull(),
  enrollmentId: varchar('enrollment_id', { length: 50 }).unique(),
  employeeId: varchar('employee_id', { length: 50 }).unique(),
  faceEnrolled: boolean('face_enrolled').default(false).notNull(),
  faceDescriptors: jsonb('face_descriptors').$type<number[][]>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Subjects ──────────────────────────────────────────────
export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  department: varchar('department', { length: 100 }).notNull(),
  semester: integer('semester').notNull(),
  teacherId: uuid('teacher_id').references(() => users.id),
  teacherName: varchar('teacher_name', { length: 255 }),
  totalClasses: integer('total_classes').default(0).notNull(),
  schedule: jsonb('schedule').$type<{ day: string; startTime: string; endTime: string; room: string }[]>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Subject Enrollments (many-to-many) ────────────────────
export const subjectEnrollments = pgTable('subject_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  unique('subject_student_unique').on(table.subjectId, table.studentId),
]);

// ── Attendance Sessions ───────────────────────────────────
export const attendanceSessions = pgTable('attendance_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  subjectName: varchar('subject_name', { length: 255 }).notNull(),
  subjectCode: varchar('subject_code', { length: 50 }).notNull(),
  teacherId: uuid('teacher_id').references(() => users.id).notNull(),
  teacherName: varchar('teacher_name', { length: 255 }).notNull(),
  date: date('date').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('active').notNull().$type<'active' | 'closed'>(),
  sessionToken: uuid('session_token').defaultRandom().notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  locationLat: doublePrecision('location_lat'),
  locationLng: doublePrecision('location_lng'),
  locationRadius: integer('location_radius'),
  totalEnrolled: integer('total_enrolled').default(0).notNull(),
  totalPresent: integer('total_present').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Attendance Records ────────────────────────────────────
export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => attendanceSessions.id).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  studentId: uuid('student_id').references(() => users.id).notNull(),
  studentName: varchar('student_name', { length: 255 }).notNull(),
  enrollmentId: varchar('enrollment_id', { length: 50 }).notNull(),
  date: date('date').notNull(),
  markedAt: timestamp('marked_at', { withTimezone: true }).defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('absent').notNull()
    .$type<'present' | 'absent' | 'proxy_detected' | 'late'>(),
  verificationMethod: varchar('verification_method', { length: 30 }).default('face_recognition').notNull()
    .$type<'face_recognition' | 'manual_override'>(),
  faceMatchScore: real('face_match_score'),
  faceMatchThreshold: real('face_match_threshold'),
  ipAddress: varchar('ip_address', { length: 50 }),
  deviceInfo: text('device_info'),
  locationLat: doublePrecision('location_lat'),
  locationLng: doublePrecision('location_lng'),
  overrideBy: uuid('override_by').references(() => users.id),
  overrideReason: text('override_reason'),
  flagged: boolean('flagged').default(false).notNull(),
  flagReason: text('flag_reason'),
}, (table) => [
  unique('session_student_unique').on(table.sessionId, table.studentId),
]);

// ── Notifications ─────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipientId: uuid('recipient_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 30 }).notNull()
    .$type<'absent_alert' | 'low_attendance' | 'proxy_detected' | 'system'>(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
});

// ── System Settings ───────────────────────────────────────
export const systemSettings = pgTable('system_settings', {
  id: varchar('id', { length: 50 }).primaryKey().default('global'),
  faceMatchThreshold: real('face_match_threshold').default(0.5).notNull(),
  attendanceWindowMinutes: integer('attendance_window_minutes').default(30).notNull(),
  lateThresholdMinutes: integer('late_threshold_minutes').default(10).notNull(),
  minimumAttendancePercent: integer('minimum_attendance_percent').default(75).notNull(),
  geofencingEnabled: boolean('geofencing_enabled').default(true).notNull(),
  campusLat: doublePrecision('campus_lat').default(12.9416151).notNull(),
  campusLng: doublePrecision('campus_lng').default(77.5668099).notNull(),
  campusRadius: integer('campus_radius').default(200).notNull(),
  maxFaceEnrollmentPhotos: integer('max_face_enrollment_photos').default(5).notNull(),
  sessionTokenRefreshSeconds: integer('session_token_refresh_seconds').default(60).notNull(),
  emailNotificationsEnabled: boolean('email_notifications_enabled').default(false).notNull(),
});

// ── Audit Logs ────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  details: jsonb('details').$type<Record<string, unknown>>(),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
