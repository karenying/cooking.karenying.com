export type IngredientGroup = { name: string; items: string[] };
export type Recipe = {
  id: string;
  name: string;
  description: string;
  category: string;
  cuisine: string;
  image: string;
  time: number;
  servings: string;
  favorite: boolean;
  ingredients: IngredientGroup[];
  steps: { title: string; text: string }[];
  note: string;
};
export type Meal = {
  id: string;
  date: string;
  type: "Lunch" | "Dinner";
  dishes: string[];
  note: string;
};
const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;
export const recipes: Recipe[] = [
  {
    id: "ginger-chicken-rice",
    name: "Ginger chicken & rice",
    category: "Chicken",
    cuisine: "Chinese",
    time: 40,
    servings: "2–3",
    favorite: true,
    description:
      "One pot, tender chicken, and rice that soaks up all the good stuff. A very dependable dinner.",
    image: photo("photo-1547592180-85f173990554"),
    ingredients: [
      {
        name: "For the chicken",
        items: [
          "4 small boneless chicken thighs",
          "1 tbsp Shaoxing wine",
          "2 tsp sesame oil",
          "⅓ tsp salt",
        ],
      },
      {
        name: "For the rice",
        items: [
          "1 cup jasmine rice, rinsed and drained",
          "6 garlic cloves, minced",
          "½ inch ginger, finely grated",
          "3 green onions, chopped",
          "1¼ cups chicken broth",
          "1 tsp chicken bouillon powder",
        ],
      },
      {
        name: "Ginger-scallion sauce",
        items: [
          "1 tbsp grated ginger",
          "1 green onion, finely chopped",
          "2 tbsp neutral oil",
          "Salt, to taste",
        ],
      },
    ],
    steps: [
      {
        title: "Give the chicken a head start",
        text: "Mix the chicken with Shaoxing wine, sesame oil, and salt. Set aside for 15 minutes while you prepare the rice.",
      },
      {
        title: "Build your pot",
        text: "Add the rinsed rice, garlic, ginger, green onions, broth, and bouillon to a heavy-bottomed pot. Stir, then lay the chicken in a single layer on top. Pour in any marinade.",
      },
      {
        title: "Let it simmer",
        text: "Cover and bring to a boil over medium-high heat. Reduce to very low heat and cook, covered, for about 20 minutes. Check that the thickest part of the chicken reaches 165°F.",
      },
      {
        title: "Rest, then fluff",
        text: "Remove the cooked chicken. Cover the rice, turn off the heat, and let it steam for 10 minutes. Fluff with a fork.",
      },
      {
        title: "Make the sauce & serve",
        text: "Mix ginger, green onion, oil, and salt in a small bowl. Slice the chicken and serve over the rice with the sauce.",
      },
    ],
    note: "Drain the rice really well so it doesn’t turn mushy. Cucumber on the side is always a good idea.",
  },
  {
    id: "thai-red-curry",
    name: "Thai red curry",
    category: "Soups & stews",
    cuisine: "Thai",
    time: 30,
    servings: "3–4",
    favorite: true,
    description:
      "Creamy coconut curry with chicken, plenty of vegetables, and just enough heat.",
    image: photo("photo-1603894584373-5ac82b2ae398"),
    ingredients: [
      {
        name: "The curry",
        items: [
          "18 oz chicken thighs, cut into chunks",
          "1 Chinese eggplant, chopped",
          "2 carrots, thinly sliced",
          "1 bell pepper, sliced",
          "1 cup snow peas",
          "1 cup bamboo shoots",
          "1½–2 tbsp red curry paste",
          "1 can coconut milk",
          "1 cup chicken broth",
          "1–2 tsp fish sauce",
          "1–2 tsp sugar",
          "2 tbsp neutral oil",
        ],
      },
    ],
    steps: [
      {
        title: "Wake up the curry paste",
        text: "Heat the oil in a pot over medium heat. Stir in the curry paste and cook for 1 minute until fragrant.",
      },
      {
        title: "Simmer the chicken",
        text: "Add coconut milk and broth, then stir in the chicken. Simmer gently until the chicken is cooked through.",
      },
      {
        title: "Add some color",
        text: "Add the vegetables, starting with the carrots and eggplant. Simmer until tender. Add the snow peas near the end, then season with fish sauce and sugar.",
      },
    ],
    note: "Start with less curry paste and taste as you go. Serve with jasmine rice.",
  },
  {
    id: "lamb-meatballs",
    name: "Lamb meatballs",
    category: "Beef & lamb",
    cuisine: "Mediterranean",
    time: 35,
    servings: "4",
    favorite: false,
    description:
      "Warm spices, crisp edges, and a generous spoonful of lemon-garlic yogurt.",
    image: photo("photo-1529042410759-befb1204b468"),
    ingredients: [
      {
        name: "Meatballs",
        items: [
          "1½ lb ground lamb",
          "½ onion, finely grated",
          "4 garlic cloves, minced",
          "¼ cup chopped parsley",
          "2 tsp ground cumin",
          "1½ tsp ground coriander",
          "1 tsp paprika",
          "½ tsp cinnamon",
          "1¼ tsp kosher salt",
          "½ tsp black pepper",
        ],
      },
      {
        name: "Yogurt sauce",
        items: [
          "¾ cup plain Greek yogurt",
          "1 tbsp lemon juice",
          "1 small garlic clove, grated",
          "1 tbsp olive oil",
          "¼ tsp salt",
        ],
      },
    ],
    steps: [
      {
        title: "Mix gently",
        text: "Squeeze excess moisture from the grated onion. Combine with the lamb, garlic, parsley, and spices. Mix just until combined.",
      },
      {
        title: "Shape & bake",
        text: "Shape into 16–20 meatballs. Arrange on a lightly oiled baking sheet. Bake at 425°F for 15–20 minutes, until cooked to 160°F internally.",
      },
      {
        title: "Sauce & serve",
        text: "Mix the yogurt sauce ingredients. Thin with a little water if needed. Serve with the meatballs, rice or pita, and vegetables.",
      },
    ],
    note: "A quick broil at the end gives these especially good edges.",
  },
  {
    id: "pesto-pasta",
    name: "Weeknight pesto pasta",
    category: "Pasta & noodles",
    cuisine: "Italian",
    time: 20,
    servings: "2",
    favorite: true,
    description:
      "The low-effort, high-reward pasta that always makes its way back into the rotation.",
    image: photo("photo-1473093295043-cdd812d0e601"),
    ingredients: [
      {
        name: "Everything you need",
        items: [
          "8 oz pasta",
          "⅓ cup basil pesto",
          "¼ cup grated Parmesan",
          "1 cup cherry tomatoes, halved",
          "1 tbsp olive oil",
          "Salt and black pepper",
        ],
      },
    ],
    steps: [
      {
        title: "Cook the pasta",
        text: "Bring a large pot of salted water to a boil. Cook the pasta until al dente, reserving a mug of pasta water before draining.",
      },
      {
        title: "Toss it together",
        text: "Off the heat, toss the pasta with pesto, olive oil, and a splash of pasta water until glossy. Fold in the tomatoes and Parmesan. Season to taste.",
      },
    ],
    note: "Keep the pesto off direct heat to preserve its color. Add more pasta water than you think.",
  },
  {
    id: "cilantro-wontons",
    name: "Chicken cilantro wontons",
    category: "Dumplings",
    cuisine: "Chinese",
    time: 55,
    servings: "4",
    favorite: false,
    description:
      "A little weekend project, a very good freezer stash. Extra cilantro, always.",
    image: photo("photo-1563245372-f21724e3856d"),
    ingredients: [
      {
        name: "Filling & wrappers",
        items: [
          "1 lb ground chicken",
          "1 cup packed cilantro, finely chopped",
          "4 scallions, thinly sliced",
          "1 tbsp grated ginger",
          "2 garlic cloves, minced",
          "1½ tbsp soy sauce",
          "1 tbsp oyster sauce",
          "1 tsp sesame oil",
          "¼ tsp white pepper",
          "1½ tbsp neutral oil",
          "1 package wonton wrappers",
        ],
      },
    ],
    steps: [
      {
        title: "Make the filling",
        text: "Mix the chicken, herbs, aromatics, sauces, pepper, and oils until sticky and well combined.",
      },
      {
        title: "Fold your wontons",
        text: "Place a teaspoon of filling in each wrapper. Moisten the edges, fold, and press to seal. Keep the remaining wrappers covered.",
      },
      {
        title: "Cook or freeze",
        text: "Simmer in gently boiling water until the filling reaches 165°F. To save for later, freeze uncooked wontons in a single layer before transferring to a freezer bag.",
      },
    ],
    note: "Freeze a tray for future dinners. Serve in broth or with chili oil.",
  },
  {
    id: "tomato-eggs",
    name: "Tomato & egg stir-fry",
    category: "Tofu & eggs",
    cuisine: "Chinese",
    time: 15,
    servings: "2",
    favorite: false,
    description:
      "Soft eggs, saucy tomatoes, and a bowl of rice. Comfort food in fifteen minutes.",
    image: photo("photo-1547592166-23ac45744acd"),
    ingredients: [
      {
        name: "Everything you need",
        items: [
          "4 eggs",
          "3 ripe tomatoes, cut into wedges",
          "2 tbsp neutral oil",
          "1 scallion, sliced",
          "½ tsp sugar",
          "Salt, to taste",
        ],
      },
    ],
    steps: [
      {
        title: "Soft scramble",
        text: "Beat the eggs with a pinch of salt. Heat half the oil in a skillet and gently scramble the eggs until just set. Transfer to a plate.",
      },
      {
        title: "Get the tomatoes saucy",
        text: "Add the remaining oil and tomatoes to the skillet. Cook until softened, adding a splash of water if needed. Season with sugar and salt.",
      },
      {
        title: "Bring it together",
        text: "Fold the eggs back into the tomatoes. Warm briefly, top with scallions, and serve with rice.",
      },
    ],
    note: "Pull the eggs early. They’ll finish cooking when they go back in with the tomatoes.",
  },
];

export const initialMeals: Meal[] = [
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

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}
export const TODAY = dateKey(new Date());
