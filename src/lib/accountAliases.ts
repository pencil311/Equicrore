/* ============================================================
   Account aliasing + sign-in allow-list.

   An alias makes one account read and write ANOTHER account's dataset, so two
   logins share one set of holdings, records, clients, positions and cash.

   Identity and data ownership are kept separate on purpose:
     session.user.id      → the account that actually signed in (profile, name)
     session.user.dataId  → the account whose data is being read/written
   Collapsing the two would mean an aliased user editing their display name
   would rename the account they alias to.
   ============================================================ */

/** alias email → the account whose data it shares. Keys must be lowercase. */
export const ACCOUNT_ALIASES: Record<string, string> = {
  '12arun05kumar@gmail.com': 'cadhya2311@gmail.com',
}

function norm(email?: string | null): string {
  return (email ?? '').trim().toLowerCase()
}

/** The email whose dataset this account should operate on. */
export function dataOwnerEmail(email?: string | null): string {
  const e = norm(email)
  return ACCOUNT_ALIASES[e] ?? e
}

/** True when this account reads someone else's data. */
export function isAliased(email?: string | null): boolean {
  const e = norm(email)
  return Boolean(e) && Boolean(ACCOUNT_ALIASES[e]) && ACCOUNT_ALIASES[e] !== e
}

/**
 * Emails permitted to sign in, from the ALLOWED_EMAILS env var (comma-separated).
 * An unset or empty value means NO restriction — that keeps the previous
 * behaviour, and means a missing env var in one environment can't lock you out.
 */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowed(email?: string | null): boolean {
  const list = allowedEmails()
  if (list.length === 0) return true
  const e = norm(email)
  return Boolean(e) && list.includes(e)
}

/** Data-owner id for a session, falling back to the signed-in account's own id. */
export function dataUserId(session: any): string | undefined {
  return session?.user?.dataId ?? session?.user?.id
}
