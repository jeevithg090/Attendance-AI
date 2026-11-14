// Seeds global settings and a demo admin/teacher/student/subject.
// Idempotent: safe to run multiple times.
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { db } from './connection';
import { subjectEnrollments, subjects, systemSettings, users } from './schema';

const DEMO_DEFAULTS = {
  SEED_ADMIN_PASSWORD: 'Admin@123',
  SEED_TEACHER_PASSWORD: 'Teacher@123',
  SEED_STUDENT_PASSWORD: 'Student@123',
} as const;

function seedPassword(name: keyof typeof DEMO_DEFAULTS): string {
  const value = process.env[name];
  if (value) return value;
  if (env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set when seeding a production database`);
  }
  return DEMO_DEFAULTS[name];
}

async function upsertUser(values: typeof users.$inferInsert) {
  await db.insert(users).values(values).onConflictDoNothing();
  const [user] = await db.select().from(users).where(eq(users.email, values.email)).limit(1);
  return user;
}

async function seed() {
  console.log('Seeding database...');

  await db.insert(systemSettings).values({ id: 'global' }).onConflictDoNothing();

  await upsertUser({
    email: 'admin@bmsce.ac.in',
    passwordHash: await bcrypt.hash(seedPassword('SEED_ADMIN_PASSWORD'), 12),
    displayName: 'System Administrator',
    role: 'admin',
    department: 'Admin',
  });

  const teacher = await upsertUser({
    email: 'teacher1@bmsce.ac.in',
    passwordHash: await bcrypt.hash(seedPassword('SEED_TEACHER_PASSWORD'), 12),
    displayName: 'Dr. Jane Smith',
    role: 'teacher',
    department: 'Computer Science',
    employeeId: 'EMP001',
  });

  const student = await upsertUser({
    email: 'student1@bmsce.ac.in',
    passwordHash: await bcrypt.hash(seedPassword('SEED_STUDENT_PASSWORD'), 12),
    displayName: 'John Doe',
    role: 'student',
    department: 'Computer Science',
    enrollmentId: '1BM25CS001',
  });

  await db
    .insert(subjects)
    .values({
      name: 'Innovation & Design Thinking',
      code: '25ME2AEIDT',
      department: 'Computer Science',
      semester: 2,
      teacherId: teacher.id,
      teacherName: teacher.displayName,
    })
    .onConflictDoNothing();
  const [subject] = await db.select().from(subjects).where(eq(subjects.code, '25ME2AEIDT')).limit(1);

  await db
    .insert(subjectEnrollments)
    .values({ subjectId: subject.id, studentId: student.id })
    .onConflictDoNothing();

  console.log('Seeding complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
