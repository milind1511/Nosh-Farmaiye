export const FOOD_CATEGORIES = [
  {
    id: "Chicken",
    slug: "chicken",
    label: "Chicken",
    labelEn: "Chicken",
    labelHi: "चिकन व्यंजन",
    icon: "🍗",
    accent: "#f47340",
    badge: "Chef's pick",
    caption: "Charcoal roasts & velvety gravies",
    description: "Charcoal roasts, smoky grills, and velvety gravies.",
  },
  {
    id: "Mutton",
    slug: "mutton",
    label: "Mutton",
    labelEn: "Mutton",
    labelHi: "मटन ख़ास",
    icon: "🥘",
    accent: "#b71f3f",
    badge: "House special",
    caption: "Slow-simmered royal recipes",
    description: "Slow-braised royal recipes and celebratory handis.",
  },
  {
    id: "Desserts",
    slug: "desserts",
    label: "Desserts",
    labelEn: "Desserts",
    labelHi: "मीठी सौगात",
    icon: "🍮",
    accent: "#ffb347",
    badge: "Sweet finale",
    caption: "Kesar-infused indulgences",
    description: "Kesar-infused sweet dishes to end on a high note.",
  },
];

export const FOOD_CATEGORY_IDS = FOOD_CATEGORIES.map((category) => category.id);

export const isValidFoodCategory = (category) =>
  FOOD_CATEGORY_IDS.includes(category);
