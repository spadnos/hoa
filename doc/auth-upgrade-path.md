# Auth Upgrade Path

The demo auth system uses a plain cookie with a base64-encoded JSON payload. The abstraction is designed so that swapping to a real provider (Supabase Auth, NextAuth, Clerk) requires changing exactly three files.

## Files to Replace

### 1. `src/auth/session.ts`
Replace `getSession()` with the provider's user-fetch function, mapped to the same `SessionUser` shape:

```typescript
// Supabase
import { createServerClient } from '@supabase/ssr';
export async function getSession(): Promise<SessionUser | null> {
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Derive permissions from your group_memberships / lot_associations tables
  // (same SQL queries as loginAction currently does)
  return { partyId: ..., name: ..., permissions: [...] };
}
```

`createSession` and `clearSession` can be removed — the provider manages the cookie.

### 2. `src/auth/actions.ts`
Replace `loginAction` / `logoutAction` with the provider's sign-in/sign-out:

```typescript
// Supabase magic link example
export async function loginAction(email: string) {
  const supabase = createServerClient(...);
  await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '/' } });
}

export async function logoutAction() {
  const supabase = createServerClient(...);
  await supabase.auth.signOut();
  redirect('/login');
}
```

### 3. `proxy.ts`
Replace the cookie presence check with the provider's session check:

```typescript
// Supabase — must call getSession() in proxy to refresh the token
import { createServerClient } from '@supabase/ssr';
export default async function proxy(request: NextRequest) {
  const { response, session } = await createServerClient(...).auth.getSession();
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return response; // Supabase SSR needs to forward its response to refresh tokens
}
```

## Files That Don't Change

- `src/auth/permissions.ts` — permission derivation is independent of auth provider
- `app/components/Nav.tsx` — receives `SessionUser | null` prop, unchanged
- `app/layout.tsx` — calls `getSession()`, unchanged
- All page components — call `getSession()` / `hasPermission()`, unchanged
- `app/login/page.tsx` — replace UI with provider's sign-in flow

## Notes

- The `SessionUser.permissions` array is HOA-specific (derived from `group_memberships` and `lot_associations`). With a real auth provider, derive these in `getSession()` using the same SQL queries currently in `loginAction`.
- Before going to production with the current cookie approach, sign the payload: add `crypto.createHmac('sha256', process.env.SESSION_SECRET).update(json).digest('hex')` to `session.ts`.
- Supabase Auth requires middleware (proxy) to call `getSession()` on every request to refresh the JWT — don't skip this step or tokens will expire mid-session.
