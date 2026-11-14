// Deletes transactional data (sessions, records, notifications, audit logs).
// Users, subjects and enrolments are kept. Intended for development only.
import { env } from '../config/env';
import { db } from './connection';
import { attendanceRecords, attendanceSessions, auditLogs, notifications } from './schema';

async function clearData() {
  if (env.NODE_ENV === 'production' && process.env.CONFIRM_CLEAR !== 'yes') {
    throw new Error('Refusing to clear a production database without CONFIRM_CLEAR=yes');
  }
  await db.delete(notifications);
  await db.delete(attendanceRecords);
  await db.delete(attendanceSessions);
  await db.delete(auditLogs);
  console.log('Cleared transactional data. Users and subjects remain intact.');
}

clearData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to clear data:', error);
    process.exit(1);
  });
