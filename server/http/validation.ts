// Zod schemas for request payloads.
import { z } from 'zod';
import { FACE_DESCRIPTOR_LENGTH } from '../lib/face';

export const uuidSchema = z.uuid('Invalid id');

export const roleSchema = z.enum(['student', 'teacher', 'admin']);

const faceDescriptor = z.array(z.number().finite()).length(FACE_DESCRIPTOR_LENGTH);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().trim().min(1).max(255),
  role: roleSchema,
  department: z.string().trim().min(1).max(100),
  enrollmentId: z.string().trim().max(50).optional().nullable(),
  employeeId: z.string().trim().max(50).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  photoUrl: z.url().nullable().optional(),
});

export const userUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  department: z.string().trim().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  role: roleSchema.optional(),
});

export const faceEnrollmentSchema = z.object({
  descriptors: z.array(faceDescriptor).min(1).max(20),
});

export const bulkImportSchema = z.object({
  students: z
    .array(
      z.object({
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(8),
        displayName: z.string().trim().min(1).max(255),
        department: z.string().trim().min(1).max(100),
        enrollmentId: z.string().trim().max(50),
        phone: z.string().trim().max(20).optional(),
      }),
    )
    .min(1)
    .max(500),
});

const scheduleSchema = z.array(
  z.object({
    day: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    room: z.string(),
  }),
);

export const subjectCreateSchema = z.object({
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().min(1).max(50),
  department: z.string().trim().min(1).max(100),
  semester: z.coerce.number().int().min(1).max(12),
  teacherId: uuidSchema.optional(),
  schedule: scheduleSchema.optional(),
});

export const subjectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  schedule: scheduleSchema.optional(),
  isActive: z.boolean().optional(),
});

export const enrollSchema = z.object({
  studentIds: z.array(uuidSchema).min(1).max(1000),
});

export const createSessionSchema = z.object({ subjectId: uuidSchema });

export const markAttendanceSchema = z.object({
  sessionId: uuidSchema,
  /** Live face descriptor captured in the browser; matched server-side. */
  faceDescriptor,
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  deviceInfo: z.string().max(500).optional(),
});

export const overrideSchema = z.object({
  recordId: uuidSchema,
  status: z.enum(['present', 'absent', 'late', 'proxy_detected']),
  reason: z.string().trim().min(1).max(1000),
});

export const settingsUpdateSchema = z
  .object({
    faceMatchThreshold: z.number().min(0).max(1),
    attendanceWindowMinutes: z.number().int().min(1).max(600),
    lateThresholdMinutes: z.number().int().min(0).max(600),
    minimumAttendancePercent: z.number().int().min(0).max(100),
    geofencingEnabled: z.boolean(),
    campusLat: z.number().min(-90).max(90),
    campusLng: z.number().min(-180).max(180),
    campusRadius: z.number().int().min(10).max(100_000),
    maxFaceEnrollmentPhotos: z.number().int().min(1).max(20),
    sessionTokenRefreshSeconds: z.number().int().min(10).max(3600),
    emailNotificationsEnabled: z.boolean(),
  })
  .partial()
  .strict();

/** Read a route parameter as a single string (Express 5 types params as string | string[]). */
export function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export function uuidParam(value: string | string[] | undefined): string {
  return uuidSchema.parse(param(value));
}

/** Read an optional query-string value as a single string. */
export function queryString(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(queryString(value) ?? '', 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
