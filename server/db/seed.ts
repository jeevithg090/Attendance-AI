import { db } from './connection';
import { users, subjects, systemSettings } from './schema';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database with demo data...');

  try {
    // 1. Set up global settings (BMSCE Coordinates)
    console.log('Adding global settings...');
    await db.insert(systemSettings).values({
      id: 'global',
      geofencingEnabled: true,
      campusLat: 12.9416151,
      campusLng: 77.5668099,
      campusRadius: 200,
      faceMatchThreshold: 0.5,
      attendanceWindowMinutes: 30,
      lateThresholdMinutes: 10,
    }).onConflictDoNothing();

    // 2. Create Admin
    console.log('Creating Admin...');
    const adminPass = await bcrypt.hash('Admin@123', 10);
    await db.insert(users).values({
      email: 'admin@bmsce.ac.in',
      passwordHash: adminPass,
      displayName: 'System Administrator',
      role: 'admin',
      department: 'Admin',
    }).onConflictDoNothing();

    // 3. Create Teacher
    console.log('Creating Teacher...');
    const teacherPass = await bcrypt.hash('Teacher@123', 10);
    const [teacher] = await db.insert(users).values({
      email: 'teacher1@bmsce.ac.in',
      passwordHash: teacherPass,
      displayName: 'Dr. Jane Smith',
      role: 'teacher',
      department: 'Computer Science',
      employeeId: 'EMP001',
    }).onConflictDoNothing().returning();

    // 4. Create Student
    console.log('Creating Student...');
    const studentPass = await bcrypt.hash('Student@123', 10);
    await db.insert(users).values({
      email: 'student1@bmsce.ac.in',
      passwordHash: studentPass,
      displayName: 'John Doe',
      role: 'student',
      department: 'Computer Science',
      enrollmentId: '1BM25CS001',
    }).onConflictDoNothing();

    // 5. Create a Subject
    if (teacher) {
      console.log('Creating Demo Subject...');
      await db.insert(subjects).values({
        name: 'Innovation & Design Thinking',
        code: '25ME2AEIDT',
        department: 'Computer Science',
        semester: 2,
        teacherId: teacher.id,
        teacherName: teacher.displayName,
      }).onConflictDoNothing();
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
