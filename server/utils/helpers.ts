// ═══════════════════════════════════════════════════════════
// AttendAI — Server Utilities
// ═══════════════════════════════════════════════════════════

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function generateRandomToken(): string {
  return crypto.randomUUID();
}
