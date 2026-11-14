// Fills a development database with fictional demo data: extra students and a
// second teacher, three more subjects, two weeks of closed attendance sessions
// with present / late / absent / proxy records, and a few notifications.
//
// Run `npm run db:seed` first (it creates the base demo accounts), then
// `npm run db:seed:demo`. Re-running replaces the previous demo data.
// Refuses to run when NODE_ENV=production.
import bcrypt from 'bcryptjs';
import { eq, inArray, like, sql } from 'drizzle-orm';
import { env } from '../config/env';
import { db } from './connection';
import {
  attendanceRecords,
  attendanceSessions,
  notifications,
  subjectEnrollments,
  subjects,
  users,
} from './schema';

const DEMO_EMAIL_PREFIX = 'demo.';
const DEMO_DOMAIN = '@bmsce.ac.in';
const DEMO_PASSWORD = 'Demo@1234';

const STUDENT_NAMES = [
  'Aarav Mehta',
  'Diya Raman',
  'Kabir Nair',
  'Ananya Iyer',
  'Rohan Kulkarni',
  'Meera Shetty',
  'Vihaan Rao',
  'Isha Banerjee',
  'Arjun Menon',
  'Sara Thomas',
  'Nikhil Hegde',
  'Tara Pillai',
];

const DEMO_SUBJECTS = [
  { name: 'Data Structures', code: 'DEMO-CS301', semester: 3 },
  { name: 'Operating Systems', code: 'DEMO-CS402', semester: 4 },
  { name: 'Computer Networks', code: 'DEMO-CS503', semester: 5 },
];

/** Small deterministic PRNG so every run produces the same demo data. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(2025);

/** Synthetic 128-d descriptor. It cannot match a real face; it only marks the account as enrolled. */
function syntheticDescriptor(): number[] {
  return Array.from({ length: 128 }, () => Number((random() * 0.4 - 0.2).toFixed(4)));
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z]+/g, '.');
}

