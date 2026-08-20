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

// Instruction fragment for asking a model to tag a title. Kept next to the
// taxonomy so the allowed options can never drift out of sync with it.
export function tagPromptInstruction(): string {
  const list = (cat: TagCategory) => TAG_CATEGORIES[cat].options.map((o) => `"${o}"`).join(", ");
  return `Also classify it with tags, choosing ONLY from these exact options:
- exactly one mood: ${list("mood")}
- exactly one type: ${list("type")}
- one to three genres: ${list("genre")}
Return them as a flat array of the exact strings above, e.g. ["Sad / Heavy", "Fiction", "Literary Fiction"]. Do not invent tags outside these lists.`;
}

// Normalize model-generated tags into a valid subset of the taxonomy: at most
// one mood, one type, and three genres, matched case-insensitively. Anything
// unrecognized is dropped. A partial result is fine - it just prefills the
// picker, and the user still has to satisfy validateTags() to submit.
export function coerceTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const canonical = new Map(
    Object.keys(TAG_TO_CATEGORY).map((t) => [t.toLowerCase(), t])
  );

  let mood: string | undefined;
  let type: string | undefined;
  const genres: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const tag = canonical.get(item.trim().toLowerCase());
    if (!tag) continue;
    const cat = TAG_TO_CATEGORY[tag];
    if (cat === "mood" && !mood) mood = tag;
    else if (cat === "type" && !type) type = tag;
    else if (cat === "genre" && genres.length < 3 && !genres.includes(tag)) genres.push(tag);
  }

  return [mood, type, ...genres].filter(Boolean) as string[];
}

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
