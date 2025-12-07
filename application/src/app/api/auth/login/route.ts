
import { NextResponse } from "next/server";
import { loginUser } from "@/controllers/authController";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await loginUser(body);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error";
    return NextResponse.json({ error: message }, { status });
  }
}
 