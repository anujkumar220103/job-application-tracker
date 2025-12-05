// src/app/api/jobs/route.ts
import { NextResponse } from "next/server";
import { getAllJobs, createJob } from "@/controllers/jobController";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const jobs = await getAllJobs(user.id);
    return NextResponse.json(jobs);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: err?.status || 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { company, position, location, status, link } = body ?? {};

    if (!company || !position) {
      return NextResponse.json({ error: "company and position are required" }, { status: 400 });
    }

    const job = await createJob({
      company: String(company),
      position: String(position),
      location: location ? String(location) : "",
      status: status ? String(status) : "pending",
      link: link ? String(link) : "",
      userId: user.id,
    });

    return NextResponse.json(job, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: err?.status || 500 });
  }
}
