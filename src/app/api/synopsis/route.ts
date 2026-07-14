import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Gemini occasionally returns transient errors — 503 (model overloaded /
// "high demand"), 429 (burst rate limit), or a 5xx. Retry those a couple of
// times with exponential backoff before giving up. Non-transient errors
// (bad key, hard quota, malformed request) fail fast on the first attempt.
type GenParams = Parameters<typeof genai.models.generateContent>[0];
async function generateWithRetry(params: GenParams, attempts = 3) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await genai.models.generateContent(params);
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      const transient =
        status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (!transient || i === attempts - 1) throw error;
      // Backoff: 500ms, 1000ms, ...
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
    }
  }
  throw lastError;
}

// POST /api/synopsis - Generate or correct a synopsis via Gemini
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, type, author, year, user_message, conversation_history } = body;

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
      return NextResponse.json({
        synopsis: cached[0].synopsis,
        author: cached[0].author,
        cached: true,
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
    prompt = type === "movie"
      ? `Write a 2-3 sentence synopsis for the movie "${title}"${year ? ` (${year})` : ""}. Include the director's name. Respond in JSON format: { "synopsis": "...", "author": "director name" }`
      : `Write a 2-3 sentence synopsis for the book "${title}"${author ? ` by ${author}` : ""}${year ? ` (${year})` : ""}. Include the author's name. Respond in JSON format: { "synopsis": "...", "author": "author name" }`;
  }

  try {
    const response = await generateWithRetry({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    let parsed: { synopsis: string; author?: string };

    try {
      parsed = JSON.parse(text);
    } catch {
      // If JSON parsing fails, use raw text as synopsis
      parsed = { synopsis: text, author: author || undefined };
    }

    // Cache the result (only for initial generations)
    if (!user_message && parsed.synopsis) {
      const cacheKey = `${type}:${title}:${author || ""}`.toLowerCase();
      try {
        await sql(
          `INSERT INTO tv_synopsis_cache (id, lookup_key, synopsis, author) VALUES ($1, $2, $3, $4) ON CONFLICT (lookup_key) DO NOTHING`,
          [nanoid(10), cacheKey, parsed.synopsis, parsed.author || null]
        );
      } catch {
        // Cache write failure is non-critical
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Gemini error:", error);
    return NextResponse.json(
      { error: "Failed to generate synopsis" },
      { status: 500 }
    );
  }
}
