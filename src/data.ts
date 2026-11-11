export type IngredientGroup = { name: string; items: string[] };
export type Recipe = {
  id: string;
  name: string;
  description: string;
  category: string;
  cuisine: string;
  cuisineInferred?: boolean;
  image: string;
  time: number;
  servings: string;
  favorite: boolean;
  ingredients: IngredientGroup[];
  steps: { title: string; text: string }[];
  note: string;
  /** Primary recipe URL or source-sheet tab; absent on older local recipes. */
  originalSource?: string;
};
export type MealPart = { type: "text"; text: string } | { type: "recipe"; id: string };
export type Meal = {
  id: string;
  date: string;
  type: "Lunch" | "Dinner";
  dishes: string[];
  note: string;
  setting?: "home" | "out" | "figma";
  content?: MealPart[];
};
export type AwayEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  note: string;
};
const legacySampleMeals: Meal[] = [
  {
    id: "m1",
    date: "2026-11-01",
    type: "Dinner",
    dishes: ["lamb-meatballs"],
    note: "",
  },
  {
    id: "m2",
    date: "2026-11-02",
    type: "Dinner",
    dishes: ["pesto-pasta"],
    note: "",
  },
  {
    id: "m3",
    date: "2026-11-03",
    type: "Lunch",
    dishes: [],
    note: "Lunch at the office",
  },
  {
    id: "m4",
    date: "2026-11-03",
    type: "Dinner",
    dishes: ["thai-red-curry"],
    note: "",
  },
  {
    id: "m5",
    date: "2026-11-04",
    type: "Dinner",
    dishes: [],
    note: "Dinner out with friends",
  },
  {
    id: "m6",
    date: "2026-11-05",
    type: "Dinner",
    dishes: ["ginger-chicken-rice", "tomato-eggs"],
    note: "",
  },
  {
    id: "m7",
    date: "2026-11-06",
    type: "Dinner",
    dishes: [],
    note: "Leftover curry. Easy Friday.",
  },
  {
    id: "m8",
    date: "2026-11-07",
    type: "Lunch",
    dishes: ["cilantro-wontons"],
    note: "",
  },
  {
    id: "m9",
    date: "2026-11-07",
    type: "Dinner",
    dishes: ["pesto-pasta"],
    note: "Something easy tonight",
  },
  {
    id: "m10",
    date: "2026-11-08",
    type: "Dinner",
    dishes: ["ginger-chicken-rice"],
    note: "",
  },
  {
    id: "m11",
    date: "2026-11-09",
    type: "Dinner",
    dishes: ["thai-red-curry"],
    note: "",
  },
  {
    id: "m12",
    date: "2026-11-10",
    type: "Lunch",
    dishes: [],
    note: "Lunch at the office",
  },
  {
    id: "m13",
    date: "2026-11-10",
    type: "Dinner",
    dishes: ["lamb-meatballs"],
    note: "",
  },
  {
    id: "m14",
    date: "2026-11-11",
    type: "Dinner",
    dishes: ["tomato-eggs"],
    note: "",
  },
  {
    id: "m15",
    date: "2026-11-12",
    type: "Dinner",
    dishes: ["cilantro-wontons"],
    note: "Make a batch for the freezer",
  },
  {
    id: "m16",
    date: "2026-11-13",
    type: "Dinner",
    dishes: [],
    note: "Pizza night out",
  },
  {
    id: "m17",
    date: "2026-11-15",
    type: "Dinner",
    dishes: ["pesto-pasta"],
    note: "",
  },
  {
    id: "m18",
    date: "2026-11-18",
    type: "Dinner",
    dishes: ["thai-red-curry"],
    note: "",
  },
  {
    id: "m19",
    date: "2026-11-21",
    type: "Dinner",
    dishes: [],
    note: "Away for the weekend 🌲",
  },
  {
    id: "m20",
    date: "2026-11-26",
    type: "Dinner",
    dishes: [],
    note: "Thanksgiving with family",
  },
];

// These are illustrative examples, not an import or a classification of saved user data.
const sampleOutMeals = new Set(["m5", "m16"]);
export const initialMeals: Meal[] = legacySampleMeals.filter((meal) => meal.id !== "m19").map((meal) => ({
  ...meal,
  setting: sampleOutMeals.has(meal.id) ? "out" : ["m3", "m12"].includes(meal.id) ? "figma" : "home",
}));
export const initialAwayEvents: AwayEvent[] = [{
  id: "sample-away-weekend",
  title: "Weekend away",
  startDate: "2026-11-21",
  endDate: "2026-11-23",
  note: "A long weekend in the mountains.",
}];

// Upgrade only unchanged old examples. Preserve added, edited and classified meals,
// deleted examples, and any existing event with the sample ID.
export function upgradeSampleCalendar(meals: Meal[], awayEvents: AwayEvent[]) {
  let moveLegacyAway = false;
  const nextMeals = meals.flatMap((meal) => {
    const old = legacySampleMeals.find((sample) => sample.id === meal.id);
    if (!old || meal.setting || meal.date !== old.date || meal.type !== old.type || meal.note !== old.note
      || meal.dishes.length !== old.dishes.length || meal.dishes.some((id, i) => id !== old.dishes[i])
      || Object.keys(meal).some((key) => !["id", "date", "type", "note", "dishes", "setting"].includes(key))) return [meal];
    if (meal.id === "m19") { moveLegacyAway = true; return []; }
    return [initialMeals.find((sample) => sample.id === meal.id) || meal];
  });
  return {
    meals: nextMeals,
    awayEvents: moveLegacyAway && !awayEvents.some((event) => event.id === initialAwayEvents[0].id)
      ? [...awayEvents, ...initialAwayEvents] : awayEvents,
  };
}

export function upgradeWorkLunchSamples(meals: Meal[]) {
  return meals.map((meal) => {
    const sample = legacySampleMeals.find((row) => ["m3", "m12"].includes(row.id) && row.id === meal.id);
    return sample && !meal.setting && !meal.content && meal.date === sample.date && meal.type === sample.type
      && meal.note === sample.note && meal.dishes.length === 0 ? { ...meal, setting: "figma" as const } : meal;
  });
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}
export const TODAY = dateKey(new Date());
