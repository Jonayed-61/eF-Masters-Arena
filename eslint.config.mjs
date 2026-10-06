import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: directory });

const config = [
  { ignores: [".next/**", "node_modules/**", ".npm-cache/**", "public/uploads/**", "next-env.d.ts", "prisma/seed.ts", "scripts/register-tests.cjs"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
