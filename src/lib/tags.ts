export type TagCategory = "mood" | "type" | "genre";

export const TAG_CATEGORIES: Record<
  TagCategory,
  { label: string; selectMode: "single" | "multi"; max?: number; options: string[] }
> = {
  mood: {
    label: "Mood",
    selectMode: "single",
    options: ["Uplifting", "Sad / Heavy", "Funny", "Suspenseful", "Bittersweet", "Dark"],
  },
  type: {
    label: "Type",
    selectMode: "single",
    options: ["Fiction", "Non-Fiction"],
  },
  genre: {
    label: "Genre",
    selectMode: "multi",
    max: 3,
    options: [
      "Literary Fiction",
      "Mystery/Thriller",
      "Romance",
      "Sci-Fi/Fantasy",
      "Historical",
      "Memoir/Biography",
      "Horror",
      "Self-Help",
      "Young Adult",
    ],
  },
};

export const TAG_TO_CATEGORY: Record<string, TagCategory> = Object.fromEntries(
  (Object.entries(TAG_CATEGORIES) as [TagCategory, (typeof TAG_CATEGORIES)[TagCategory]][]).flatMap(
    ([cat, def]) => def.options.map((opt) => [opt, cat])
  )
);

export function validateTags(tags: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) {
    return { valid: false, error: "Tags must be an array of strings" };
  }
  if (new Set(tags).size !== tags.length) {
    return { valid: false, error: "Duplicate tags" };
  }
  if (tags.some((t) => !TAG_TO_CATEGORY[t])) {
    return { valid: false, error: "Unknown tag" };
  }
  const byCat = { mood: 0, type: 0, genre: 0 };
  for (const t of tags) byCat[TAG_TO_CATEGORY[t]]++;
  if (byCat.mood !== 1 || byCat.type !== 1 || byCat.genre < 1 || byCat.genre > 3) {
    return { valid: false, error: "Select exactly 1 mood, 1 type, and 1-3 genres" };
  }
  return { valid: true };
}
