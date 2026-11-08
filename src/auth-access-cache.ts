// This is a UI startup hint only. Database RLS authorizes every read/write.
// Never store credentials or tokens here; Supabase manages session persistence.
export const ACCESS_CACHE_KEY = "at-home-access-check-v1";
export const ACCESS_CACHE_TTL = 5 * 60 * 1000;
type AccessSession = { user: { id: string }; expires_at?: number };

export function hasCachedAccess(session: AccessSession, now = Date.now()) {
  try {
    const entry = JSON.parse(localStorage.getItem(ACCESS_CACHE_KEY) || "null");
    return !!entry && entry.userId === session.user.id
      && Number.isFinite(entry.expiresAt) && entry.expiresAt > now
      && entry.expiresAt <= now + ACCESS_CACHE_TTL
      && Number.isFinite(session.expires_at) && session.expires_at! * 1000 > now;
  } catch { return false; }
}
export function cacheAccess(session: AccessSession, now = Date.now()) {
  if (!Number.isFinite(session.expires_at) || session.expires_at! * 1000 <= now) return;
  try {
    localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({
      userId: session.user.id,
      expiresAt: Math.min(now + ACCESS_CACHE_TTL, session.expires_at! * 1000),
    }));
  } catch { /* Storage unavailable: keep checking access normally. */ }
}
export function clearCachedAccess() {
  try { localStorage.removeItem(ACCESS_CACHE_KEY); } catch { /* Storage may be blocked. */ }
}
