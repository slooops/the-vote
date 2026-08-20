import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { coerceTags, tagPromptInstruction } from "@/lib/tags";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Gemini's free tier is volatile: individual models get their daily quota
// zeroed (gemini-2.0-flash), capped low (gemini-3.5-flash at 20/day), or
// deprecated (404) with little notice. Each model has its OWN per-day free
// quota, so we use a fallback chain: try the preferred model, and on a quota
// (429) or availability (404) error, fall through to the next.
//
// We track the "-latest" aliases so the model stays current as Google rotates
// them (a pinned version eventually gets retired). Lite comes first — it
// carries the most generous free limits and is plenty for a 2-3 sentence
// synopsis; full flash is the fallback.
const SYNOPSIS_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
];

const isTransient = (status?: number) =>
  status === 500 || status === 502 || status === 503 || status === 504;

// A quota/availability error means THIS model is unusable right now — move on
// to the next model rather than retrying the same one.
const shouldTryNextModel = (status?: number) => status === 429 || status === 404;

type GenParams = Parameters<typeof genai.models.generateContent>[0];
async function generateSynopsis(params: Omit<GenParams, "model">) {
  let lastError: unknown;
  for (const model of SYNOPSIS_MODELS) {
    // Up to 2 attempts per model, to ride out a transient overload blip.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await genai.models.generateContent({ ...params, model });
      } catch (error) {
        lastError = error;
        const status = (error as { status?: number })?.status;
        if (isTransient(status) && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue; // retry same model once
        }
        if (shouldTryNextModel(status) || isTransient(status)) break; // next model
        throw error; // non-recoverable (bad key, malformed request): fail fast
      }
    }
  }
  throw lastError;
}

// Open Library descriptions carry markdown-ish footnotes and source citations
// after a horizontal rule; the real blurb is the leading paragraph(s). Strip
// the cruft and cap the length so it reads like a synopsis, not a data dump.
function cleanOpenLibraryDescription(raw: string): string {
  let text = raw
    .replace(/\r/g, "")
    .split(/\n-{3,}/)[0] // drop everything after a "----" separator (source/footnotes)
    .replace(/^\s*\[\d+\]:\s*\S+.*$/gm, "") // markdown link-reference definitions
    .replace(/\(\[[^\]]*\]\[\d+\]\)/g, "") // inline "([source][1])" citations
    .trim();

  const MAX = 600;
  if (text.length > MAX) {
    const cut = text.slice(0, MAX);
    const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    text = lastStop > 200 ? cut.slice(0, lastStop + 1) : cut.trimEnd() + "…";
  }
  return text.trim();
}

