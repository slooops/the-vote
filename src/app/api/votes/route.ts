import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";

// POST /api/votes - Submit or update a ranked ballot (upsert)
export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { session_id, voter_token, voter_name, rankings } = body;

  if (!session_id || !voter_token || !voter_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!Array.isArray(rankings) || rankings.some((r) => typeof r !== "string")) {
    return NextResponse.json({ error: "rankings must be an array of nomination ids" }, { status: 400 });
  }
  if (rankings.length === 0) {
    return NextResponse.json({ error: "Rank at least one nomination" }, { status: 400 });
  }
  if (new Set(rankings).size !== rankings.length) {
    return NextResponse.json({ error: "Cannot rank the same nomination twice" }, { status: 400 });
  }

  // Check session is accepting votes
  const session = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [session_id]);
  if (session.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session[0].status !== "voting_open") {
    return NextResponse.json({ error: "Voting is not open" }, { status: 400 });
  }

  // Validate every ranked id actually belongs to this session
  const noms = await sql(`SELECT id FROM tv_nominations WHERE session_id = $1`, [session_id]);
  const validIds = new Set(noms.map((n: Record<string, unknown>) => n.id as string));
  if (rankings.some((nomId: string) => !validIds.has(nomId))) {
    return NextResponse.json({ error: "Unknown nomination in rankings" }, { status: 400 });
  }

  // Upsert vote
  const existing = await sql(
    `SELECT * FROM tv_votes WHERE session_id = $1 AND voter_token = $2`,
    [session_id, voter_token]
  );

  if (existing.length > 0) {
    await sql(
      `UPDATE tv_votes SET rankings = $1, voter_name = $2, updated_at = NOW()
       WHERE session_id = $3 AND voter_token = $4`,
      [JSON.stringify(rankings), voter_name, session_id, voter_token]
    );
  } else {
    const id = nanoid(10);
    await sql(
      `INSERT INTO tv_votes (id, session_id, voter_token, voter_name, rankings)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, session_id, voter_token, voter_name, JSON.stringify(rankings)]
    );
  }

  return NextResponse.json({ success: true });
}

// GET /api/votes?session_id=xxx&voter_token=yyy - Get user's vote
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
