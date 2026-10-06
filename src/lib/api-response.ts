import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "AppError";
  }
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export function handleApiError(error: unknown, fallback = "The request could not be completed.") {
  if (error instanceof AppError) return apiError(error.code, error.message, error.status);
  if (error instanceof ZodError) return apiError("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request.", 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return apiError("CONFLICT", "A record with those details already exists.", 409);
  }
  console.error("Unhandled API error", error instanceof Error ? error.message : error);
  return apiError("INTERNAL_ERROR", fallback, 500);
}

