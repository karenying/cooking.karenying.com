import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BarChart3,
  CalendarDays,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  Leaf,
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  dateKey,
  parseDate,
  recipes as seedRecipes,
  TODAY,
} from "./data";
import type { AwayEvent, Meal, Recipe } from "./data";
import { awayOnDate, mealSettingClass, mealSettingLabel, validDateRange } from "./calendar";
import type { CookbookStore } from "./Connection";
import { AuthGate, SignOutButton } from "./AuthGate";
import { useRecipeCatalogue } from "./useRecipeCatalogue";
import { useCalendarCatalogue } from "./useCalendarCatalogue";
import { calendarRecipeCatalogue, legacyRecipeIds } from "./recipe-catalogue";
import { MealEntryEditor } from "./MealEntryEditor";
import { RecipeEditDialog } from "./RecipeEditDialog";
import { AnalyticsPage } from "./AnalyticsPage";
import { cookingAnalytics } from "./analytics";
import { recipeLabelKey, uniqueRecipeLabels, existingRecipeLabel } from "./recipe-labels";

function go(path: string) {
  window.location.hash = path;
}
function useRoute() {
  const [route, setRoute] = useState(
    window.location.hash.slice(1) || "/calendar",
  );
  useEffect(() => {
    const update = () => {
      setRoute(window.location.hash.slice(1) || "/calendar");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
const prettyDate = (key: string) =>
  parseDate(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

function Modal({
  title,
  children,
  close,
  className = "",
}: {
  className?: string;
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      onCancel={close}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
      }}
    >
      <div className="modal-head">
        <div>
          
          <h2>{title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function FoodImage({
  recipe,
  className = "",
}: {
  recipe: Recipe;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`food-image ${className} ${failed || !recipe.image ? "image-fallback" : ""}`}
    >
      {recipe.image && !failed ? (
        <img
          src={recipe.image}
          alt={recipe.name}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <CookingPot size={50} strokeWidth={1} />
      )}
    </div>
  );
}

function DayEditor({ date: initialDate, meals, recipes, initialDish, save, close, awayEvents, editAway, addAway }: {
  awayEvents: AwayEvent[];
  editAway: (event: AwayEvent) => void;
  addAway: (date: string) => void;
  date: string;
  meals: Meal[];
  recipes: Recipe[];
  initialDish?: string;
  save: (date: string, meals: Meal[]) => void;
  close: () => void;
}) {
  const [date, setDate] = useState(initialDate);
  function entriesForDate(date: string): Meal[] {
    const existing = meals.filter((meal) => meal.date === date);
    return (["Lunch", "Dinner"] as const).flatMap((type) => {
      const matches = existing.filter((meal) => meal.type === type);
      const rows = matches.length ? matches : [{ id: crypto.randomUUID(), date, type, dishes: [], note: "" }];
      return rows.map((row, i) => ({ ...row, setting: row.setting || "home",
        ...(initialDish && date === initialDate && type === "Dinner" && i === 0 ? { dishes: [...new Set([...row.dishes, initialDish])] } : {}) }));
    });
  }
  const [drafts, setDrafts] = useState<Record<string, Meal[]>>(() => ({ [initialDate]: entriesForDate(initialDate) }));
  const entries = drafts[date];
  function update(id: string, change: Partial<Meal>) {
    setDrafts(current => ({ ...current, [date]: current[date].map(entry => entry.id === id ? { ...entry, ...change } : entry) }));
  }
  function changeDate(next: string) {
    if (!validDateRange(next, next)) return;
    setDrafts(current => current[next] ? current : { ...current, [next]: entriesForDate(next) });
    setDate(next);
  }
  const hasExistingMeals = meals.some(meal => meal.date === date);
  return (
    <Modal title={hasExistingMeals ? "Edit day" : "Add day"} close={close} className="day-editor-modal">
      <form className="editor-form" onSubmit={(event) => {
        event.preventDefault();
        save(date, entries.map((entry) => ({ ...entry, note: entry.note.trim() }))
          .filter((entry) => entry.note || entry.dishes.length || entry.setting === "out" || entry.setting === "figma"));
        close();
      }}>
        <div className="day-editor-body">
        <label className="day-date-field">Date
          <input type="date" required value={date} onChange={event => changeDate(event.target.value)} />
        </label>
        {hasExistingMeals && <p className="day-date-help">This date already has meals. Saving updates this day.</p>}
        <div className="day-away-section">
          {awayOnDate(awayEvents, date).length > 0 && <p className="section-help">You’re away on this date. Meal entries below are optional.</p>}
          {awayOnDate(awayEvents, date).map((event) => (
            <button key={event.id} type="button" className="away-summary" onClick={() => editAway(event)}>
              Away · {event.title} <span>Edit event</span>
            </button>
          ))}
          <button type="button" className="text-button" onClick={() => addAway(date)}>Add away / vacation event</button>
        </div>
        {entries.map((entry, index) => (
          <section className="day-editor-meal" key={entry.id}>
            <div className="meal-editor-heading">
              <span>{entry.type}</span>
              <select aria-label={`${entry.type} setting ${index + 1}`} value={entry.setting || "home"}
                onChange={(event) => update(entry.id, { setting: event.target.value as Meal["setting"] })}>
                <option value="home">At home</option>
                <option value="out">Eating out</option>
                <option value="figma">Figma</option>
              </select>
            </div>
            <MealEntryEditor value={entry} recipes={recipes} label={`${entry.type} entry ${index + 1}`}
              autoFocus={index === 0} onChange={(change) => update(entry.id, change)} />
          </section>
        ))}
        </div>
        <div className="modal-footer">
          <button type="button" className="text-button" onClick={close}>Cancel</button>
          <button className="primary-button">Save day</button>
        </div>
      </form>
    </Modal>
  );
}

function AwayEditor({ initialDate, event, save, remove, close }: {
  initialDate: string;
  event: AwayEvent | null;
  save: (event: AwayEvent) => void;
  remove: (event: AwayEvent) => void;
  close: () => void;
}) {
  const [title, setTitle] = useState(event?.title || "");
  const [startDate, setStartDate] = useState(event?.startDate || initialDate);
  const [endDate, setEndDate] = useState(event?.endDate || initialDate);
  const [note, setNote] = useState(event?.note || "");
  const [error, setError] = useState("");
  return <Modal title={event ? "Edit away event" : "Add away event"} close={close}>
    <form className="editor-form" onSubmit={(e) => {
      e.preventDefault();
      if (!validDateRange(startDate, endDate)) { setError("Choose valid dates, with the end on or after the start."); return; }
      save({ id: event?.id || crypto.randomUUID(), title: title.trim() || "Away", startDate, endDate, note: note.trim() });
      close();
    }}>
      <p className="section-help">Mark a vacation or time away. Meals on these dates stay in your calendar.</p>
      <label>Event name<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vacation in Japan" /></label>
      <div className="form-row away-dates">
        <label>Start date<input type="date" required value={startDate} onChange={(e) => { setStartDate(e.target.value); setError(""); }} /></label>
        <label>End date<input type="date" required min={startDate} value={endDate} onChange={(e) => { setEndDate(e.target.value); setError(""); }} /></label>
      </div>
      <p className="section-help">All-day event. Both the start and end dates are included.</p>
      <label>Notes (optional)<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <div className="modal-footer away-editor-footer">
        {event && <button type="button" className="text-button delete-event" onClick={() => { remove(event); close(); }}>Remove event</button>}
        <button type="button" className="text-button" onClick={close}>Cancel</button>
        <button className="primary-button">Save away event</button>
      </div>
    </form>
  </Modal>;
}

function AwaySummary({ event, edit }: { event: AwayEvent; edit: () => void }) {
  return <button className="away-summary" onClick={edit}>
    <strong>Away · {event.title}</strong>
    <span>{parseDate(event.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – {parseDate(event.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
    {event.note && <span>{event.note}</span>}
    <span className="away-edit-label">Edit event</span>
  </button>;
}

function RecipeEditor({
  save,
  close,
}: {
  save: (recipe: Recipe) => void;
  close: () => void;
}) {
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [category, setCategory] = useState("Chicken");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const id = crypto.randomUUID();
    save({
      id,
      name: name.trim(),
      cuisine: cuisine.trim() || "Other",
      category,
      description: "",
      image: "",
      time: 0,
      servings: "",
      favorite: false,
      ingredients: ingredients.trim()
        ? [
            {
              name: "Ingredients",
              items: ingredients.split("\n").filter((line) => line.trim()),
            },
          ]
        : [],
      steps: steps
        .split("\n")
        .filter((line) => line.trim())
        .map((text, i) => ({ title: `Step ${i + 1}`, text })),
      note: "",
    });
    close();
    go(`/recipes/${id}`);
  }
  return (
    <Modal title="Add to your cookbook" close={close}>
      <form onSubmit={submit} className="editor-form">
        <label>
          Dish name
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dish name"
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                "Chicken",
                "Beef & lamb",
                "Pork",
                "Seafood",
                "Pasta & noodles",
                "Rice",
                "Tofu & eggs",
                "Vegetables",
                "Soups & stews",
                "Dumplings",
                "Premade",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Cuisine
            <input
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="e.g. Chinese"
            />
          </label>
        </div>
        <label>
          Ingredients <span className="muted">(one per line)</span>
          <textarea
            rows={4}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="1 cup jasmine rice"
          />
        </label>
        <label>
          Steps <span className="muted">(one per line)</span>
          <textarea
            rows={4}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="You can add the recipe later, too."
          />
        </label>
        <div className="modal-footer">
          <button className="primary-button" disabled={!name.trim()}>
            <Plus size={17} />
            Add dish
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Calendar({
  meals,
  recipes,
  addMeal,
  editMeal,
  awayEvents,
  addAway,
  editAway,
}: {
  awayEvents: AwayEvent[];
  addAway: (date: string) => void;
  editAway: (event: AwayEvent) => void;
  meals: Meal[];
  recipes: Recipe[];
  addMeal: (date: string, dish?: string) => void;
  editMeal: (meal: Meal) => void;
}) {
  const [month, setMonth] = useState(() => {
    const date = parseDate(TODAY);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [selected, setSelected] = useState(TODAY);
  const [filter, setFilter] = useState("All meals");
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const cellCount = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
  const days = Array.from(
    { length: cellCount },
    (_, i) =>
      new Date(month.getFullYear(), month.getMonth(), i - first.getDay() + 1),
  );
  const visibleMeals = meals.filter(
    (m) => filter === "All meals" || m.type === filter,
  );
  const selectedMeals = visibleMeals
    .filter((m) => m.date === selected)
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "Lunch" ? -1 : 1));
  function moveMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelected(dateKey(next));
  }
  const hasMeals = meals.some((m) =>
    m.date.startsWith(dateKey(month).slice(0, 7)),
  );
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>
            Calendar
          </h1>
          
        </div>
        <div className="calendar-heading-actions">
        <button className="secondary-button" onClick={() => addAway(selected)}>Add away event</button>
        <button
          className="primary-button heading-action"
          onClick={() => addMeal(TODAY)}
        >
          <Plus size={18} />
          Add day
        </button>
        </div>
      </header>
      <section className="calendar-panel" aria-label="Meal calendar">
        <div className="calendar-toolbar">
          <div className="month-controls">
            <h2>
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="month-arrows">
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() => moveMonth(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              className="today-button"
              onClick={() => {
                const today = parseDate(TODAY);
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelected(TODAY);
              }}
            >
              Today
            </button>
          </div>
          <label className="calendar-filter">
            <SlidersHorizontal size={15} />
            <span className="sr-only">Filter calendar meals</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All meals</option>
              <option>Lunch</option>
              <option>Dinner</option>
            </select>
          </label>
        </div>
        <div
          className="calendar-grid"
          role="group"
          aria-label={month.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div className="weekday" key={day}>
              {day}
            </div>
          ))}
          {days.map((day) => {
            const key = dateKey(day);
            const inMonth = day.getMonth() === month.getMonth();
            const dayAwayEvents = awayOnDate(awayEvents, key);
            const entries = visibleMeals
              .filter((m) => m.date === key)
              .sort((a, b) =>
                a.type === b.type ? 0 : a.type === "Lunch" ? -1 : 1,
              );
            return (
              <div
                key={key}
                data-date={key}
                onClick={(event) => {
                  if (!(event.target as HTMLElement).closest("button, a")) { setSelected(key); addMeal(key); }
                }}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault(); setSelected(key); addMeal(key);
                  }
                }}
                tabIndex={0}
                aria-label={`Edit day ${prettyDate(key)}`}
                className={`calendar-day ${dayAwayEvents.length ? "is-away" : ""} ${!inMonth ? "outside-month" : ""} ${key === TODAY ? "is-today" : ""} ${selected === key ? "selected-day" : ""}`}
              >
                <div className="day-top">
                  <button
                    className="day-number"
                    aria-label={`${prettyDate(key)}${key === TODAY ? ", today" : ""}, ${entries.length} meals${dayAwayEvents.length ? ", away" : ""}`}
                    aria-pressed={selected === key}
                    onClick={() => setSelected(key)}
                  >
                    {day.getDate()}
                    <span className="today-label">
                      {key === TODAY && "Today"}
                    </span>
                  </button>
                  <button
                    className="cell-add"
                    aria-label={`Edit day ${prettyDate(key)}`}
                    onClick={() => addMeal(key)}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <div className="cell-away-events">
                  {dayAwayEvents.map((event) => <button key={event.id}
                    className={`away-calendar-event ${event.startDate === key || day.getDay() === 0 ? "away-start" : ""} ${event.endDate === key || day.getDay() === 6 ? "away-end" : ""}`}
                    aria-label={`Edit away event ${event.title}, ${prettyDate(event.startDate)} to ${prettyDate(event.endDate)}`}
                    onClick={() => { setSelected(key); editAway(event); }}>
                    <span className="away-desktop-title">Away · {event.title}</span><span className="away-mobile-title">Away</span>
                  </button>)}
                </div>
                <div className="cell-meals">
                  {entries.map((meal) => (
                    <div
                      className={`cell-meal ${meal.dishes.length ? "home-meal" : "note-meal"} meal-${mealSettingClass(meal)}`}
                      key={meal.id}
                    >
                      <button
                        className="meal-label"
                        aria-label={`Edit ${meal.type.toLowerCase()} on ${prettyDate(key)}`}
                        onClick={() => editMeal(meal)}
                      >
                        {meal.type}
                      </button>
                      <span className="meal-setting">{mealSettingLabel(meal)}</span>
                      {meal.dishes.map((id) => {
                        const dish = recipes.find((r) => r.id === id);
                        return (
                          dish && (
                            <a href={`#/recipes/${id}`} key={id}>
                              {dish.name}
                            </a>
                          )
                        );
                      })}
                      {meal.note && (
                        <button
                          className="cell-note"
                          onClick={() => editMeal(meal)}
                        >
                          {meal.note}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className="mobile-day-target"
                  aria-label={`Show meals for ${prettyDate(key)}`}
                  onClick={() => setSelected(key)}
                  tabIndex={-1}
                />
                <div className="day-dots" aria-hidden="true">
                  {entries.slice(0, 3).map((meal) => (
                    <i
                      key={meal.id}
                      className={
                        `setting-dot ${mealSettingClass(meal)}`
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="calendar-legend">
          <span><i className="setting-dot at-home" />At home / cookbook</span>
          <span><i className="setting-dot eating-out" />Eating out</span>
          <span><i className="setting-dot figma" />Figma</span>
          <span><i className="setting-dot away" />Away</span>
          <span className="calendar-hint">Select a meal or event to edit</span>
        </div>
      </section>
      <section className="mobile-day-detail" aria-label="Selected day meals">
        <div className="section-heading">
          <div>
            <h2>
              {parseDate(selected).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h2>
          </div>
          <button
            className="icon-button outlined"
            aria-label="Edit day on selected day"
            onClick={() => addMeal(selected)}
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="selected-away-events">
          {awayOnDate(awayEvents, selected).map((event) => <AwaySummary key={event.id} event={event} edit={() => editAway(event)} />)}
        </div>
        {selectedMeals.length ? (
          selectedMeals.map((meal) => (
            <article className={`mobile-meal meal-${mealSettingClass(meal)}`} key={meal.id}>
              <div className="mobile-meal-heading">
                <span className="eyebrow">{meal.type} · {mealSettingLabel(meal)}</span>
                <button className="text-button" onClick={() => editMeal(meal)}>
                  Edit
                </button>
              </div>
              {meal.dishes.map((id) => {
                const recipe = recipes.find((r) => r.id === id);
                return (
                  recipe && (
                    <a
                      className="mobile-dish-link"
                      href={`#/recipes/${id}`}
                      key={id}
                    >
                      <FoodImage recipe={recipe} />
                      <div>
                        <h3>{recipe.name}</h3>
                        <span>
                          {recipe.time ? `${recipe.time} min · ` : ""}
                          {recipe.cuisine}
                        </span>
                      </div>
                      <ChevronRight size={18} />
                    </a>
                  )
                );
              })}
              {meal.note && <p className="meal-note">{meal.note}</p>}
            </article>
          ))
        ) : (
          <div className="day-empty">
            <Leaf size={25} strokeWidth={1.3} />
            <p>{awayOnDate(awayEvents, selected).length ? "No meals added while away." : "No meals planned."}</p>
            <button className="text-button" onClick={() => addMeal(selected)}>
              Add day
            </button>
          </div>
        )}
      </section>
      {!hasMeals && !awayEvents.some((event) => event.startDate <= dateKey(last) && event.endDate >= dateKey(first)) && (
        <p className="month-empty">
          No meals recorded this month. Use + to add a meal.
        </p>
      )}
    </>
  );
}

function RecipeIndex({
  recipes,
  meals,
  awayEvents,
  addRecipe,
}: {
  recipes: Recipe[];
  meals: Meal[];
  awayEvents: AwayEvent[];
  addRecipe: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All dishes");
  const [cuisine, setCuisine] = useState("All cuisines");
  const [sort, setSort] = useState("Most popular");
  const popularity = useMemo(() => new Map(cookingAnalytics(
    meals.map(meal => ({ ...meal, dishes: meal.dishes.map(id => legacyRecipeIds[id] || id) })),
    awayEvents, recipes, "0001-01-01", TODAY,
  ).dishes.map(({ recipe, count }) => [recipe.id, count])), [meals, awayEvents, recipes]);
  const categories = uniqueRecipeLabels(recipes.map(r => r.category));
  const cuisines = uniqueRecipeLabels(recipes.map(r => r.cuisine)).sort();
  const filtered = recipes
    .filter(
      (r) =>
        `${r.name} ${r.cuisine} ${r.category} ${r.ingredients.flatMap((g) => g.items).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (category === "All dishes" || recipeLabelKey(r.category) === recipeLabelKey(category)) &&
        (cuisine === "All cuisines" || recipeLabelKey(r.cuisine) === recipeLabelKey(cuisine)),
    )
    .sort((a, b) =>
      sort === "Most popular"
        ? (popularity.get(b.id) || 0) - (popularity.get(a.id) || 0) || a.name.localeCompare(b.name)
        : sort === "Quickest"
          ? a.time - b.time
          : sort === "Z–A"
            ? b.name.localeCompare(a.name)
            : a.name.localeCompare(b.name),
    );
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>
            Recipes
          </h1>
          
        </div>
        <button className="primary-button heading-action" onClick={addRecipe}>
          <Plus size={18} />
          Add a recipe
        </button>
      </header>
      <div className="recipe-search-row">
        <div className="search-field large-search">
          <Search size={19} />
          <input
            aria-label="Search recipes"
            placeholder="Search recipes or ingredients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </button>
          )}
        </div>

      </div>
      <div className="category-tabs" aria-label="Recipe categories">
        {["All dishes", ...categories].map((c) => (
          <button
            className={recipeLabelKey(category) === recipeLabelKey(c) ? "active" : ""}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="recipe-results-bar">
        <p>
          {filtered.length} {filtered.length === 1 ? "recipe" : "recipes"}
          <span> in your collection</span>
        </p>
        <div>
          <label>
            <span className="sr-only">Cuisine</span>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
            >
              <option>All cuisines</option>
              {cuisines.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort recipes</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option>Most popular</option>
              <option>A–Z</option>
              <option>Z–A</option>
              <option>Quickest</option>
            </select>
          </label>
        </div>
      </div>
      <div className="recipe-list">
        {filtered.map((recipe) => (
          <article className="recipe-card" key={recipe.id}>
            <div className="recipe-card-body">
              <span className="eyebrow">
                {recipe.cuisine} <span className="tag-dot">·</span>{" "}
                {recipe.category}
              </span>
              <h2>
                <a href={`#/recipes/${recipe.id}`}>{recipe.name}</a>
              </h2>

            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <Search size={32} strokeWidth={1.2} />
          <h2>No recipes found</h2>
          <p>Try another search or clear your filters.</p>
          <button
            className="secondary-button"
            onClick={() => {
              setQuery("");
              setCategory("All dishes");
              setCuisine("All cuisines");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

    </>
  );
}

function RecipePage({
  recipe,
  meals,
  edit,
  editingDisabled,
}: {
  recipe: Recipe;
  meals: Meal[];
  edit: () => void;
  editingDisabled: boolean;
}) {
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [wake, setWake] = useState(false);
  const [wakeMessage, setWakeMessage] = useState("");
  const lock = useRef<{
    release: () => Promise<void>;
    addEventListener: (type: string, callback: () => void) => void;
  } | null>(null);
  useEffect(
    () => () => {
      void lock.current?.release();
    },
    [],
  );
  const history = meals
    .filter((m) => m.dishes.includes(recipe.id) && m.date <= TODAY)
    .sort((a, b) => b.date.localeCompare(a.date));
  async function toggleWake() {
    if (wake) {
      await lock.current?.release();
      setWake(false);
      return;
    }
    try {
      if (!("wakeLock" in navigator)) {
        setWakeMessage(
          "Keeping the screen on isn’t supported in this browser.",
        );
        return;
      }
      lock.current = await (
        navigator as Navigator & {
          wakeLock: {
            request: (
              type: string,
            ) => Promise<NonNullable<typeof lock.current>>;
          };
        }
      ).wakeLock.request("screen");
      lock.current.addEventListener("release", () => setWake(false));
      setWake(true);
      setWakeMessage("");
    } catch {
      setWakeMessage(
        "Your browser couldn’t keep the screen on. You can still use the recipe.",
      );
    }
  }
  return (
    <div className="recipe-detail">
      <div className="recipe-page-toolbar">
        <a href="#/recipes" className="back-link"><ArrowLeft size={16} />Back to recipes</a>
        <button className="text-button" onClick={edit} disabled={editingDisabled}>Edit recipe</button>
      </div>
      <div className="recipe-hero">
        <div className="recipe-intro">
          <span className="eyebrow">
            {recipe.cuisine} <span className="tag-dot">/</span>{" "}
            {recipe.category}
          </span>
          <h1>
            {recipe.name}
            <span>.</span>
          </h1>
        </div>
      </div>
      <div className="recipe-tools">
        <button
          className={`screen-awake ${wake ? "active" : ""}`}
          role="switch"
          aria-checked={wake}
          onClick={toggleWake}
        >
          <span>Keep screen on</span>
          <span className="switch-track" aria-hidden="true"><span /></span>
        </button>
      </div>
      {wakeMessage && (
        <p className="wake-message" role="status">
          {wakeMessage}
        </p>
      )}
      <div className="recipe-content">
        <section className="ingredients-section" id="ingredients">
          <h2>Ingredients</h2>
          {recipe.ingredients.length ? (
            recipe.ingredients.map((group, groupIndex) => (
              <div className="ingredient-group" key={groupIndex}>
                <h3>{group.name}</h3>
                <ul className="ingredient-list">
                  {group.items.map((item, i) => {
                    const id = `${groupIndex}-${i}`;
                    return (
                      <li className="ingredient" key={i}>
                        <label className="ingredient-check">
                          <input
                            type="checkbox"
                            checked={!!checkedIngredients[id]}
                            onChange={(event) => {
                              const checked = event.currentTarget.checked;
                              setCheckedIngredients(current => ({ ...current, [id]: checked }));
                            }}
                          />
                          <span>{item.replace(/^\s*[☐☑☒□▢]\uFE0F?\s*/u, "")}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <p className="muted">No ingredients added yet.</p>
          )}
        </section>
        <section className="method-section" id="method">
          <h2>Instructions</h2>
          {recipe.steps.length ? (
            <ol className="method-list">
              {recipe.steps.map((step, i) => (
                <li className="method-step" key={i}>
                  <p>{step.title && <strong>{step.title}: </strong>}{step.text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">No instructions added yet.</p>
          )}
          {recipe.originalSource && /^https?:\/\//i.test(recipe.originalSource) && (
            <p><a className="text-link" href={recipe.originalSource} target="_blank" rel="noopener noreferrer">Original source ↗</a></p>
          )}
          {recipe.note?.trim() && (
            <section className="kitchen-note" id="kitchen-notes">
              <span className="eyebrow">
                <ChefHat size={17} />Notes
              </span>
              <p>{recipe.note}</p>
            </section>
          )}
          {history.length > 0 && (
            <div className="recipe-history">
              <CalendarDays size={17} />
              <span>
                On your calendar {history.length}{" "}
                {history.length === 1 ? "time" : "times"} · Last on{" "}
                {parseDate(history[0].date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function App() {
  return <AuthGate><LocalCookbook /></AuthGate>;
}

function LocalCookbook() {
  const catalogue = useRecipeCatalogue();
  const { recipes, setRecipes } = catalogue;
  const [legacyRecipes] = useState<Recipe[]>(() => {
    try { return JSON.parse(localStorage.getItem("at-home-recipes-v1") || "null") || seedRecipes; }
    catch { return seedRecipes; }
  });
  const calendarRecipes = calendarRecipeCatalogue(recipes, legacyRecipes);
  const calendar = useCalendarCatalogue();
  const { meals, setMeals, awayEvents, setAwayEvents } = calendar;
  return <Cookbook store={{ recipes, setRecipes, meals, setMeals }} awayEvents={awayEvents} setAwayEvents={setAwayEvents} storageFailed={catalogue.storageFailed || calendar.storageFailed} calendarRecipes={calendarRecipes} catalogue={catalogue} calendar={calendar} />;
}

function Cookbook({ store, awayEvents, setAwayEvents, calendarRecipes, catalogue, calendar, storageFailed = false }: {
  calendar: ReturnType<typeof useCalendarCatalogue>;
  calendarRecipes: Recipe[];
  catalogue: ReturnType<typeof useRecipeCatalogue>;
  awayEvents: AwayEvent[];
  setAwayEvents: Dispatch<SetStateAction<AwayEvent[]>>;
  store: CookbookStore; storageFailed?: boolean;
}) {
  const route = useRoute();
  const { recipes, setRecipes, meals, setMeals } = store;
  const [editor, setEditor] = useState<{
    date: string;
    meal: Meal | null;
    creating?: boolean;
  } | null>(null);
  const [awayEditor, setAwayEditor] = useState<{ date: string; event: AwayEvent | null } | null>(null);
  const [removedAway, setRemovedAway] = useState<AwayEvent | null>(null);
  const [addingRecipe, setAddingRecipe] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeSaved, setRecipeSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [undo, setUndo] = useState<Meal | null>(null);
  const isRecipes = route.startsWith("/recipes");
  const isAnalytics = route === "/analytics";
  const recipeId = isRecipes ? route.split("/")[2] : undefined;
  const recipe = recipes.find((r) => r.id === recipeId) || calendarRecipes.find(r => r.id === recipeId);
  useEffect(() => {
    setMenuOpen(false);
    document.title = `${recipe?.name || (isAnalytics ? "Analytics" : isRecipes ? "Recipes" : "Calendar")} — cooking.karenying.com`;
  }, [route, recipe?.name, isRecipes, isAnalytics]);
  function addMeal(date: string, dish?: string) {
    setEditor({
      date,
      creating: true,
      meal: dish
        ? {
            id: crypto.randomUUID(),
            date,
            type: "Dinner",
            dishes: [dish],
            note: "",
          }
        : null,
    });
  }
  function saveMeal(meal: Meal) {
    setMeals((current) => [...current.filter((m) => m.id !== meal.id), meal]);
  }
  return (
    <>
    {(catalogue.pending || calendar.pending) && <p className="cloud-message" role="status">Saving to Supabase…</p>}
    {(catalogue.saveError || calendar.saveError) && <div className="storage-warning cloud-message" role="alert">
      <p>Changes haven’t saved: {catalogue.saveError || calendar.saveError}</p>
      <button className="text-button" onClick={() => { if (catalogue.saveError) void catalogue.retrySave(); if (calendar.saveError) calendar.retrySave(); }}>Retry save</button>
      <button className="text-button" onClick={() => { if (catalogue.saveError) catalogue.discardFailed(); if (calendar.saveError) calendar.discardFailed(); }}>Discard unsaved changes and reload</button>
    </div>}
    {(catalogue.unsyncedCount || calendar.unsyncedCount) > 0 && !catalogue.saveError && !calendar.saveError && !catalogue.pending && !calendar.pending && <div className="cloud-message">
      Previous device changes are still local. <button className="text-button" onClick={() => { void catalogue.syncDrafts(); calendar.syncDrafts(); }}>Save device changes to Supabase</button>
    </div>}
    <fieldset className="cookbook-controls" disabled={catalogue.loading || calendar.loading || catalogue.pending || calendar.pending || !!catalogue.saveError || !!calendar.saveError}>
    <div className="app-shell">
      <header className="mobile-header">
        <a className="site-title" href="#/calendar">cooking.karenying.com</a>
        <button
          className="icon-button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </header>
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <a className="journal-masthead" href="#/calendar"><span>At home.</span></a>
        <nav aria-label="Main navigation">
          <a
            href="#/calendar"
            className={!isRecipes && !isAnalytics ? "active" : ""}
            aria-current={!isRecipes && !isAnalytics ? "page" : undefined}
          >
            <CalendarDays size={19} />
            Calendar
            <span className="nav-indicator" />
          </a>
          <a
            href="#/recipes"
            className={isRecipes ? "active" : ""}
            aria-current={isRecipes ? "page" : undefined}
          >
            <BookOpen size={19} />
            Recipes<span className="nav-count">{recipes.length}</span>
          </a>
          <a href="#/analytics" className={isAnalytics ? "active" : ""} aria-current={isAnalytics ? "page" : undefined}>
            <BarChart3 size={19} />Analytics
          </a>
        </nav>
        <div className="sidebar-account"><SignOutButton /></div>
      </aside>
      {menuOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="workspace">
        <div className="workspace-topbar">
          <a className="site-title" href="#/calendar">cooking.karenying.com</a>
        </div>
        <main id="main-content">
          {recipeSaved && <p role="status" className="recipe-save-notice">Recipe saved.</p>}
          {catalogue.error && <div className="storage-warning" role="alert">Recipes couldn’t load: {catalogue.error} <button className="text-button" onClick={catalogue.retry}>Retry recipes</button></div>}
          {catalogue.loading && <p role="status">Loading recipes from Supabase…</p>}
          {calendar.error && <div className="storage-warning" role="alert">Calendar couldn’t load: {calendar.error} <button className="text-button" onClick={calendar.retry}>Retry calendar</button></div>}
          {calendar.loading && <p role="status">Loading calendar from Supabase…</p>}
          {storageFailed ? (
            <div className="storage-warning" role="alert">
              Browser storage is unavailable. Changes will only last for this
              visit.
            </div>
          ) : null}
          {recipeId && !recipe && (catalogue.loading || catalogue.error) ? null : recipeId && !recipe ? (
            <div className="empty-state">
              <h1>That recipe isn’t here.</h1>
              <a href="#/recipes" className="text-link">
                Back to recipes <ArrowRight size={16} />
              </a>
            </div>
          ) : recipe ? (
            <RecipePage
              key={recipe.id}
              editingDisabled={catalogue.loading || catalogue.pending || !!catalogue.error || !!catalogue.saveError}
              edit={() => { setRecipeSaved(false); setEditingRecipe(structuredClone({ ...recipe, id: legacyRecipeIds[recipe.id] || recipe.id })); }}
              recipe={{ ...recipe, id: legacyRecipeIds[recipe.id] || recipe.id }}
              meals={meals.map(meal => ({ ...meal, dishes: meal.dishes.map(id => legacyRecipeIds[id] || id) }))}
            />
          ) : isAnalytics ? (
            calendar.loading || catalogue.loading ? null : calendar.error || catalogue.error ? <p>Analytics will be available when the calendar and recipes finish loading. Use Retry above to try again.</p> : <AnalyticsPage meals={meals} awayEvents={awayEvents} recipes={calendarRecipes} />
          ) : isRecipes ? (
            <RecipeIndex
              recipes={recipes}
              meals={meals}
              awayEvents={awayEvents}
              addRecipe={() => setAddingRecipe(true)}
            />
          ) : (
            <Calendar
              meals={meals}
              recipes={calendarRecipes}
              addMeal={addMeal}
              editMeal={(meal) => setEditor({ date: meal.date, meal })}
              awayEvents={awayEvents}
              addAway={(date) => setAwayEditor({ date, event: null })}
              editAway={(event) => setAwayEditor({ date: event.startDate, event })}
            />
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <a href="#/calendar" className={!isRecipes && !isAnalytics ? "active" : ""}>
          <CalendarDays size={21} />
          <span>Calendar</span>
        </a>
        <button
          className="mobile-add"
          aria-label="Add day"
          onClick={() => addMeal(TODAY)}
        >
          <Plus size={25} />
        </button>
        <a href="#/recipes" className={isRecipes ? "active" : ""}>
          <BookOpen size={21} />
          <span>Recipes</span>
        </a>
        <a href="#/analytics" className={isAnalytics ? "active" : ""} aria-current={isAnalytics ? "page" : undefined}>
          <BarChart3 size={21} /><span>Analytics</span>
        </a>
      </nav>
      {editor && (
        <DayEditor key={editor.date} date={editor.date} meals={meals} recipes={calendarRecipes}
          initialDish={editor.creating ? editor.meal?.dishes[0] : undefined}
          save={(date, entries) => setMeals((current) => [...current.filter((meal) => meal.date !== date), ...entries])}
          awayEvents={awayEvents}
          addAway={(date) => setAwayEditor({ date, event: null })}
          editAway={(event) => setAwayEditor({ date: event.startDate, event })}
          close={() => setEditor(null)} />
      )}
      {awayEditor && <AwayEditor initialDate={awayEditor.date} event={awayEditor.event}
        save={(event) => setAwayEvents((current) => [...current.filter((item) => item.id !== event.id), event])}
        remove={(event) => { setAwayEvents((current) => current.filter((item) => item.id !== event.id)); setRemovedAway(event); setUndo(null); }}
        close={() => setAwayEditor(null)} />}
      {removedAway && <div className="undo-toast" role="status">Away event removed
        <button onClick={() => { setAwayEvents((current) => [...current, removedAway]); setRemovedAway(null); }}>Undo</button>
        <button aria-label="Dismiss notification" onClick={() => setRemovedAway(null)}><X size={15} /></button>
      </div>}
      {editingRecipe && <RecipeEditDialog recipe={editingRecipe} save={async updated => {
        await catalogue.saveItem({
          ...updated,
          category: existingRecipeLabel(updated.category, recipes.map(r => r.category)),
          cuisine: existingRecipeLabel(updated.cuisine, recipes.map(r => r.cuisine)),
        });
        setRecipeSaved(true);
      }} close={() => setEditingRecipe(null)} />}
      {addingRecipe && (
        <RecipeEditor
          save={(recipe) => setRecipes((current) => [...current, {
            ...recipe,
            category: existingRecipeLabel(recipe.category, current.map(r => r.category)),
            cuisine: existingRecipeLabel(recipe.cuisine, current.map(r => r.cuisine)),
          }])}
          close={() => setAddingRecipe(false)}
        />
      )}
      {undo && (
        <div className="undo-toast" role="status">
          Meal removed
          <button
            onClick={() => {
              saveMeal(undo);
              setUndo(null);
            }}
          >
            Undo
          </button>
          <button
            aria-label="Dismiss notification"
            onClick={() => setUndo(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
    </fieldset>
    </>
  );
}
