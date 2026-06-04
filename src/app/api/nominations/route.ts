import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";

// POST /api/nominations - Create a nomination
export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const {
    session_id,
    title,
    poster_url,
    synopsis,
    author,
    year,
    tmdb_id,
    openlibrary_key,
    streaming_availability,
    streaming_rent,
    availability,
    voter_token,
    voter_name,
  } = body;

  if (!session_id || !title || !voter_token || !voter_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check session is accepting nominations
  const session = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [session_id]);
  if (session.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session[0].status !== "nominations_open") {
    return NextResponse.json({ error: "Nominations are closed" }, { status: 400 });
  }

  // Check nomination count vs max_nominations
  const maxNoms = session[0].max_nominations || 1;
  const existing = await sql(
    `SELECT * FROM tv_nominations WHERE session_id = $1 AND nominated_by_token = $2`,
    [session_id, voter_token]
  );

  // If replacing (single-nom mode or explicit replace via replace_id)
  const replaceId = body.replace_id;
  if (replaceId) {
    await sql(`DELETE FROM tv_nominations WHERE id = $1 AND nominated_by_token = $2`, [replaceId, voter_token]);
  } else if (existing.length >= maxNoms) {
    // 0 = unlimited
    if (maxNoms !== 0) {
      return NextResponse.json(
        { error: `You've already used all ${maxNoms} nomination${maxNoms > 1 ? "s" : ""}`, existing: existing[0] },
        { status: 409 }
      );
    }
  }

  const id = nanoid(10);
  await sql(
    `INSERT INTO tv_nominations (id, session_id, title, poster_url, synopsis, author, year, tmdb_id, openlibrary_key, streaming_availability, streaming_rent, availability, nominated_by_token, nominated_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id, session_id, title, poster_url || null, synopsis || null,
      author || null, year || null, tmdb_id || null, openlibrary_key || null,
      JSON.stringify(streaming_availability || []),
      JSON.stringify(streaming_rent || []),
      availability || "unavailable",
      voter_token, voter_name,
    ]
  );

  const nom = await sql(`SELECT * FROM tv_nominations WHERE id = $1`, [id]);
  return NextResponse.json(nom[0]);
}

// GET /api/nominations?session_id=xxx - Get all nominations for a session
export async function GET(req: NextRequest) {
  const sql = getDb();
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const nominations = await sql(
    `SELECT * FROM tv_nominations WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );

  return NextResponse.json(nominations);
}
