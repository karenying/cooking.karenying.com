import { useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Meal, Recipe } from "./data";
import { supabase } from "./supabase";

export type CookbookStore = {
  recipes: Recipe[];
  meals: Meal[];
  setRecipes: Dispatch<SetStateAction<Recipe[]>>;
  setMeals: Dispatch<SetStateAction<Meal[]>>;
};
type Snapshot = { recipes: Recipe[]; meals: Meal[]; revision: number };
const message = (error: unknown) => error instanceof Error ? error.message
  : typeof error === "object" && error !== null && "message" in error ? String(error.message)
  : "Couldn’t connect. Please try again.";

export function Connection({ demo, cookbook }: {
  demo: ReactNode;
  cookbook: (store: CookbookStore) => ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(!!supabase);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    // The initial event and later changes share a single source of auth state.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setChecking(false); }
    });
    void supabase.auth.getSession().then(({ error }) => {
      if (active && error) { setError(error.message); setChecking(false); }
    }).catch((error: unknown) => {
      if (active) { setError(message(error)); setChecking(false); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  if (checking) return <div className="connection-card" role="status">Connecting to your cookbook…</div>;
  if (session) return <CloudCookbook key={session.user.id} email={session.user.email || "Signed in"} render={cookbook} />;
  if (preview || !supabase) return <>
    {supabase && <div className="connection-bar">Local preview · saved on this device
      <button className="text-button" onClick={() => setPreview(false)}>Sign in</button></div>}
    {demo}
  </>;
  return <SignIn error={error} preview={() => setPreview(true)} />;
}

function SignIn({ error: initialError, preview }: { error: string; preview: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState("");
  return <main className="connection-card">
    <h1>Your cookbook.</h1>
    <p>Sign in to keep recipes and meals together across your devices.</p>
    <p className="muted">Your cookbook login is separate from your Supabase dashboard account.</p>
    <form className="editor-form" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError(""); setNotice("");
      try {
        const { data, error } = signup
          ? await supabase!.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } })
          : await supabase!.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (signup && !data.session) setNotice("Check your email to confirm your account, then return here to sign in.");
      } catch (error) { setError(message(error)); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="auth-email">Email</label>
      <input id="auth-email" type="email" autoComplete="email" required value={email}
        onChange={(event) => setEmail(event.target.value)} disabled={busy} />
      <label htmlFor="auth-password">Password</label>
      <input id="auth-password" type="password" autoComplete={signup ? "new-password" : "current-password"}
        minLength={signup ? 8 : undefined} required value={password}
        onChange={(event) => setPassword(event.target.value)} disabled={busy} />
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : signup ? "Create cookbook account" : "Sign in"}</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => {
        setSignup(!signup); setError(""); setNotice("");
      }}>{signup ? "Already have a cookbook login? Sign in" : "First time? Create a cookbook login"}</button>
    </form>
    <button className="text-button" onClick={preview}>Continue with the local preview</button>
  </main>;
}

function CloudCookbook({ email, render }: { email: string; render: (store: CookbookStore) => ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const latest = useRef<Snapshot | null>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [accountError, setAccountError] = useState("");
  useEffect(() => {
    let active = true;
    void supabase!.rpc("load_cookbook").then(({ data, error }) => {
      if (!active) return;
      if (error) setError(message(error));
      else { latest.current = data as Snapshot; setSnapshot(data as Snapshot); }
    }, (error: unknown) => { if (active) setError(message(error)); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function persist(next: Snapshot) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setDirty(true); setError("");
    try {
      const { data, error } = await supabase!.rpc("save_cookbook", {
        expected_revision: next.revision, recipes: next.recipes, meals: next.meals,
      });
      if (error) throw error;
      latest.current = { ...next, revision: data as number };
      setSnapshot(latest.current); setDirty(false);
    } catch (error) { setError(message(error)); }
    finally { pending.current = false; setBusy(false); }
  }
  function change<K extends "recipes" | "meals">(key: K, update: SetStateAction<Snapshot[K]>) {
    if (!latest.current || pending.current || dirty) return;
    const value = typeof update === "function" ? update(latest.current[key]) : update;
    const next = { ...latest.current, [key]: value };
    latest.current = next; setSnapshot(next); void persist(next);
  }
  return <>
    <div className="connection-bar">
      <span>{email}</span>
      <span role="status">{busy ? "Saving…" : dirty ? "Changes haven’t saved" : snapshot ? "Saved to Supabase" : "Connecting…"}</span>
      <button className="text-button" disabled={busy || dirty} onClick={async () => {
        setAccountError("");
        try { const { error } = await supabase!.auth.signOut(); if (error) throw error; }
        catch (error) { setAccountError(message(error)); }
      }}>Sign out</button>
    </div>
    {accountError && <p className="storage-warning" role="alert">{accountError}</p>}
    {error && <div className="storage-warning" role="alert">
      <p>{snapshot ? "Your changes are still on this page and haven’t been saved. " : "Couldn’t load your cookbook. "}{error}</p>
      {!snapshot && <p>If this is your first connection, run the SQL script in supabase/migrations in your project’s SQL Editor.</p>}
      {snapshot && <button className="text-button" disabled={busy} onClick={() => void persist(latest.current!)}>Retry save</button>}
      <button className="text-button" onClick={() => {
        if (!dirty || window.confirm("Discard unsaved changes and load the saved cookbook?")) window.location.reload();
      }}>{snapshot ? "Reload saved cookbook" : "Retry connection"}</button>
    </div>}
    {snapshot ? <fieldset className="cookbook-controls" disabled={busy || dirty} aria-busy={busy}>
      {render({ recipes: snapshot.recipes, meals: snapshot.meals,
        setRecipes: (update) => change("recipes", update), setMeals: (update) => change("meals", update) })}
    </fieldset> : !error && <p className="connection-card" role="status">Loading your cookbook…</p>}
  </>;
}
