import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  STORAGE_PROVIDER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_DIRECTORY: z.string().default("public/uploads"),
  STORAGE_PUBLIC_BASE_URL: z.string().default("/uploads"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

