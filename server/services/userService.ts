// User serialisation helpers.
import type { users } from '../db/schema';

type UserRow = typeof users.$inferSelect;

/**
 * Strip secrets before returning a user to a client. Raw face descriptors are
 * biometric data and are matched server-side, so they never leave the API.
 */
export function toPublicUser(user: UserRow) {
  const { passwordHash: _password, faceDescriptors, ...rest } = user;
  return { ...rest, faceDescriptorCount: faceDescriptors?.length ?? 0 };
}

export type PublicUser = ReturnType<typeof toPublicUser>;
