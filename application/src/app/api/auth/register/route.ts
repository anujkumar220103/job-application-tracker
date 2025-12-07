// app/api/auth/register/route.ts
// export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
 
    const { registerUser } = await import('@/controllers/authController');
    const result = await registerUser(body);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error";
    return NextResponse.json({ error: message }, { status });
  }
}
