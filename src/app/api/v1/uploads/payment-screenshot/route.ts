import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const maxFileSize = 5 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    await requireAuth();
    const formData = await req.formData();
    const file = formData.get("file");
    const uploadType = formData.get("type") === "match" ? "match" : "payment";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please select an image file." }, { status: 400 });
    }

    const extension = allowedTypes.get(file.type);
    if (!extension) {
      return NextResponse.json({ error: "Only JPG, PNG, and WEBP images are allowed." }, { status: 400 });
    }
    if (file.size === 0 || file.size > maxFileSize) {
      return NextResponse.json({ error: "Screenshot must be smaller than 5MB." }, { status: 400 });
    }

    const directoryName = uploadType === "match" ? "match-screenshots" : "payment-screenshots";
    const directory = path.join(process.cwd(), "public", "uploads", directoryName);
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ success: true, url: `/uploads/${directoryName}/${filename}` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Screenshot upload failed";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}