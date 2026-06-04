import { db } from './connection';
import { attendanceRecords, attendanceSessions, notifications, auditLogs } from './schema';

async function clearData() {
  console.log('🧹 Clearing transactional data...');

  try {
    console.log('Deleting notifications...');
    await db.delete(notifications);

    console.log('Deleting attendance records...');
    await db.delete(attendanceRecords);

    console.log('Deleting attendance sessions...');
    await db.delete(attendanceSessions);
    
    console.log('Deleting audit logs...');
    await db.delete(auditLogs);

    console.log('✅ Successfully erased all transactional data. Users and Subjects remain intact.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

clearData();