async function removePreviousDemoData() {
  await db.delete(notifications).where(sql`${notifications.metadata}->>'demo' = 'true'`);
  const demoSubjects = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(like(subjects.code, 'DEMO-%'));
  const subjectIds = demoSubjects.map((s) => s.id);
  if (subjectIds.length > 0) {
    await db.delete(attendanceRecords).where(inArray(attendanceRecords.subjectId, subjectIds));
    await db.delete(attendanceSessions).where(inArray(attendanceSessions.subjectId, subjectIds));
    await db.delete(subjectEnrollments).where(inArray(subjectEnrollments.subjectId, subjectIds));
    await db.delete(subjects).where(inArray(subjects.id, subjectIds));
  }

  const demoUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `${DEMO_EMAIL_PREFIX}%`));
  const userIds = demoUsers.map((u) => u.id);
  if (userIds.length > 0) {
    await db.delete(notifications).where(inArray(notifications.recipientId, userIds));
    await db.delete(attendanceRecords).where(inArray(attendanceRecords.studentId, userIds));
    await db.delete(subjectEnrollments).where(inArray(subjectEnrollments.studentId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
}

async function seedDemo() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to load demo data into a production database');
  }

  const [teacher] = await db.select().from(users).where(eq(users.email, 'teacher1@bmsce.ac.in')).limit(1);
  const [baseStudent] = await db.select().from(users).where(eq(users.email, 'student1@bmsce.ac.in')).limit(1);
  if (!teacher || !baseStudent) {
    throw new Error('Base demo accounts not found. Run `npm run db:seed` first.');
  }

  console.log('Removing previous demo data...');
  await removePreviousDemoData();

  console.log('Creating demo users...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.insert(users).values({
    email: `${DEMO_EMAIL_PREFIX}ravi.kumar${DEMO_DOMAIN}`,
    passwordHash,
    displayName: 'Prof. Ravi Kumar',
    role: 'teacher',
    department: 'Information Science',
    employeeId: 'DEMO-EMP002',
  });

  const studentRows = await db
    .insert(users)
    .values(
      STUDENT_NAMES.map((name, i) => {
        const enrolled = i % 4 !== 3; // three in four students have face data
        return {
          email: `${DEMO_EMAIL_PREFIX}${slug(name)}${DEMO_DOMAIN}`,
          passwordHash,
          displayName: name,
          role: 'student' as const,
          department: i < 9 ? 'Computer Science' : 'Information Science',
          enrollmentId: `1BM25CS${String(i + 10).padStart(3, '0')}`,
          phone: i % 3 === 0 ? `+91 90000 ${String(10000 + i * 137).slice(0, 5)}` : null,
          faceEnrolled: enrolled,
          faceDescriptors: enrolled ? [syntheticDescriptor()] : null,
          isActive: i !== 11,
        };
      }),
    )
    .returning();

  const roster = [baseStudent, ...studentRows.filter((s) => s.isActive)];

  console.log('Creating demo subjects and sessions...');
  const now = new Date();
  let sessionCount = 0;
  let recordCount = 0;

  for (const [subjectIndex, def] of DEMO_SUBJECTS.entries()) {
    const [subject] = await db
      .insert(subjects)
      .values({
        ...def,
        department: 'Computer Science',
        teacherId: teacher.id,
        teacherName: teacher.displayName,
      })
      .returning();

    await db
      .insert(subjectEnrollments)
      .values(roster.map((s) => ({ subjectId: subject.id, studentId: s.id })))
      .onConflictDoNothing();

    // One session every other weekday-ish over the last two weeks.
    const daysAgo = [13, 11, 9, 7, 6, 4, 2, 1].filter((_, i) => (i + subjectIndex) % 4 !== 3);
    for (const day of daysAgo) {
      const start = new Date(now);
      start.setDate(start.getDate() - day);
      start.setHours(9 + subjectIndex * 2, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60_000);

      const records = roster.map((student) => {
        // The base demo student attends most classes; others vary.
        const roll = random();
        const reliability = student.id === baseStudent.id ? 0.88 : 0.55 + random() * 0.4;
        let status: 'present' | 'late' | 'absent' | 'proxy_detected' = 'absent';
        if (roll < reliability) status = random() < 0.15 ? 'late' : 'present';
        else if (roll > 0.97 && student.id !== baseStudent.id) status = 'proxy_detected';

        const markedAt = new Date(start.getTime() + (status === 'late' ? 14 : 2 + random() * 6) * 60_000);
        const score = status === 'proxy_detected' ? 0.3 + random() * 0.12 : 0.62 + random() * 0.3;
        return {
          subjectId: subject.id,
          studentId: student.id,
          studentName: student.displayName,
          enrollmentId: student.enrollmentId ?? '',
          date: start.toISOString().slice(0, 10),
          markedAt: status === 'absent' ? end : markedAt,
          status,
          verificationMethod: 'face_recognition' as const,
          faceMatchScore: status === 'absent' ? null : Number(score.toFixed(3)),
          faceMatchThreshold: status === 'absent' ? null : 0.5,
          flagged: status === 'proxy_detected',
          flagReason:
            status === 'proxy_detected' ? `Face match score ${score.toFixed(2)} below threshold 0.5` : null,
        };
      });

      const [session] = await db
        .insert(attendanceSessions)
        .values({
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          teacherId: teacher.id,
          teacherName: teacher.displayName,
          date: start.toISOString().slice(0, 10),
          startTime: start,
          endTime: end,
          status: 'closed',
          totalEnrolled: roster.length,
          totalPresent: records.filter((r) => r.status === 'present' || r.status === 'late').length,
        })
        .returning();

      await db.insert(attendanceRecords).values(records.map((r) => ({ ...r, sessionId: session.id })));
      sessionCount += 1;
      recordCount += records.length;
    }

    await db.update(subjects).set({ totalClasses: daysAgo.length }).where(eq(subjects.id, subject.id));
  }

  console.log('Creating demo notifications...');
  const yesterday = new Date(now.getTime() - 24 * 3_600_000);
  const demoNotifications: (typeof notifications.$inferInsert)[] = [
    {
      recipientId: baseStudent.id,
      type: 'absent_alert',
      title: 'Marked absent',
      message: 'You were marked absent in Operating Systems (DEMO-CS402).',
      createdAt: yesterday,
    },
    {
      recipientId: baseStudent.id,
      type: 'system',
      title: 'Welcome to AttendAI',
      message: 'Enrol your face from your profile so you can check in to classes.',
      read: true,
      createdAt: new Date(now.getTime() - 5 * 24 * 3_600_000),
    },
    {
      recipientId: teacher.id,
      type: 'proxy_detected',
      title: 'Possible proxy attempt',
      message: `A check-in for ${STUDENT_NAMES[4]} in Data Structures did not match the enrolled face.`,
      createdAt: new Date(now.getTime() - 2 * 3_600_000),
    },
  ];
  await db.insert(notifications).values(demoNotifications.map((n) => ({ ...n, metadata: { demo: true } })));

  console.log(
    `Demo data ready: ${studentRows.length} students, 1 teacher, ${DEMO_SUBJECTS.length} subjects, ` +
      `${sessionCount} sessions, ${recordCount} records. Demo users sign in with password ${DEMO_PASSWORD}.`,
  );
}

seedDemo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Demo seeding failed:', error);
    process.exit(1);
  });
