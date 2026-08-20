import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";

// POST /api/sessions - Create a new session (admin)
export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { name, type, streaming_services, max_nominations } = body;

  if (!name || !type || !["movie", "book"].includes(type)) {
    return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
  }

  const id = nanoid(10);
  const admin_token = nanoid(20);
  const services = streaming_services || [
    "Apple TV+",
    "Prime Video",
    "Disney+",
    "Peacock",
  ];

  const maxNoms = max_nominations || 1;

  await sql(
    `INSERT INTO tv_sessions (id, name, type, admin_token, streaming_services, max_nominations)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, name, type, admin_token, JSON.stringify(services), maxNoms]
  );

  return NextResponse.json({ id, admin_token });
}

// GET /api/sessions - List all sessions, admin_token stripped (not used by
// the current UI, which tracks each admin's own sessions in localStorage
// instead - kept for compatibility, but must never leak admin tokens).
export async function GET() {
  const sql = getDb();
  const sessions = await sql(`SELECT * FROM tv_sessions ORDER BY created_at DESC`);
  const publicSessions = sessions.map(({ admin_token: _admin_token, ...rest }: Record<string, unknown>) => rest);
  return NextResponse.json(publicSessions);
}
