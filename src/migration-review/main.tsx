import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Recipe } from "../data";
import { canApprove, exampleBatch, fullMigrationExport, parseBatch, safeImage, safeUrl, storageKey } from "./model";
import type { Batch, ReviewItem, Source } from "./model";
import "./review.css";

function download(batch: Batch, suffix: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(batch, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = `recipe-review-${suffix}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function readStored() {
  try {
    const value = localStorage.getItem(storageKey);
    return { batch: value ? parseBatch(JSON.parse(value)) : null, error: "" };
  } catch { return { batch: null, error: "Couldn’t restore the saved review. Load a downloaded backup to recover it. Your cookbook is unaffected." }; }
}
type PreparedBatch = { id: string; title: string; count: number; url: string };

function App() {
  const [initial] = useState(readStored);
  const [batch, setBatch] = useState<Batch | null>(initial.batch);
  const [error, setError] = useState(initial.error);
  const [saveError, setSaveError] = useState("");
  const [selected, setSelected] = useState(initial.batch?.items[0]?.id || "");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] = useState<PreparedBatch[]>([]);
  const [preparedId, setPreparedId] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/outputs/recipe-migration/batches/index.json");
        if (!response.ok) return;
        const entries = await response.json() as PreparedBatch[];
        if (!Array.isArray(entries) || !active) return;
        setPrepared(entries); setPreparedId(entries[0]?.id || "");
        if ((!initial.batch || initial.batch.demo) && entries[0]) {
          const first = await fetch(entries[0].url);
          if (!first.ok) throw new Error("Couldn’t load the prepared Menu batch.");
          const next = parseBatch(await first.json());
          if (active) {
            setBatch(current => !current || current.demo ? next : current);
            setSelected(next.items[0]?.id || "");
          }
        }
      } catch { if (active) setError("Couldn’t load prepared Menu batches. You can still load a downloaded review JSON."); }
    })();
    return () => { active = false; };
  }, [initial.batch]);
  useEffect(() => {
    if (!batch) return;
    try { localStorage.setItem(storageKey, JSON.stringify(batch)); setSaveError(""); }
    catch { setSaveError("Review progress couldn’t be saved in this browser. Download a backup before leaving. Large screenshots can fill browser storage."); }
  }, [batch]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    if (saveError) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveError]);
  const visible = batch?.items.filter(i => (filter === "all" || i.status === filter)
    && i.recipe.name.toLowerCase().includes(query.toLowerCase())) || [];
  const item = visible.find(i => i.id === selected) || visible[0];
  function replace(next: Batch) {
    if (batch && !window.confirm("Replace the current review batch? Download a backup first if you want to keep it.")) return;
    setBatch(next); setSelected(next.items[0]?.id || ""); setFilter("all"); setQuery(""); setError(""); setNotice("");
  }
  function update(next: ReviewItem, edited = false) {
    setBatch(current => current ? { ...current, items: current.items.map(i => i.id === next.id
      ? edited ? { ...next, status: next.status === "approved" ? "pending" : next.status, sourceChecked: false, chatApproved: false } : next : i) } : current);
    setNotice("");
  }
  function decide(status: ReviewItem["status"]) {
    if (!item || (status === "approved" && !canApprove(item))) return;
    update({ ...item, status });
    const next = visible.find(i => i.id !== item.id && i.status === "pending");
    if (next) setSelected(next.id);
    setNotice(status === "approved" ? "Approved for export. Nothing has been imported." : status === "later" ? "Left for later." : "Moved back to pending.");
  }
  return <div className="review-app">
    <header className="review-header">
      <div><span className="eyebrow">ONE-TIME MIGRATION TOOL</span><h1>Recipe review</h1>
        <p>Check the originals, edit the draft, then approve. Reviews stay in this browser.</p></div>
      <a href="/">Back to cookbook</a>
    </header>
    <div className="toolbar">
      <button onClick={() => input.current?.click()}>Load review JSON</button>
      <input ref={input} hidden type="file" accept="application/json,.json" aria-label="Load review JSON" onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file) return;
        try {
          if (file.size > 20 * 1024 * 1024) throw new Error("This batch exceeds 20 MB. Split it into smaller recipe batches.");
          replace(parseBatch(JSON.parse(await file.text())));
        } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t read this batch."); }
      }} />
      <button onClick={() => replace(exampleBatch())}>Try an example</button>
      <button disabled={!batch} onClick={() => batch && download(batch, "backup")}>Download backup</button>
      <button className="primary" disabled={!batch || batch.demo || !batch.items.some(i => i.status === "approved" && canApprove(i))}
        onClick={() => { if (batch) download({ ...batch, items: batch.items.filter(i => i.status === "approved" && canApprove(i)) }, "approved"); }}>
        Export approved ({batch?.items.filter(i => i.status === "approved").length || 0})
      </button>
    </div>
    {prepared.length > 0 && <div className="prepared-batches">
      <label>Prepared Menu batches<select value={preparedId} onChange={event => setPreparedId(event.target.value)}>
        {prepared.map(entry => <option key={entry.id} value={entry.id}>{entry.title} · {entry.count} items</option>)}
      </select></label>
      <button disabled={loading} onClick={async () => {
        const entry = prepared.find(entry => entry.id === preparedId);
        if (!entry) return;
        setLoading(true);
        try {
          const response = await fetch(entry.url);
          if (!response.ok) throw new Error("Couldn’t load this prepared batch.");
          replace(parseBatch(await response.json()));
        } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t load this batch."); }
        finally { setLoading(false); }
      }}>{loading ? "Loading…" : "Load prepared batch"}</button>
      <button className="primary" disabled={loading} onClick={async () => {
        setLoading(true);
        try {
          const batches = await Promise.all(prepared.map(async entry => {
            const response = await fetch(entry.url);
            if (!response.ok) throw new Error("Couldn’t load all prepared batches.");
            return parseBatch(await response.json());
          }));
          const merged = fullMigrationExport(batches, batch);
          download(merged, "full-approved-migration");
          setNotice(`Exported ${merged.items.length} approved dishes, including this browser’s current review edits. Items left for later are excluded. No database changes.`);
        } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t export the migration."); }
        finally { setLoading(false); }
      }}>Export full approved migration</button>
      <span className="muted">Download a backup before switching batches to keep your edits.</span>
    </div>}
    {error && <p className="alert" role="alert">{error}</p>}
    {saveError && <p className="alert" role="alert">{saveError}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {!batch ? <section className="welcome"><h2>Ready for the first batch.</h2>
      <p>Load extracted recipes and their source material as a review JSON file, or try an illustrative example.</p>
      <p>This tool doesn’t fetch recipes or write to Supabase. Approved exports will feed the separate import script.</p>
    </section> : <>
      <div className="batch-heading"><h2>{batch.title}</h2><span>{batch.items.length} recipes · {saveError ? "Backup needed" : "Progress saved locally"}</span></div>
      {batch.demo && <p className="demo-note">Example only · This is mock content, not your spreadsheet. Approved export is disabled for this batch.</p>}
      <div className="review-layout">
        <aside className="queue" aria-label="Review queue">
          <label>Find a recipe<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <label>Show<select value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="all">All recipes</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="later">For later</option>
          </select></label>
          <div className="queue-items">{visible.map(i => <button className={i.id === item?.id ? "selected" : ""} key={i.id}
            onClick={() => { setSelected(i.id); setNotice(""); }}><strong>{i.recipe.name || "Untitled dish"}</strong>
            <span>{i.status === "later" ? "For later" : i.status} {i.questions.filter(q => !q.resolution.trim()).length > 0 ? "· has questions" : ""}</span></button>)}</div>
          {!visible.length && <p>No recipes in this view.</p>}
        </aside>
        {item && <section className="review-detail" aria-label={`Review ${item.recipe.name}`}>
          <div className="comparison">
            <section className="source-panel">
              <h2>Original sources</h2>
              <p className="muted">Open links in another tab to compare. Originals stay separate from your edits.</p>
              {item.sources.length ? item.sources.map(source => <SourceCard key={`${item.id}-${source.id}`} source={source} />) : <p>No source attached yet.</p>}
              <label className="file-button">Attach original screenshot<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={async event => {
                const file = event.target.files?.[0]; event.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 3 * 1024 * 1024) throw new Error("Use screenshots under 3 MB and review in small batches.");
                  const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Couldn’t read the screenshot.")); reader.readAsDataURL(file); });
                  if (!safeImage(image)) throw new Error("Use a PNG, JPEG, WebP, or GIF image.");
                  update({ ...item, sources: [...item.sources, { id: crypto.randomUUID(), label: file.name, image }] }, true);
                } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t attach the image."); }
              }} /></label>
            </section>
            <section className="draft-panel">
              <h2>Extracted recipe</h2><p className="muted">Keep missing information empty. Editing an approved recipe returns it to pending.</p>
              <RecipeFields recipe={item.recipe} change={recipe => update({ ...item, recipe }, true)} />
            </section>
          </div>
          <section className="review-decision"><h2>Review questions</h2>
            {item.questions.length ? item.questions.map(q => <label key={q.id} className="question">{q.text}
              <textarea aria-label={`Resolution: ${q.text}`} placeholder="Record what you confirmed, or explain what should remain unknown."
                value={q.resolution} onChange={event => update({ ...item, questions: item.questions.map(current => current.id === q.id ? { ...q, resolution: event.target.value } : current) }, true)} />
            </label>) : <p>No extraction questions flagged. Still check the original.</p>}
            {!item.recipe.steps.length && <p className="incomplete">No instructions. You can approve this as an incomplete recipe.</p>}
            <label className="source-check"><input type="checkbox" checked={item.sourceChecked}
              onChange={event => update({ ...item, sourceChecked: event.target.checked, chatApproved: false, status: item.status === "approved" ? "pending" : item.status })} />
              I checked the source material and recorded any uncertainties above.</label>
            <p className="muted">{item.status === "approved" ? item.chatApproved ? "Approved as-is in chat. Open questions are retained for reference." : "Approved for export." : "Approval needs a dish name, source material, resolved questions, and the source check."}</p>
            <div className="decision-actions"><button className="primary" disabled={!canApprove(item) || item.status === "approved"} onClick={() => decide("approved")}>Approve recipe</button>
              <button onClick={() => decide("later")}>Leave for later</button>
              {item.status !== "pending" && <button onClick={() => decide("pending")}>Back to pending</button>}
            </div>
          </section>
        </section>}
      </div>
    </>}
    <footer>Temporary review tool · no cookbook or database changes · download a backup before switching browsers.</footer>
  </div>;
}
function SourceCard({ source }: { source: Source }) {
  const [failed, setFailed] = useState(false);
  return <article className="source-card"><h3>{source.label}</h3>
    {source.url && safeUrl(source.url) && <a className="source-link" href={source.url} target="_blank" rel="noopener noreferrer">Open linked recipe ↗<span>{source.url}</span></a>}
    {source.image && safeImage(source.image) && (failed ? <p role="alert">This screenshot couldn’t be displayed. Check the original file.</p> :
      <a href={source.image} download={`${source.id}.${source.image.split(";")[0].split("/")[1]}`}><img src={source.image} alt={source.label} onError={() => setFailed(true)} /><span>Download original image</span></a>)}
    {source.text && <pre>{source.text}</pre>}
  </article>;
}
function RecipeFields({ recipe, change }: { recipe: Recipe; change: (next: Recipe) => void }) {
  function field<K extends keyof Recipe>(key: K, value: Recipe[K]) { change({ ...recipe, [key]: value }); }
  return <div className="recipe-fields">
    <label>Dish name<input value={recipe.name} onChange={e => field("name", e.target.value)} /></label>
    <div className="field-row"><label>Category<input value={recipe.category} onChange={e => field("category", e.target.value)} /></label>
      <label>Cuisine{recipe.cuisineInferred && <span className="muted">Inferred · editable</span>}<input value={recipe.cuisine} onChange={e => change({ ...recipe, cuisine: e.target.value, cuisineInferred: false })} /></label></div>
    <label>Original source URL<input type="url" value={recipe.originalSource || ""}
      placeholder="https://… (recipe website or source sheet tab)" onChange={e => field("originalSource", e.target.value)} /></label>
    {recipe.originalSource && !safeUrl(recipe.originalSource) && <p role="alert">Use a complete http:// or https:// source URL before approving.</p>}
    <label>Description<textarea value={recipe.description} onChange={e => field("description", e.target.value)} /></label>
    <div className="field-row"><label>Servings<input value={recipe.servings} onChange={e => field("servings", e.target.value)} /></label>
      <label>Minutes (0 if unknown)<input type="number" min="0" value={recipe.time} onChange={e => field("time", Number.isFinite(Number(e.target.value)) ? Math.max(0, Number(e.target.value)) : 0)} /></label></div>
    <h3>Ingredients</h3>
    {recipe.ingredients.map((group, index) => <div className="ingredient-editor" key={index}>
      <label>Group {index + 1}<input value={group.name} onChange={e => field("ingredients", recipe.ingredients.map((g, i) => i === index ? { ...g, name: e.target.value } : g))} /></label>
      <label>Ingredients · one per line<textarea rows={5} value={group.items.join("\n")} onChange={e => field("ingredients", recipe.ingredients.map((g, i) => i === index ? { ...g, items: e.target.value.split("\n") } : g))} /></label>
      <button onClick={() => field("ingredients", recipe.ingredients.filter((_, i) => i !== index))}>Remove group {index + 1}</button>
    </div>)}
    <button onClick={() => field("ingredients", [...recipe.ingredients, { name: "", items: [] }])}>Add ingredient group</button>
    <h3>Instructions</h3>
    {recipe.steps.map((step, index) => <div className="step-editor" key={index}>
      <label>Step {index + 1} title<input value={step.title} onChange={e => field("steps", recipe.steps.map((s, i) => i === index ? { ...s, title: e.target.value } : s))} /></label>
      <label>Step {index + 1} instructions<textarea rows={4} value={step.text} onChange={e => field("steps", recipe.steps.map((s, i) => i === index ? { ...s, text: e.target.value } : s))} /></label>
      <button onClick={() => field("steps", recipe.steps.filter((_, i) => i !== index))}>Remove step {index + 1}</button>
    </div>)}
    <button onClick={() => field("steps", [...recipe.steps, { title: "", text: "" }])}>Add step</button>
    <label>Personal notes<textarea rows={3} value={recipe.note} onChange={e => field("note", e.target.value)} /></label>
  </div>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