// Fetch a book's own description from Open Library (free, no Gemini quota).
// Returns null when OL has no usable description, so the caller falls back to Gemini.
async function fetchOpenLibraryDescription(openlibraryKey: string): Promise<string | null> {
  if (!/^\/works\/[A-Za-z0-9]+$/.test(openlibraryKey)) return null; // guard the URL
  try {
    const res = await fetch(`https://openlibrary.org${openlibraryKey}.json`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = typeof data.description === "string" ? data.description : data.description?.value;
    if (!raw || typeof raw !== "string") return null;
    const cleaned = cleanOpenLibraryDescription(raw);
    return cleaned.length >= 40 ? cleaned : null; // ignore stubs / one-liners
  } catch {
    return null;
  }
}

// Classify an already-written synopsis. Used for the Open Library path, where
// we have a description but never called Gemini - one small request, and only
// for a title the user has actually selected. Failure is non-fatal: the user
// just picks tags by hand.
async function generateTagsOnly(
  title: string,
  type: string,
  author: string | undefined,
  synopsis: string
): Promise<string[]> {
  try {
    const response = await generateSynopsis({
      contents: `Here is a ${type} called "${title}"${author ? ` by ${author}` : ""}.

Synopsis: ${synopsis}

${tagPromptInstruction()}

Respond in JSON format: { "tags": [...] }`,
      config: { responseMimeType: "application/json" },
    });
    return coerceTags(JSON.parse(response.text || "{}").tags);
  } catch {
    return [];
  }
}

// POST /api/synopsis - Get a synopsis (Open Library for books, else Gemini)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, type, author, year, openlibrary_key, user_message, conversation_history } = body;

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const sql = getDb();

  // Check cache first (only for initial generation, not corrections)
  if (!user_message) {
    const cacheKey = `${type}:${title}:${author || ""}`.toLowerCase();
    const cached = await sql(
      `SELECT * FROM tv_synopsis_cache WHERE lookup_key = $1`,
      [cacheKey]
    );
    if (cached.length > 0) {
      const cachedTags = Array.isArray(cached[0].tags)
        ? cached[0].tags
        : JSON.parse(cached[0].tags || "[]");
      let tags = coerceTags(cachedTags);

      // Rows cached before tags existed have none. Classify once and backfill
      // so the next nomination of this title is free again.
      if (tags.length === 0 && cached[0].synopsis) {
        tags = await generateTagsOnly(title, type, cached[0].author || author, cached[0].synopsis);
        if (tags.length > 0) {
          try {
            await sql(`UPDATE tv_synopsis_cache SET tags = $1 WHERE lookup_key = $2`, [
              JSON.stringify(tags),
              cacheKey,
            ]);
          } catch {
            // Backfill failure is non-critical - we still return the tags.
          }
        }
      }

      return NextResponse.json({
        synopsis: cached[0].synopsis,
        author: cached[0].author,
        tags,
        cached: true,
      });
    }
  }

  // For books, prefer Open Library's own description — it's free and spends no
  // Gemini quota. Only fall through to Gemini when OL has nothing usable.
  if (!user_message && type === "book" && openlibrary_key) {
    const olDescription = await fetchOpenLibraryDescription(openlibrary_key);
    if (olDescription) {
      // OL gave us prose but no tags, so spend one Gemini call to classify it.
      const tags = await generateTagsOnly(title, type, author, olDescription);
      const cacheKey = `${type}:${title}:${author || ""}`.toLowerCase();
      try {
        await sql(
          `INSERT INTO tv_synopsis_cache (id, lookup_key, synopsis, author, tags) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (lookup_key) DO NOTHING`,
          [nanoid(10), cacheKey, olDescription, author || null, JSON.stringify(tags)]
        );
      } catch {
        // Cache write failure is non-critical
      }
      return NextResponse.json({
        synopsis: olDescription,
        author: author || undefined,
        tags,
        source: "openlibrary",
      });
    }
  }

  // Build the prompt
  let prompt: string;
  if (user_message) {
    // User is correcting/chatting about the synopsis
    const history = conversation_history || [];
    const historyText = history
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    prompt = `You are helping someone write a short synopsis for a ${type} called "${title}"${author ? ` by ${author}` : ""}${year ? ` (${year})` : ""}.

Previous conversation:
${historyText}

User says: ${user_message}

Respond with a corrected or updated synopsis. Keep it to 2-3 sentences max. If the user says your info is wrong, trust them and adjust. Also include the author/director name if relevant.

Respond in JSON format: { "synopsis": "...", "author": "..." }`;
  } else {
    const subject = type === "movie"
      ? `the movie "${title}"${year ? ` (${year})` : ""}`
      : `the book "${title}"${author ? ` by ${author}` : ""}${year ? ` (${year})` : ""}`;
    const credit = type === "movie" ? "director name" : "author name";

    // Tags ride along in the same request as the synopsis - no extra quota.
    prompt = `Write a 2-3 sentence synopsis for ${subject}. Include the ${type === "movie" ? "director's" : "author's"} name.

${tagPromptInstruction()}

Respond in JSON format: { "synopsis": "...", "author": "${credit}", "tags": [...] }`;
  }

  try {
    const response = await generateSynopsis({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    let parsed: { synopsis: string; author?: string; tags?: unknown };

    try {
      parsed = JSON.parse(text);
    } catch {
      // If JSON parsing fails, use raw text as synopsis
      parsed = { synopsis: text, author: author || undefined };
    }

    // Drop anything the model invented outside the taxonomy.
    const tags = coerceTags(parsed.tags);

    // Cache the result (only for initial generations)
    if (!user_message && parsed.synopsis) {
      const cacheKey = `${type}:${title}:${author || ""}`.toLowerCase();
      try {
        await sql(
          `INSERT INTO tv_synopsis_cache (id, lookup_key, synopsis, author, tags) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (lookup_key) DO NOTHING`,
          [nanoid(10), cacheKey, parsed.synopsis, parsed.author || null, JSON.stringify(tags)]
        );
      } catch {
        // Cache write failure is non-critical
      }
    }

    return NextResponse.json({ ...parsed, tags });
  } catch (error) {
    console.error("Gemini error:", error);
    return NextResponse.json(
      { error: "Failed to generate synopsis" },
      { status: 500 }
    );
  }
}
