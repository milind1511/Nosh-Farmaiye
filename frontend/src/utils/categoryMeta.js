export const FALLBACK_CATEGORIES = [
  {
    id: "Chicken",
    slug: "chicken",
    labelHi: "चिकन व्यंजन",
    labelEn: "Chicken",
    badge: "Chef's pick",
    accent: "#f47340",
    caption: "Charcoal roasts & velvety gravies",
    icon: "🍗",
  },
  {
    id: "Mutton",
    slug: "mutton",
    labelHi: "मटन ख़ास",
    labelEn: "Mutton",
    badge: "House special",
    accent: "#b71f3f",
    caption: "Slow-simmered royal recipes",
    icon: "🥘",
  },
  {
    id: "Desserts",
    slug: "desserts",
    labelHi: "मीठी सौगात",
    labelEn: "Desserts",
    badge: "Sweet finale",
    accent: "#ffb347",
    caption: "Kesar-infused indulgences",
    icon: "🍮",
  },
];

const normalizeKey = (key) =>
  typeof key === "string" ? key.trim().toLowerCase() : "";

export const DEFAULT_CATEGORY_DESCRIPTOR = {
  eyebrow: "Chef's table picks",
  headline: "Signature plates from Nosh फ़रमाइए",
  description:
    "Each dish is simmered slow and plated with care—perfect for a cozy dinner at home or a celebratory feast.",
  accent: null,
};

export const buildCategoryIndex = (categories = []) =>
  categories.reduce((acc, category) => {
    if (!category) return acc;

    const descriptor = {
      id: category.id,
      slug: category.slug,
      labelHi: category.labelHi || category.label,
      labelEn: category.labelEn || category.label,
      badge: category.badge || null,
      accent: category.accent || null,
      caption: category.caption || category.description || "",
      icon: category.icon || null,
    };

    [category.id, category.slug]
      .filter(Boolean)
      .forEach((key) => {
        const normalized = normalizeKey(key);
        if (normalized) acc[normalized] = descriptor;
      });

    return acc;
  }, {});

export const selectCategoryMeta = (categoryIndex, key) => {
  if (!key) return undefined;
  return categoryIndex[normalizeKey(key)];
};

export const selectCategoryDescriptor = (categoryIndex, key) => {
  const meta = selectCategoryMeta(categoryIndex, key);
  if (!meta) return undefined;
  return {
    eyebrow: `${meta.labelEn} showcase`,
    headline: `${meta.labelEn} favourites from our kitchen`,
    description: meta.caption,
    accent: meta.accent,
  };
};

export const selectCategoryAccent = (
  categoryIndex,
  key,
  fallback = "rgba(205, 81, 53, 0.95)"
) => {
  const meta = selectCategoryMeta(categoryIndex, key);
  return meta?.accent || fallback;
};

export const selectCategoryBadge = (categoryIndex, key) => {
  const meta = selectCategoryMeta(categoryIndex, key);
  return meta?.badge;
};
