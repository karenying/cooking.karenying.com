import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import type { Recipe } from "./data";

export function RecipeEditDialog({ recipe, save, close }: {
  recipe: Recipe;
  save: (recipe: Recipe) => Promise<void>;
  close: () => void;
}) {
  const [draft, setDraft] = useState<Recipe>(() => structuredClone(recipe));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => previous?.focus();
  }, []);
  function dismiss() {
    if (saving.current) return;
    if (JSON.stringify(recipe) !== JSON.stringify(draft) && !window.confirm("Discard your recipe edits?")) return;
    close();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current || !draft.name.trim()) return;
    saving.current = true; setBusy(true); setError("");
    try {
      await save({
        ...draft,
        name: draft.name.trim(),
        cuisine: draft.cuisine.trim() || "Other",
        category: draft.category.trim() || "Other",
        ingredients: draft.ingredients.map(group => ({ ...group, items: group.items.filter(item => item.trim()) })),
        steps: draft.steps.filter(step => step.title.trim() || step.text.trim()),
      });
      close();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn’t save the recipe. Your edits are still here.");
    } finally { saving.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="modal recipe-edit-dialog" aria-labelledby="edit-recipe-title"
    onCancel={event => { event.preventDefault(); dismiss(); }}
    onClick={event => { if (event.target === event.currentTarget) dismiss(); }}>
    <div className="modal-head">
      <h2 id="edit-recipe-title">Edit recipe</h2>
      <button className="icon-button" aria-label="Close editor" disabled={busy} onClick={dismiss}><X size={21} /></button>
    </div>
    <form className="editor-form" onSubmit={submit}>
      <fieldset disabled={busy} className="recipe-edit-fields">
        <label>Dish name<input autoFocus required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <div className="form-row">
          <label>Category<input required value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} /></label>
          <label>Cuisine<input value={draft.cuisine} onChange={e => setDraft({ ...draft, cuisine: e.target.value, cuisineInferred: false })} /></label>
        </div>
        <h3>Ingredients</h3>
        {draft.ingredients.map((group, index) => <div className="recipe-edit-group" key={index}>
          <label>Group name<input value={group.name} onChange={e => setDraft({ ...draft, ingredients: draft.ingredients.map((g, i) => i === index ? { ...g, name: e.target.value } : g) })} /></label>
          <label>Ingredients <span className="muted">(one per line)</span>
            <textarea aria-label={`Ingredients for group ${index + 1}`} rows={Math.max(3, Math.min(group.items.length + 1, 10))} value={group.items.join("\n")}
              onChange={e => setDraft({ ...draft, ingredients: draft.ingredients.map((g, i) => i === index ? { ...g, items: e.target.value.split("\n") } : g) })} />
          </label>
          <button type="button" className="text-button" aria-label={`Remove ingredient group ${index + 1}`} onClick={() => setDraft({ ...draft, ingredients: draft.ingredients.filter((_, i) => i !== index) })}>Remove group</button>
        </div>)}
        <button type="button" className="secondary-button" onClick={() => setDraft({ ...draft, ingredients: [...draft.ingredients, { name: "", items: [] }] })}>Add ingredient group</button>
        <h3>Instructions</h3>
        {draft.steps.map((step, index) => <div className="recipe-edit-group" key={index}>
          <label>Step {index + 1} title<input value={step.title} onChange={e => setDraft({ ...draft, steps: draft.steps.map((s, i) => i === index ? { ...s, title: e.target.value } : s) })} /></label>
          <label>Step {index + 1} instructions<textarea aria-label={`Step ${index + 1} instructions`} rows={3} value={step.text} onChange={e => setDraft({ ...draft, steps: draft.steps.map((s, i) => i === index ? { ...s, text: e.target.value } : s) })} /></label>
          <button type="button" className="text-button" aria-label={`Remove step ${index + 1}`} onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })}>Remove step</button>
        </div>)}
        <button type="button" className="secondary-button" onClick={() => setDraft({ ...draft, steps: [...draft.steps, { title: "", text: "" }] })}>Add step</button>
        <label>Original source<input type="url" value={draft.originalSource || ""} onChange={e => setDraft({ ...draft, originalSource: e.target.value })} placeholder="https://…" /></label>
        <label>Notes<textarea aria-label="Notes" rows={3} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} /></label>
      </fieldset>
      {error && <p className="storage-warning" role="alert">{error}</p>}
      <div className="modal-footer">
        <button type="button" className="secondary-button" disabled={busy} onClick={dismiss}>Cancel</button>
        <button className="primary-button" disabled={busy || !draft.name.trim()}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  </dialog>;
}
