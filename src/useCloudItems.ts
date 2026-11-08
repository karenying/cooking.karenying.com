import { useContext, useEffect, useRef, useState } from "react";
import type { SetStateAction } from "react";
import { WriteSafety } from "./AuthGate";
import { supabase } from "./supabase";
import { applyOverlay, makeOverlay } from "./calendar-catalogue";
import type { Overlay } from "./calendar-catalogue";
export type CloudChange = { table: string; id: string; expected_updated_at: string | null; data: unknown };
type Config<T> = { table: string; columns: string; decode: (row: any) => T; encode: (item: T) => unknown; key: string; initial?: () => Overlay<T> };
function read<T>(key: string, fallback: () => Overlay<T>): Overlay<T> {
  try { return JSON.parse(localStorage.getItem(key) || "null") || fallback(); } catch { return fallback(); }
}
export function useCloudItems<T extends { id: string }>(config: Config<T>) {
  const safety = useContext(WriteSafety);
  const [remote, setRemote] = useState<T[]>([]);
  const versions = useRef<Record<string, string>>({});
  const [overlay, setOverlay] = useState<Overlay<T>>(() => read(config.key, config.initial || (() => ({ upserts: {}, deleted: [] }))));
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const failed = useRef<CloudChange[] | null>(null);
  const committedIds = useRef<Set<string> | null>(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [storageFailed, setStorageFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const active = useRef(true);
  async function load(signal?: AbortSignal) {
    const rows: any[] = [];
    if (!supabase) throw new Error("Supabase is not configured.");
    for (let offset = 0; ; offset += 500) {
      let query = supabase.from(config.table).select(config.columns + ",updated_at").order("id").range(offset, offset + 499);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      rows.push(...data!); if (data!.length < 500) break;
    }
    if (!active.current || signal?.aborted) return;
    versions.current = Object.fromEntries(rows.map(r => [r.id, r.updated_at]));
    setRemote(rows.map(config.decode));
  }
  useEffect(() => {
    active.current = true;
    const controller = new AbortController(); setLoading(true); setError("");
    void load(controller.signal).catch(error => { if (!controller.signal.aborted) setError(error.message || "Couldn’t load shared data."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { active.current = false; controller.abort(); };
  }, [attempt]);
  useEffect(() => {
    try { localStorage.setItem(config.key, JSON.stringify(overlay)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  }, [overlay]);
  const items = applyOverlay(remote, overlay);
  const current = useRef(items); current.current = items;
  async function save(changes: CloudChange[]) {
    if (locked.current) return;
    locked.current = true; safety.begin(); setPending(true); setSaveError(""); failed.current = changes;
    try {
      const { error } = await supabase!.rpc("save_cookbook_changes", { changes });
      if (error) throw error;
      // A failed reload after commit must not repeat the write with stale versions.
      failed.current = null;
      committedIds.current = new Set(changes.map(c => c.id));
      await load();
      if (!active.current) return;
      const ids = committedIds.current!;
      committedIds.current = null;
      setOverlay(c => ({ upserts: Object.fromEntries(Object.entries(c.upserts).filter(([id]) => !ids.has(id))), deleted: c.deleted.filter(id => !ids.has(id)) }));
    } catch (error) { if (active.current) setSaveError((error as {message?: string}).message || "Couldn’t save changes."); }
    finally { locked.current = false; safety.end(); if (active.current) setPending(false); }
  }
  function setItems(update: SetStateAction<T[]>) {
    if (locked.current || loading || failed.current) return;
    const before = current.current;
    const next = typeof update === "function" ? update(before) : update;
    const a = new Map(before.map(i => [i.id, i])); const b = new Map(next.map(i => [i.id, i]));
    const changed = [...new Set([...a.keys(), ...b.keys()])].filter(id => JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)));
    if (!changed.length) return;
    const changes = changed.map(id => ({ table: config.table, id, expected_updated_at: versions.current[id] || null, data: b.has(id) ? config.encode(b.get(id)!) : null }));
    setOverlay(makeOverlay(remote, next)); current.current = next;
    void save(changes);
  }
  async function retrySave() {
    if (failed.current) await save(failed.current);
    else { try {
      await load();
      const ids = committedIds.current;
      if (ids) setOverlay(c => ({ upserts: Object.fromEntries(Object.entries(c.upserts).filter(([id]) => !ids.has(id))), deleted: c.deleted.filter(id => !ids.has(id)) }));
      committedIds.current = null; setSaveError("");
    } catch { setSaveError("Couldn’t reload saved data. Please try again."); } }
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    if (pending || saveError) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending, saveError]);
  function discardFailed() {
    if (!window.confirm("Discard unsaved edits in this collection and reload the shared data?")) return;
    failed.current = null; setSaveError(""); setOverlay({ upserts: {}, deleted: [] }); setAttempt(a => a + 1);
  }
  function syncDrafts() {
    if (loading || locked.current) return;
    const changes = [
      ...Object.values(overlay.upserts).map(item => ({ table: config.table, id: item.id, expected_updated_at: versions.current[item.id] || null, data: config.encode(item) })),
      ...overlay.deleted.filter(id => versions.current[id]).map(id => ({ table: config.table, id, expected_updated_at: versions.current[id], data: null })),
    ];
    if (changes.length) void save(changes);
  }
  return { items, setItems, syncDrafts, unsyncedCount: Object.keys(overlay.upserts).length + overlay.deleted.length, loading, error, saveError, pending, storageFailed, retry: () => setAttempt(a => a + 1), retrySave, discardFailed };
}
