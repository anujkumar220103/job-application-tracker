// src/app/api/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { getJobById, updateJob, deleteJob } from "@/controllers/jobController";
import { getUserFromRequest } from "@/lib/auth";

function parseId(id: unknown): number | null {
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params;
    const id = parseId(params.id);
    if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const job = await getJobById(id);
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(job, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/jobs/[id] error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = parseId(params.id);
    if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const existing = await getJobById(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId && existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dataToUpdate: Partial<{
      company: string;
      position: string;
      location: string;
      status: string;
      link: string;
    }> = {};
    if ("company" in body) dataToUpdate.company = body.company;
    if ("position" in body) dataToUpdate.position = body.position;
    if ("location" in body) dataToUpdate.location = body.location;
    if ("status" in body) dataToUpdate.status = body.status;
    if ("link" in body) dataToUpdate.link = body.link;

    const updated = await updateJob(id, dataToUpdate);
    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("PUT /api/jobs/[id] error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: err?.status || 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const id = parseId(params.id);
    if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const existing = await getJobById(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId && existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteJob(id);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/jobs/[id] error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: err?.status || 500 });
  }
}
