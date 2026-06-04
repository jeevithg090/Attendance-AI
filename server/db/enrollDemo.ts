import { db } from './connection';
import { users, subjects, subjectEnrollments } from './schema';
import { eq } from 'drizzle-orm';

async function enrollStudent() {
  console.log('Enrolling demo student into demo subject...');

  try {
    const [student] = await db.select().from(users).where(eq(users.email, 'student1@bmsce.ac.in'));
    const [subject] = await db.select().from(subjects).where(eq(subjects.code, '25ME2AEIDT'));

    if (student && subject) {
      await db.insert(subjectEnrollments).values({
        subjectId: subject.id,
        studentId: student.id,
      }).onConflictDoNothing();
      console.log('✅ Successfully enrolled student1 in 25ME2AEIDT');
    } else {
      console.log('❌ Could not find student or subject');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error enrolling:', error);
    process.exit(1);
  }
}

enrollStudent();
