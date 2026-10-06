import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../api-response";
import { getServerEnv } from "../env";

export type UploadCategory = "payment" | "match" | "dispute" | "tournament" | "avatar";
export interface StorageProvider {
  upload(file: File, category: UploadCategory): Promise<{ key: string; url: string }>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

const allowedImages = new Map([
  ["image/jpeg", { extension: ".jpg", signatures: [[0xff, 0xd8, 0xff]] }],
  ["image/png", { extension: ".png", signatures: [[0x89, 0x50, 0x4e, 0x47]] }],
  ["image/webp", { extension: ".webp", signatures: [[0x52, 0x49, 0x46, 0x46]] }],
] as const);
const maxFileSize = 5 * 1024 * 1024;

function hasSignature(bytes: Uint8Array, signatures: readonly (readonly number[])[]) {
  return signatures.some((signature) => signature.every((byte, index) => bytes[index] === byte));
}

class LocalStorageProvider implements StorageProvider {
  private readonly env = getServerEnv();

  async upload(file: File, category: UploadCategory) {
    const image = allowedImages.get(file.type as "image/jpeg" | "image/png" | "image/webp");
    if (!image) throw new AppError("UNSUPPORTED_FILE_TYPE", "Only JPG, PNG, and WEBP images are allowed.", 400);
    if (file.size === 0 || file.size > maxFileSize) throw new AppError("INVALID_FILE_SIZE", "Images must be between 1 byte and 5 MB.", 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasSignature(bytes, image.signatures)) throw new AppError("INVALID_FILE_CONTENT", "The uploaded file does not match its declared image type.", 400);
    const directoryName = `${category}-images`;
    const key = `${directoryName}/${randomUUID()}${image.extension}`;
    const root = path.resolve(process.cwd(), this.env.STORAGE_LOCAL_DIRECTORY);
    const destination = path.resolve(root, key);
    if (!destination.startsWith(`${root}${path.sep}`)) throw new AppError("INVALID_STORAGE_KEY", "Invalid storage destination.", 400);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });
    return { key, url: this.getPublicUrl(key) };
  }

  async delete(key: string) {
    const root = path.resolve(process.cwd(), this.env.STORAGE_LOCAL_DIRECTORY);
    const target = path.resolve(root, key);
    if (!target.startsWith(`${root}${path.sep}`)) throw new AppError("INVALID_STORAGE_KEY", "Invalid storage key.", 400);
    await unlink(target).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
  }

  getPublicUrl(key: string) {
    return `${this.env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key.replaceAll("\\", "/")}`;
  }
}

let provider: StorageProvider | undefined;
export function getStorageProvider() { provider ??= new LocalStorageProvider(); return provider; }

