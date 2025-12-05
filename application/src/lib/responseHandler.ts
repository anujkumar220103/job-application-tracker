// frontend/src/lib/responseHandler.ts
import { NextResponse } from "next/server";

export function successResponse(data: any, message = "Success", status = 200) {
  return NextResponse.json(
    { success: true, message, data },
    { status }
  );
}

export function errorResponse(message = "Error", status = 500) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}
