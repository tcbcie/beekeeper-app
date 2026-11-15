import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat configs, so no FlatCompat bridge is needed.
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  // eslint-config-next 16 added the React Compiler hook rules (react-hooks v7). Existing code had
  // 207 findings on 15/11/2026 (169 set-state-in-effect). Warnings until a clean-up batch, so new
  // findings stay visible without blocking CI. See docs/features/nextjs-16-upgrade-plan.md.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
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
      // Local scratch output (git-ignored)
      ".codex-temp/**",
      // Third-party skills, installed copies that are not ours to change
      ".agents/**",
      ".claude/**",
    ],
  },
];

export default eslintConfig;
