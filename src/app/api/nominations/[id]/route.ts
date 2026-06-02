import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// DELETE /api/nominations/[id] - Delete a nomination (admin or nominator)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const { voter_token, admin_token } = await req.json();

  const nom = await sql(`SELECT * FROM tv_nominations WHERE id = $1`, [id]);
  if (nom.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check authorization - either the nominator or admin
  if (admin_token) {
    const session = await sql(`SELECT * FROM tv_sessions WHERE id = $1`, [nom[0].session_id]);
    if (session[0].admin_token !== admin_token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  } else if (nom[0].nominated_by_token !== voter_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await sql(`DELETE FROM tv_nominations WHERE id = $1`, [id]);
  return NextResponse.json({ success: true });
}

// PATCH /api/nominations/[id] - Update nomination (synopsis, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const body = await req.json();
  const { voter_token, synopsis, author, poster_url, streaming_availability, streaming_rent, availability } = body;

  const nom = await sql(`SELECT * FROM tv_nominations WHERE id = $1`, [id]);
  if (nom.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (nom[0].nominated_by_token !== voter_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (synopsis !== undefined) { updates.push(`synopsis = $${i++}`); values.push(synopsis); }
  if (author !== undefined) { updates.push(`author = $${i++}`); values.push(author); }
  if (poster_url !== undefined) { updates.push(`poster_url = $${i++}`); values.push(poster_url); }
  if (streaming_availability !== undefined) {
    updates.push(`streaming_availability = $${i++}`);
    values.push(JSON.stringify(streaming_availability));
  }
  if (streaming_rent !== undefined) {
    updates.push(`streaming_rent = $${i++}`);
    values.push(JSON.stringify(streaming_rent));
  }
  if (availability !== undefined) { updates.push(`availability = $${i++}`); values.push(availability); }

  if (updates.length > 0) {
    values.push(id);
    await sql(`UPDATE tv_nominations SET ${updates.join(", ")} WHERE id = $${i}`, values);
  }

  const updated = await sql(`SELECT * FROM tv_nominations WHERE id = $1`, [id]);
  return NextResponse.json(updated[0]);
}
