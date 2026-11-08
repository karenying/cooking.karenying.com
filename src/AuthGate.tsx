import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { LogOut } from "lucide-react";
import { cacheAccess, clearCachedAccess, hasCachedAccess } from "./auth-access-cache";
export const WriteSafety = createContext({ begin: () => {}, end: () => {} });
const AccountActions = createContext<{ signOut: () => void; disabled: boolean; busy: boolean } | null>(null);
export function SignOutButton() {
  const account = useContext(AccountActions);
  if (!account) return null;
  return <button className="account-signout" disabled={account.disabled} onClick={account.signOut}>
    <LogOut size={17} aria-hidden="true" />{account.busy ? "Signing out…" : "Sign out"}
  </button>;
}
export function AuthGate({ children }: { children: ReactNode }) {
  const [writes, setWrites] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<{ userId: string; allowed: boolean } | null>(null);
  const allowed = !!session && access?.userId === session.user.id && access.allowed;
  const [checking, setChecking] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!supabase) { setReady(true); setError("Supabase isn’t configured."); return; }
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next); setReady(true);
        if (!next) { clearCachedAccess(); setAccess(null); }
        else setAccess(current => current?.userId === next.user.id ? current
          : hasCachedAccess(next) ? { userId: next.user.id, allowed: true } : null);
      }
    });
    void supabase.auth.getSession().then(({ error }) => {
      if (active && error) { setError(error.message); setReady(true); }
    }).catch(error => { if (active) { setError(String(error)); setReady(true); } });
    const params = new URLSearchParams(window.location.search);
    if (params.has("error_description")) setError(params.get("error_description") || "Google sign-in failed.");
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!supabase || !session) return;
    function restoreRoute() {
      try {
        const route = sessionStorage.getItem("at-home-login-route");
        if (route && /^\/(calendar|recipes|analytics)(\/[^?#]*)?$/.test(route)) window.location.hash = route;
        sessionStorage.removeItem("at-home-login-route");
      } catch { /* Optional return-route storage must not block access. */ }
    }
    if (hasCachedAccess(session)) {
      setAccess({ userId: session.user.id, allowed: true });
      setChecking(false); restoreRoute();
      return;
    }
    let active = true; setChecking(true); setError("");
    void supabase.rpc("cookbook_access").then(({ data, error }) => {
      if (!active) return;
      setAccess({ userId: session.user.id, allowed: !error && data === true });
      setChecking(false);
      if (error) setError(error.message);
      if (!error && data === true) { cacheAccess(session); restoreRoute(); }
      else clearCachedAccess();
    }, error => {
      if (active) {
        clearCachedAccess(); setAccess({ userId: session.user.id, allowed: false });
        setChecking(false); setError(String(error));
      }
    });
    return () => { active = false; };
  }, [session?.access_token, session?.user.id, attempt]);
  useEffect(() => {
    if (!ready || session) return;
    const controller = new AbortController();
    const url = import.meta.env.VITE_SUPABASE_URL; const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) void fetch(url + "/auth/v1/settings", { headers: { apikey: key }, signal: controller.signal })
      .then(r => r.json()).then(data => setGoogleReady(data.external?.google === true))
      .catch(() => { /* Keep sign-in disabled until provider readiness can be confirmed. */ });
    return () => controller.abort();
  }, [ready, session?.user.id, attempt]);
  async function signOut() {
    setBusy(true); setError("");
    try { const { error } = await supabase!.auth.signOut(); if (error) throw error; }
    catch (error) { setError(error instanceof Error ? error.message : "Couldn’t sign out."); }
    finally { setBusy(false); }
  }
  if (!ready) return <main className="connection-card" aria-busy="true" aria-label="Opening cookbook" />;
  if (session && !allowed && (checking || access?.userId !== session.user.id)) return <main className="connection-card" role="status">Checking cookbook access…</main>;
  if (session && allowed) return <>
    {error && <p className="storage-warning" role="alert">{error}</p>}
    <WriteSafety.Provider value={{ begin: () => setWrites(n => n + 1), end: () => setWrites(n => Math.max(0,n - 1)) }}><AccountActions.Provider value={{ signOut: () => void signOut(), disabled: busy || writes > 0, busy }}><div key={session.user.id}>{children}</div></AccountActions.Provider></WriteSafety.Provider>
  </>;
  return <main className="connection-card">
    <h1>Your cookbook.</h1>
    <p>{session ? "This Google account doesn’t have access to this cookbook." : "Sign in with an approved Google account to access recipes and the calendar."}</p>
    {session && <p>{session.user.email}</p>}
    {error && <p role="alert">{error}</p>}
    {!session && !googleReady && <p role="status">Google sign-in setup is still pending. Configure the Google provider in Supabase, then check again.</p>}
    {session ? <button className="primary-button" disabled={busy} onClick={() => void signOut()}>Use another Google account</button> :
      <button className="primary-button" disabled={busy || !googleReady} onClick={async () => {
        setBusy(true); setError("");
        try {
          sessionStorage.setItem("at-home-login-route", window.location.hash.slice(1) || "/calendar");
          const { error } = await supabase!.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/", scopes: "openid email profile", queryParams: { prompt: "select_account" } } });
          if (error) throw error;
        } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t start Google sign-in."); setBusy(false); }
      }}>Continue with Google</button>}
    <button className="text-button" onClick={() => setAttempt(a => a + 1)}>Check again</button>
  </main>;
}
