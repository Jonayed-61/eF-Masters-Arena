import { NextResponse } from "next/server";
import { requireUser } from "@/lib/permissions";
import { getStorageProvider, UploadCategory } from "@/lib/storage";
import { AppError, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireUser();
    const formData = await req.formData();
    const file = formData.get("file");
    const requestedType = String(formData.get("type") || "payment");
    const uploadType: UploadCategory = ["payment", "match", "dispute", "tournament", "avatar"].includes(requestedType)
      ? requestedType as UploadCategory
      : "payment";

    if (!(file instanceof File)) {
      throw new AppError("FILE_REQUIRED", "Please select an image file.", 400);
    }

    const upload = await getStorageProvider().upload(file, uploadType);
    return NextResponse.json({ success: true, url: upload.url, key: upload.key });
  } catch (err: unknown) {
    return handleApiError(err, "Screenshot upload failed.");
  }
}
