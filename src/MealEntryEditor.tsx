import { useId, useLayoutEffect, useRef, useState } from "react";
import type { Meal, MealPart, Recipe } from "./data";
import { findRecipeCompletion, mealParts } from "./meal-content";

function readParts(root: Node): MealPart[] {
  const parts: MealPart[] = [];
  function text(value: string) {
    const last = parts.at(-1);
    if (last?.type === "text") last.text += value;
    else if (value) parts.push({ type: "text", text: value });
  }
  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) { text(node.textContent || ""); return; }
    if (node instanceof HTMLElement) {
      if (node.dataset.recipeId) { parts.push({ type: "recipe", id: node.dataset.recipeId }); return; }
      if (node.tagName === "BR") { text("\n"); return; }
      if ((node.tagName === "DIV" || node.tagName === "P") && parts.length) {
        const last = parts.at(-1);
        if (last?.type !== "text" || !last.text.endsWith("\n")) text("\n");
      }
    }
    node.childNodes.forEach(visit);
  }
  root.childNodes.forEach(visit);
  return parts;
}

export function MealEntryEditor({ value, recipes, label, autoFocus, onChange }: {
  value: Meal;
  recipes: Recipe[];
  label: string;
  autoFocus: boolean;
  onChange: (change: Partial<Meal>) => void;
}) {
  const id = useId();
  const editor = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const emitted = useRef("");
  const replacement = useRef<Range | null>(null);
  const composing = useRef(false);
  const [matches, setMatches] = useState<Recipe[]>([]);
  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, matches.length - 1);
  const expanded = matches.length > 0;

  function makeChip(recipeId: string) {
    const chip = document.createElement("span");
    const name = recipes.find((recipe) => recipe.id === recipeId)?.name || "Recipe";
    chip.contentEditable = "false"; chip.dataset.recipeId = recipeId; chip.className = "meal-recipe-chip";
    const title = document.createElement("span"); title.textContent = name;
    const remove = document.createElement("button"); remove.type = "button"; remove.dataset.removeRecipe = "true";
    remove.setAttribute("aria-label", `Remove ${name} from ${label}`);
    chip.append(title, remove);
    return chip;
  }
  useLayoutEffect(() => {
    const root = editor.current;
    const parts = mealParts(value);
    const serialized = JSON.stringify(parts);
    if (!root || serialized === emitted.current) return;
    if (autoFocus) root.setAttribute("autofocus", "");
    root.replaceChildren(...parts.map((part) => part.type === "recipe" ? makeChip(part.id) : document.createTextNode(part.text)));
    emitted.current = serialized;
    if (autoFocus) {
      root.focus();
      const range = document.createRange(); range.selectNodeContents(root); range.collapse(false);
      window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(range);
    }
  });
  useLayoutEffect(() => {
    const container = list.current;
    const option = container?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!container || !option) return;
    if (option.offsetTop < container.scrollTop) container.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > container.scrollTop + container.clientHeight) {
      container.scrollTop = option.offsetTop + option.offsetHeight - container.clientHeight;
    }
  }, [activeIndex, matches]);
  function emit(setting?: Meal["setting"]) {
    if (!editor.current) return;
    const content = readParts(editor.current);
    emitted.current = JSON.stringify(content);
    onChange({ content, ...(setting ? { setting } : {}), dishes: [...new Set(content.flatMap((part) => part.type === "recipe" ? [part.id] : []))],
      note: content.flatMap((part) => part.type === "text" ? [part.text] : []).join("").trim() });
  }
  function complete() {
    if (composing.current) return;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || !range.collapsed || !editor.current?.contains(range.startContainer) || range.startContainer.nodeType !== Node.TEXT_NODE) {
      setMatches([]); replacement.current = null; return;
    }
    const before = (range.startContainer.textContent || "").slice(0, range.startOffset);
    const selected = readParts(editor.current).flatMap((part) => part.type === "recipe" ? [part.id] : []);
    const completion = findRecipeCompletion(before, recipes, selected);
    if (!completion) { setMatches([]); replacement.current = null; return; }
    const replace = range.cloneRange(); replace.setStart(range.startContainer, completion.start);
    replacement.current = replace; setMatches(completion.matches); setActive(0);
  }
  function choose(recipe: Recipe) {
    const range = replacement.current;
    if (!range || !editor.current?.contains(range.startContainer)) return;
    range.deleteContents();
    const chip = makeChip(recipe.id); range.insertNode(chip);
    const next = chip.nextSibling;
    const space = next instanceof Text && /^\s/.test(next.data) ? next : document.createTextNode(" ");
    if (space !== next) chip.after(space);
    range.setStart(space, 1); range.collapse(true);
    editor.current.focus();
    window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(range);
    emit("home"); setMatches([]); replacement.current = null;
  }
  return <div className="meal-entry-editor" data-suggestions-placement={value.type === "Dinner" ? "above" : "below"} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setMatches([]); replacement.current = null; }
  }}>
    <div ref={editor} className="meal-entry-input" contentEditable suppressContentEditableWarning
      role="textbox" aria-label={label} aria-multiline="true" aria-autocomplete="list"
      aria-controls={expanded ? `${id}-list` : undefined}
      aria-activedescendant={expanded ? `${id}-option-${activeIndex}` : undefined}
      aria-describedby={`${id}-hint`} data-placeholder="Type a meal or start a recipe name…"
      onInput={() => { if (!composing.current) { emit(); complete(); } }}
      onCompositionStart={() => { composing.current = true; setMatches([]); }}
      onCompositionEnd={() => { composing.current = false; emit(); complete(); }}
      onMouseUp={complete}
      onKeyUp={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) complete(); }}
      onClick={(event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-remove-recipe]");
        const chip = button?.closest<HTMLElement>("[data-recipe-id]");
        if (!chip || !editor.current) return;
        event.preventDefault();
        const range = document.createRange(); range.setStartBefore(chip); range.collapse(true);
        chip.remove(); editor.current.focus();
        window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(range);
        emit(); setMatches([]);
      }}
      onPaste={(event) => {
        event.preventDefault();
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!editor.current?.contains(range.startContainer)) return;
        range.deleteContents();
        const text = document.createTextNode(event.clipboardData.getData("text/plain"));
        range.insertNode(text); range.setStartAfter(text); range.collapse(true);
        selection.removeAllRanges(); selection.addRange(range); emit(); complete();
      }}
      onKeyDown={(event) => {
        if (event.target !== editor.current || event.nativeEvent.isComposing) return;
        if (expanded && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault(); setActive((activeIndex + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
        } else if (expanded && (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey))) {
          event.preventDefault(); choose(matches[activeIndex]);
        } else if (expanded && event.key === "Escape") {
          event.preventDefault(); event.stopPropagation(); setMatches([]); replacement.current = null;
        }
      }} />
    {expanded && <ul ref={list} id={`${id}-list`} className="recipe-picker-results" role="listbox" aria-label={`Recipe suggestions for ${label}`}>
      {matches.map((recipe, index) => <li key={recipe.id} role="presentation">
        <button type="button" role="option" tabIndex={-1} id={`${id}-option-${index}`} aria-selected={activeIndex === index}
          onMouseDown={(event) => event.preventDefault()} onClick={() => choose(recipe)}>
          <span>{recipe.name}</span><small>{recipe.cuisine}{recipe.time ? ` · ${recipe.time} min` : ""}</small>
        </button>
      </li>)}
    </ul>}
    <p id={`${id}-hint`} className="sr-only" role="status" aria-live="polite">
      {expanded ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}. Select or press Enter / Tab to add a recipe.` : ""}
    </p>
  </div>;
}
