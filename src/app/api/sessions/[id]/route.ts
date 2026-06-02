import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/sessions/[id] - Get session details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const rows = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [id]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Don't expose admin_token in public GET
  const session = rows[0];
  const { admin_token: _, ...publicSession } = session;
  return NextResponse.json(publicSession);
}

// PATCH /api/sessions/[id] - Update session (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const body = await req.json();
  const { admin_token, status, streaming_services, name } = body;

  // Verify admin
  const rows = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [id]);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (rows[0].admin_token !== admin_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) {
    updates.push(`status = $${paramIndex++}`);
    values.push(status);
  }
  if (streaming_services) {
    updates.push(`streaming_services = $${paramIndex++}`);
    values.push(JSON.stringify(streaming_services));
  }
  if (name) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  await sql(
    `UPDATE tv_sessions SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
    values
  );

  const updated = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [id]);
  return NextResponse.json(updated[0]);
}

// DELETE /api/sessions/[id] - Delete session (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const body = await req.json();
  const { admin_token } = body;

  const rows = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [id]);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (rows[0].admin_token !== admin_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // CASCADE will delete nominations and votes
  await sql(`DELETE FROM tv_sessions WHERE id = $1`, [id]);
  return NextResponse.json({ success: true });
}
