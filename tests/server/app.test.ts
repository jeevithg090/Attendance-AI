import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb, queueResult, resetFakeDb } from './fakeDb';

vi.mock('../../server/db/connection', () => ({ db: fakeDb }));

const { createApp } = await import('../../server/app');
const { generateToken } = await import('../../server/services/authService');

const app = createApp();

const ids = {
  student: '11111111-1111-4111-8111-111111111111',
  teacher: '22222222-2222-4222-8222-222222222222',
  admin: '33333333-3333-4333-8333-333333333333',
};

type Role = keyof typeof ids;

function tokenFor(role: Role) {
  return generateToken({ userId: ids[role], email: `${role}@example.com`, role });
}

/** Queue the row the auth middleware loads for the current user. */
function queueAuthUser(role: Role, isActive = true) {
  queueResult([
    { id: ids[role], email: `${role}@example.com`, role, displayName: role, department: 'CSE', isActive },
  ]);
}

beforeEach(() => resetFakeDb());

describe('public endpoints', () => {
  it('GET /api/health responds ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('unknown API routes return a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Route not found' });
  });

  it('malformed JSON bodies return 400, not 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('validates the payload', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects unknown users with a generic message and no internals', async () => {
    queueResult([]); // no user found
    const res = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, error: 'Invalid credentials' });
  });

  it('returns a token and never leaks the password hash or face descriptors', async () => {
    const bcrypt = await import('bcryptjs');
    queueResult([
      {
        id: ids.student,
        email: 'student@example.com',
        passwordHash: await bcrypt.hash('correct-password', 4),
        displayName: 'Student',
        role: 'student',
        department: 'CSE',
        faceEnrolled: true,
        faceDescriptors: [[0.1, 0.2]],
        isActive: true,
      },
    ]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'Student@Example.com', password: 'correct-password' });
    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.faceDescriptors).toBeUndefined();
    expect(res.body.data.user.faceDescriptorCount).toBe(1);
  });
});

describe('authentication middleware', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  it('does not accept tokens in the query string outside SSE', async () => {
    const res = await request(app).get(`/api/auth/me?token=${tokenFor('student')}`);
    expect(res.status).toBe(401);
  });

  it('rejects deactivated users', async () => {
    queueAuthUser('student', false);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor('student')}`);
    expect(res.status).toBe(401);
  });
});

describe('authorization', () => {
  it('forbids students from listing users', async () => {
    queueAuthUser('student');
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenFor('student')}`);
    expect(res.status).toBe(403);
  });

  it("forbids students from reading another student's attendance", async () => {
    queueAuthUser('student');
    const res = await request(app)
      .get(`/api/attendance/student/${ids.teacher}`)
      .set('Authorization', `Bearer ${tokenFor('student')}`);
    expect(res.status).toBe(403);
  });

  it("forbids students from reading another user's profile", async () => {
    queueAuthUser('student');
    const res = await request(app).get(`/api/users/${ids.admin}`).set('Authorization', `Bearer ${tokenFor('student')}`);
    expect(res.status).toBe(403);
  });

  it('forbids non-admins from changing settings', async () => {
    queueAuthUser('teacher');
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${tokenFor('teacher')}`)
      .send({ faceMatchThreshold: 0 });
    expect(res.status).toBe(403);
  });

  it("forbids a teacher from closing another teacher's session", async () => {
    queueAuthUser('teacher');
    queueResult([{ id: ids.student, teacherId: ids.admin, status: 'active' }]); // session lookup
    const res = await request(app)
      .post(`/api/sessions/${ids.student}/close`)
      .set('Authorization', `Bearer ${tokenFor('teacher')}`);
    expect(res.status).toBe(403);
  });
});

describe('input validation', () => {
  it('rejects non-uuid ids with 400', async () => {
    queueAuthUser('admin');
    const res = await request(app).get('/api/users/not-a-uuid').set('Authorization', `Bearer ${tokenFor('admin')}`);
    expect(res.status).toBe(400);
  });

  it('rejects unknown settings keys', async () => {
    queueAuthUser('admin');
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)
      .send({ isAdmin: true });
    expect(res.status).toBe(400);
  });

  it('rejects attendance marked with a client-side score instead of a descriptor', async () => {
    queueAuthUser('student');
    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', `Bearer ${tokenFor('student')}`)
      .send({ sessionId: ids.teacher, faceMatchScore: 1 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/attendance/mark', () => {
  const descriptor = Array.from({ length: 128 }, () => 0.1);
  const settings = {
    id: 'global',
    faceMatchThreshold: 0.5,
    attendanceWindowMinutes: 30,
    lateThresholdMinutes: 10,
    minimumAttendancePercent: 75,
    geofencingEnabled: false,
    campusLat: 0,
    campusLng: 0,
    campusRadius: 200,
    maxFaceEnrollmentPhotos: 5,
    sessionTokenRefreshSeconds: 60,
    emailNotificationsEnabled: false,
  };
  const session = (startTime: Date) => ({
    id: ids.teacher,
    subjectId: ids.admin,
    teacherId: ids.admin,
    subjectName: 'Maths',
    status: 'active',
    startTime,
    date: '2026-01-01',
  });

  it('rejects check-ins after the attendance window', async () => {
    queueAuthUser('student');
    queueResult([session(new Date(Date.now() - 60 * 60_000))], [settings]);
    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', `Bearer ${tokenFor('student')}`)
      .send({ sessionId: ids.teacher, faceDescriptor: descriptor });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/window/);
  });

  it('scores the face on the server and records a present mark', async () => {
    queueAuthUser('student');
    queueResult(
      [session(new Date())], // session
      [settings], // settings
      [{ id: 'enrolment' }], // isStudentEnrolled
      [], // hasMarkedAttendance
      [{ displayName: 'Student', enrollmentId: 'S1', faceDescriptors: [descriptor] }], // student
    );
    // The insert ... returning() call echoes a record; capture what we would store.
    queueResult([{ id: 'record', status: 'present', faceMatchScore: 1, studentName: 'Student' }], []);
    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', `Bearer ${tokenFor('student')}`)
      .send({ sessionId: ids.teacher, faceDescriptor: descriptor });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('present');
  });

  it('refuses to mark attendance when no face is enrolled', async () => {
    queueAuthUser('student');
    queueResult(
      [session(new Date())],
      [settings],
      [{ id: 'enrolment' }],
      [],
      [{ displayName: 'Student', enrollmentId: 'S1', faceDescriptors: null }],
    );
    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', `Bearer ${tokenFor('student')}`)
      .send({ sessionId: ids.teacher, faceDescriptor: descriptor });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not enrolled/i);
  });
});
