import { cookies } from 'next/headers';
import type { Permission } from './permissions';

export interface SessionUser {
  partyId: number;
  organizationId: string;
  name: string;
  permissions: Permission[];
}

const COOKIE_NAME = 'emhoa_session';

// Upgrade path: replace this file's body to use NextAuth/Clerk/Supabase Auth.
// Map the provider's user object to SessionUser and keep the same exports.

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as SessionUser;
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(user)).toString('base64');
  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Add secure: true and a signed/encrypted payload before production
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
