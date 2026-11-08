import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CookingPot,
  Heart,
  Leaf,
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  dateKey,
  initialMeals,
  parseDate,
  recipes as seedRecipes,
  TODAY,
} from "./data";
import type { Meal, Recipe } from "./data";

function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [key, value]);
  return [value, setValue, failed] as const;
}
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
}: {
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
      className="modal"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
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

function DayEditor({ date, meals, recipes, initialDish, save, close }: {
  date: string;
  meals: Meal[];
  recipes: Recipe[];
  initialDish?: string;
  save: (meals: Meal[]) => void;
  close: () => void;
}) {
  const [entries, setEntries] = useState<Meal[]>(() => {
    const existing = meals.filter((meal) => meal.date === date);
    return (["Lunch", "Dinner"] as const).flatMap((type) => {
      const matches = existing.filter((meal) => meal.type === type);
      const rows = matches.length ? matches : [{ id: crypto.randomUUID(), date, type, dishes: [], note: "" }];
      return rows.map((row, i) => initialDish && type === "Dinner" && i === 0
        ? { ...row, dishes: [...new Set([...row.dishes, initialDish])] } : row);
    });
  });
  function update(id: string, change: Partial<Meal>) {
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...change } : entry));
  }
  return (
    <Modal title={prettyDate(date)} close={close}>
      <form className="editor-form" onSubmit={(event) => {
        event.preventDefault();
        save(entries.map((entry) => ({ ...entry, note: entry.note.trim() }))
          .filter((entry) => entry.note || entry.dishes.length));
        close();
      }}>
        {entries.map((entry, index) => (
          <section className="day-editor-meal" key={entry.id}>
            <label htmlFor={`day-note-${entry.id}`}>{entry.type}</label>
            <textarea id={`day-note-${entry.id}`} autoFocus={index === 0} rows={3}
              aria-label={`${entry.type} entry ${index + 1}`}
              placeholder={entry.type === "Lunch" ? "What’s for lunch?" : "What’s for dinner?"}
              value={entry.note} onChange={(event) => update(entry.id, { note: event.target.value })} />
            <div className="day-dish-links">
              {entry.dishes.map((id) => <button type="button" className="day-dish-chip" key={id}
                aria-label={`Remove ${recipes.find((recipe) => recipe.id === id)?.name || "recipe"} from ${entry.type}`}
                onClick={() => update(entry.id, { dishes: entry.dishes.filter((dish) => dish !== id) })}>
                {recipes.find((recipe) => recipe.id === id)?.name || "Recipe"}<X size={13} />
              </button>)}
              <select aria-label={`Link recipe to ${entry.type} entry ${index + 1}`} value=""
                onChange={(event) => { if (event.target.value) update(entry.id, { dishes: [...entry.dishes, event.target.value] }); }}>
                <option value="">Link a recipe…</option>
                {recipes.filter((recipe) => !entry.dishes.includes(recipe.id)).map((recipe) =>
                  <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
              </select>
            </div>
          </section>
        ))}
        <div className="modal-footer">
          <button type="button" className="text-button" onClick={close}>Cancel</button>
          <button className="primary-button">Save day</button>
        </div>
      </form>
    </Modal>
  );
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
            placeholder="Something worth making again"
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
}: {
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
          <span className="eyebrow">
            <span className="tiny-line" />
            THE EVERYDAY, WELL FED
          </span>
          <h1>
            Calendar
          </h1>
          
        </div>
        <button
          className="primary-button heading-action"
          onClick={() => addMeal(selected)}
        >
          <Plus size={18} />
          Edit day
        </button>
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
            const entries = visibleMeals
              .filter((m) => m.date === key)
              .sort((a, b) =>
                a.type === b.type ? 0 : a.type === "Lunch" ? -1 : 1,
              );
            return (
              <div
                key={key}
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
                className={`calendar-day ${!inMonth ? "outside-month" : ""} ${key === TODAY ? "is-today" : ""} ${selected === key ? "selected-day" : ""}`}
              >
                <div className="day-top">
                  <button
                    className="day-number"
                    aria-label={`${prettyDate(key)}${key === TODAY ? ", today" : ""}, ${entries.length} meals`}
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
                <div className="cell-meals">
                  {entries.map((meal) => (
                    <div
                      className={`cell-meal ${meal.dishes.length ? "home-meal" : "note-meal"}`}
                      key={meal.id}
                    >
                      <button
                        className="meal-label"
                        aria-label={`Edit ${meal.type.toLowerCase()} on ${prettyDate(key)}`}
                        onClick={() => editMeal(meal)}
                      >
                        {meal.type}
                      </button>
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
                        meal.dishes.length ? "olive-dot" : "orange-dot"
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="calendar-legend">
          <span>
            <i className="olive-dot" />
            From the cookbook
          </span>
          <span>
            <i className="orange-dot" />
            Notes & other plans
          </span>
          <span className="calendar-hint">Select a meal to edit</span>
        </div>
      </section>
      <section className="mobile-day-detail" aria-label="Selected day meals">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ON THE MENU</span>
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
        {selectedMeals.length ? (
          selectedMeals.map((meal) => (
            <article className="mobile-meal" key={meal.id}>
              <div className="mobile-meal-heading">
                <span className="eyebrow">{meal.type}</span>
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
            <p>No meals planned.</p>
            <button className="text-button" onClick={() => addMeal(selected)}>
              Edit day
            </button>
          </div>
        )}
      </section>
      {!hasMeals && (
        <p className="month-empty">
          A fresh month. Use the + in any day to start planning.
        </p>
      )}
      <section className="inspiration">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A FEW OLD FRIENDS</span>
            <h2>Recipe suggestions</h2>
          </div>
          <a className="text-link" href="#/recipes">
            All recipes <ArrowRight size={16} />
          </a>
        </div>
        <div className="inspiration-grid">
          {recipes
            .filter((r) => r.favorite)
            .slice(0, 3)
            .map((recipe) => (
              <a
                className="inspiration-card"
                href={`#/recipes/${recipe.id}`}
                key={recipe.id}
              >
                <FoodImage recipe={recipe} />
                <div>
                  <span className="eyebrow">{recipe.cuisine}</span>
                  <h3>{recipe.name}</h3>
                  <span className="recipe-meta">
                    <Clock3 size={13} />
                    {recipe.time} min
                  </span>
                </div>
                <ArrowRight size={18} />
              </a>
            ))}
        </div>
      </section>
    </>
  );
}

function RecipeIndex({
  recipes,
  toggleFavorite,
  addRecipe,
}: {
  recipes: Recipe[];
  toggleFavorite: (id: string) => void;
  addRecipe: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All dishes");
  const [cuisine, setCuisine] = useState("All cuisines");
  const [sort, setSort] = useState("A–Z");
  const [favorites, setFavorites] = useState(false);
  const categories = [...new Set(recipes.map((r) => r.category))];
  const filtered = recipes
    .filter(
      (r) =>
        `${r.name} ${r.cuisine} ${r.category} ${r.ingredients.flatMap((g) => g.items).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (category === "All dishes" || r.category === category) &&
        (cuisine === "All cuisines" || r.cuisine === cuisine) &&
        (!favorites || r.favorite),
    )
    .sort((a, b) =>
      sort === "Quickest"
        ? a.time - b.time
        : sort === "Z–A"
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name),
    );
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">
            <span className="tiny-line" />
            TRIED, LOVED, MADE AGAIN
          </span>
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
        <button
          className={`favorite-filter ${favorites ? "active" : ""}`}
          aria-pressed={favorites}
          onClick={() => setFavorites(!favorites)}
        >
          <Heart size={17} fill={favorites ? "currentColor" : "none"} />
          <span>Favorites</span>
        </button>
      </div>
      <div className="category-tabs" aria-label="Recipe categories">
        {["All dishes", ...categories].map((c) => (
          <button
            className={category === c ? "active" : ""}
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
              {[...new Set(recipes.map((r) => r.cuisine))].sort().map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort recipes</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option>A–Z</option>
              <option>Z–A</option>
              <option>Quickest</option>
            </select>
          </label>
        </div>
      </div>
      <div className="recipe-grid">
        {filtered.map((recipe) => (
          <article className="recipe-card" key={recipe.id}>
            <a
              href={`#/recipes/${recipe.id}`}
              className="card-image-link"
              tabIndex={-1}
              aria-hidden="true"
            >
              <FoodImage recipe={recipe} />
            </a>
            <button
              className={`favorite-button ${recipe.favorite ? "is-favorite" : ""}`}
              aria-label={`${recipe.favorite ? "Unfavorite" : "Favorite"} ${recipe.name}`}
              aria-pressed={recipe.favorite}
              onClick={() => toggleFavorite(recipe.id)}
            >
              <Heart
                size={18}
                fill={recipe.favorite ? "currentColor" : "none"}
              />
            </button>
            <div className="recipe-card-body">
              <span className="eyebrow">
                {recipe.cuisine} <span className="tag-dot">·</span>{" "}
                {recipe.category}
              </span>
              <h2>
                <a href={`#/recipes/${recipe.id}`}>{recipe.name}</a>
              </h2>
              <p>{recipe.description || "No description added."}</p>
              <div className="card-meta">
                <span>
                  <Clock3 size={15} />
                  {recipe.time ? `${recipe.time} min` : "Time not added"}
                </span>
                <ArrowRight size={17} />
              </div>
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
              setFavorites(false);
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
  toggleFavorite,
  addMeal,
}: {
  recipe: Recipe;
  meals: Meal[];
  toggleFavorite: (id: string) => void;
  addMeal: (date: string, dish?: string) => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const [section, setSection] = useState("ingredients");
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
  function jump(id: string) {
    setSection(id);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const ingredientCount = recipe.ingredients.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  return (
    <div className="recipe-detail">
      <a href="#/recipes" className="back-link">
        <ArrowLeft size={16} />
        Back to recipes
      </a>
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
          <p>
            {recipe.description || "No description added."}
          </p>
          <div className="detail-meta">
            {recipe.time > 0 && (
              <span>
                <Clock3 size={17} />
                {recipe.time} minutes
              </span>
            )}
            {recipe.servings && (
              <span>
                <Users size={17} />
                Serves {recipe.servings}
              </span>
            )}
          </div>
          <div className="recipe-actions">
            <button
              className="primary-button"
              onClick={() => addMeal(TODAY, recipe.id)}
            >
              <CalendarDays size={17} />
              Add to calendar
            </button>
            <button
              className={`icon-button outlined ${recipe.favorite ? "is-favorite" : ""}`}
              aria-pressed={recipe.favorite}
              aria-label={`${recipe.favorite ? "Unfavorite" : "Favorite"} ${recipe.name}`}
              onClick={() => toggleFavorite(recipe.id)}
            >
              <Heart
                size={19}
                fill={recipe.favorite ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
        <FoodImage recipe={recipe} className="recipe-cover" />
        <span className="photo-caption">
          Sample photo
        </span>
      </div>
      <nav className="recipe-section-nav" aria-label="Recipe sections">
        <div>
          <button
            className={section === "ingredients" ? "active" : ""}
            onClick={() => jump("ingredients")}
          >
            Ingredients <span>{ingredientCount}</span>
          </button>
          <button
            className={section === "method" ? "active" : ""}
            onClick={() => jump("method")}
          >
            Method <span>{recipe.steps.length}</span>
          </button>
          <button
            className={section === "kitchen-notes" ? "active" : ""}
            onClick={() => jump("kitchen-notes")}
          >
            Notes
          </button>
        </div>
        <button
          className={`screen-awake ${wake ? "active" : ""}`}
          aria-pressed={wake}
          onClick={toggleWake}
        >
          <Sparkles size={15} />
          <span>{wake ? "Screen staying on" : "Keep screen on"}</span>
        </button>
      </nav>
      {wakeMessage && (
        <p className="wake-message" role="status">
          {wakeMessage}
        </p>
      )}
      <div className="recipe-content">
        <section className="ingredients-section" id="ingredients">
          <div className="section-heading">
            <h2>Ingredients</h2>
            {checked.length > 0 && (
              <button className="text-button" onClick={() => setChecked([])}>
                Reset
              </button>
            )}
          </div>
          <p className="section-help">Check off ingredients as you prep.</p>
          {recipe.ingredients.length ? (
            recipe.ingredients.map((group, groupIndex) => (
              <div className="ingredient-group" key={groupIndex}>
                <h3>{group.name}</h3>
                {group.items.map((item, i) => {
                  const id = `${groupIndex}-${i}`;
                  return (
                    <label
                      className={`ingredient ${checked.includes(id) ? "checked" : ""}`}
                      key={id}
                    >
                      <input
                        type="checkbox"
                        checked={checked.includes(id)}
                        onChange={() =>
                          setChecked(
                            checked.includes(id)
                              ? checked.filter((key) => key !== id)
                              : [...checked, id],
                          )
                        }
                      />
                      <span className="custom-checkbox">
                        {checked.includes(id) && <Check size={13} />}
                      </span>
                      <span>{item}</span>
                    </label>
                  );
                })}
              </div>
            ))
          ) : (
            <p className="muted">No ingredients added yet.</p>
          )}
          <div className="ingredient-progress">
            {checked.length} of {ingredientCount} ingredients ready
            <div>
              <span
                style={{
                  width: `${ingredientCount ? (checked.length / ingredientCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </section>
        <section className="method-section" id="method">
          <div className="section-heading">
            <h2>Method</h2>
            {done.length > 0 && (
              <button className="text-button" onClick={() => setDone([])}>
                Reset
              </button>
            )}
          </div>
          <p className="section-help">Mark each step as you go.</p>
          {recipe.steps.length ? (
            recipe.steps.map((step, i) => (
              <article
                className={`method-step ${done.includes(i) ? "step-done" : ""}`}
                key={i}
              >
                <button
                  className="step-number"
                  aria-label={`Mark step ${i + 1} ${done.includes(i) ? "incomplete" : "complete"}`}
                  aria-pressed={done.includes(i)}
                  onClick={() =>
                    setDone(
                      done.includes(i)
                        ? done.filter((n) => n !== i)
                        : [...done, i],
                    )
                  }
                >
                  {done.includes(i) ? (
                    <Check size={17} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </button>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))
          ) : (
            <p className="muted">No instructions added yet.</p>
          )}
          <section className="kitchen-note" id="kitchen-notes">
            <span className="eyebrow">
              <ChefHat size={17} />Notes
            </span>
            <p>
              {recipe.note ||
                "No notes added."}
            </p>
          </section>
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
  const route = useRoute();
  const [recipes, setRecipes, recipesFailed] = useLocal<Recipe[]>(
    "at-home-recipes-v1",
    seedRecipes,
  );
  const [meals, setMeals, mealsFailed] = useLocal<Meal[]>(
    "at-home-meals-v1",
    initialMeals,
  );
  const [editor, setEditor] = useState<{
    date: string;
    meal: Meal | null;
    creating?: boolean;
  } | null>(null);
  const [addingRecipe, setAddingRecipe] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [undo, setUndo] = useState<Meal | null>(null);
  const isRecipes = route.startsWith("/recipes");
  const recipeId = route.split("/")[2];
  const recipe = recipes.find((r) => r.id === recipeId);
  useEffect(() => {
    setMenuOpen(false);
    document.title = `${recipe?.name || (isRecipes ? "Recipes" : "Calendar")} — cooking.karenying.com`;
  }, [route, recipe?.name, isRecipes]);
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
  function toggleFavorite(id: string) {
    setRecipes((current) =>
      current.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)),
    );
  }
  return (
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
        <nav aria-label="Main navigation">
          <a
            href="#/calendar"
            className={!isRecipes ? "active" : ""}
            aria-current={!isRecipes ? "page" : undefined}
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
        </nav>
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
          <span className="prototype-badge">
            <i />
            Sample data
          </span>
        </div>
        <main id="main-content">
          {recipesFailed || mealsFailed ? (
            <div className="storage-warning" role="alert">
              Browser storage is unavailable. Changes will only last for this
              visit.
            </div>
          ) : null}
          {recipeId && !recipe ? (
            <div className="empty-state">
              <h1>That recipe isn’t here.</h1>
              <a href="#/recipes" className="text-link">
                Back to recipes <ArrowRight size={16} />
              </a>
            </div>
          ) : recipe ? (
            <RecipePage
              key={recipe.id}
              recipe={recipe}
              meals={meals}
              toggleFavorite={toggleFavorite}
              addMeal={addMeal}
            />
          ) : isRecipes ? (
            <RecipeIndex
              recipes={recipes}
              toggleFavorite={toggleFavorite}
              addRecipe={() => setAddingRecipe(true)}
            />
          ) : (
            <Calendar
              meals={meals}
              recipes={recipes}
              addMeal={addMeal}
              editMeal={(meal) => setEditor({ date: meal.date, meal })}
            />
          )}
          <footer className="page-footer">
            
            <span>Prototype · changes saved on this device</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <a href="#/calendar" className={!isRecipes ? "active" : ""}>
          <CalendarDays size={21} />
          <span>Calendar</span>
        </a>
        <button
          className="mobile-add"
          aria-label="Edit day"
          onClick={() => addMeal(TODAY)}
        >
          <Plus size={25} />
        </button>
        <a href="#/recipes" className={isRecipes ? "active" : ""}>
          <BookOpen size={21} />
          <span>Recipes</span>
        </a>
      </nav>
      {editor && (
        <DayEditor key={editor.date} date={editor.date} meals={meals} recipes={recipes}
          initialDish={editor.creating ? editor.meal?.dishes[0] : undefined}
          save={(entries) => setMeals((current) => [...current.filter((meal) => meal.date !== editor.date), ...entries])}
          close={() => setEditor(null)} />
      )}
      {addingRecipe && (
        <RecipeEditor
          save={(recipe) => setRecipes((current) => [...current, recipe])}
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
  );
}
