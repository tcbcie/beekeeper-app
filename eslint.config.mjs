import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Generated output, a Python project with its own virtual environment (about 1 GB),
      // static assets, and Supabase files. None of it is ours to lint; the hand-written
      // service worker in public/ is the exception.
      "coverage/**",
      "varroa-detector/**",
      "public/**",
      "!public/service-worker.js",
      "supabase/**",
    ],
  },
];

export default eslintConfig;
