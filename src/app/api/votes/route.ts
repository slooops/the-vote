import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";

// POST /api/votes - Submit or update votes (upsert)
export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const {
    session_id,
    voter_token,
    voter_name,
    gold_nomination_id,
    silver_nomination_id,
    bronze_nomination_id,
  } = body;

  if (!session_id || !voter_token || !voter_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check session is accepting votes
  const session = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [session_id]);
  if (session.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session[0].status !== "voting_open") {
    return NextResponse.json({ error: "Voting is not open" }, { status: 400 });
  }

  // Validate no duplicate picks
  const picks = [gold_nomination_id, silver_nomination_id, bronze_nomination_id].filter(Boolean);
  if (new Set(picks).size !== picks.length) {
    return NextResponse.json({ error: "Cannot vote for the same item twice" }, { status: 400 });
  }

  // Upsert vote
  const existing = await sql(
    `SELECT * FROM tv_votes WHERE session_id = $1 AND voter_token = $2`,
    [session_id, voter_token]
  );

  if (existing.length > 0) {
    await sql(
      `UPDATE tv_votes SET gold_nomination_id = $1, silver_nomination_id = $2, bronze_nomination_id = $3, voter_name = $4, updated_at = NOW()
       WHERE session_id = $5 AND voter_token = $6`,
      [gold_nomination_id || null, silver_nomination_id || null, bronze_nomination_id || null, voter_name, session_id, voter_token]
    );
  } else {
    const id = nanoid(10);
    await sql(
      `INSERT INTO tv_votes (id, session_id, voter_token, voter_name, gold_nomination_id, silver_nomination_id, bronze_nomination_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, session_id, voter_token, voter_name, gold_nomination_id || null, silver_nomination_id || null, bronze_nomination_id || null]
    );
  }

  return NextResponse.json({ success: true });
}

// GET /api/votes?session_id=xxx&voter_token=yyy - Get user's votes
export async function GET(req: NextRequest) {
  const sql = getDb();
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const voterToken = req.nextUrl.searchParams.get("voter_token");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  if (voterToken) {
    const votes = await sql(
      `SELECT * FROM tv_votes WHERE session_id = $1 AND voter_token = $2`,
      [sessionId, voterToken]
    );
    return NextResponse.json(votes[0] || null);
  }

  // Return vote count (not individual votes — anonymous)
  const votes = await sql(`SELECT * FROM tv_votes WHERE session_id = $1`, [sessionId]);
  return NextResponse.json({ count: votes.length });
}
