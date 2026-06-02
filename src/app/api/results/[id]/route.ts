import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/results/[id] - Get tallied results for a session
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const session = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [id]);
  if (session.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const nominations = await sql(
    `SELECT * FROM tv_nominations WHERE session_id = $1`,
    [id]
  );

  const votes = await sql(
    `SELECT * FROM tv_votes WHERE session_id = $1`,
    [id]
  );

  // Tally scores
  const scores: Record<string, { score: number; gold: number; silver: number; bronze: number }> = {};
  for (const nom of nominations) {
    scores[nom.id] = { score: 0, gold: 0, silver: 0, bronze: 0 };
  }

  for (const vote of votes) {
    if (vote.gold_nomination_id && scores[vote.gold_nomination_id]) {
      scores[vote.gold_nomination_id].score += 3;
      scores[vote.gold_nomination_id].gold += 1;
    }
    if (vote.silver_nomination_id && scores[vote.silver_nomination_id]) {
      scores[vote.silver_nomination_id].score += 2;
      scores[vote.silver_nomination_id].silver += 1;
    }
    if (vote.bronze_nomination_id && scores[vote.bronze_nomination_id]) {
      scores[vote.bronze_nomination_id].score += 1;
      scores[vote.bronze_nomination_id].bronze += 1;
    }
  }

  const results = nominations
    .map((nom: Record<string, unknown>) => ({
      ...nom,
      score: scores[nom.id as string]?.score || 0,
      gold_count: scores[nom.id as string]?.gold || 0,
      silver_count: scores[nom.id as string]?.silver || 0,
      bronze_count: scores[nom.id as string]?.bronze || 0,
    }))
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  // Strip admin_token from session
  const { admin_token: _, ...publicSession } = session[0];

  return NextResponse.json({
    session: publicSession,
    results,
    total_votes: votes.length,
  });
}
