
import { NextResponse } from "next/server";
import { registerUser } from "@/controllers/authController";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await registerUser(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error";
    return NextResponse.json({ error: message }, { status });
  }
}
