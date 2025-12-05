// src/app/api/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { getJobById, updateJob, deleteJob } from "@/controllers/jobController";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const job = await getJobById(Number(id));
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(job);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = context.params;
    const body = await req.json();

    // OPTIONAL: ensure ownership if needed (if job.userId !== user.id) -> throw 403
    // You can fetch job first and compare job.userId with user.id

    const updated = await updateJob(Number(id), {
      company: body.company,
      position: body.position,
      location: body.location,
      status: body.status,
      link: body.link,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: err?.status || 500 });
  }
}

export async function DELETE(req: Request, context: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = context.params;

    // OPTIONAL: check ownership before delete
    // const job = await getJobById(Number(id));
    // if (job?.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await deleteJob(Number(id));
    return NextResponse.json({ message: "Deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: err?.status || 500 });
  }
}
