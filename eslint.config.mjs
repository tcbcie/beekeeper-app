import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat configs, so no FlatCompat bridge is needed.
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  // eslint-config-next 16 added the React Compiler hook rules (react-hooks v7); their default is
  // error. set-state-in-effect alone stays a warning: existing code has about 170 findings, mostly
  // the load-in-an-effect pattern (docs/features/deferred-items-review-plan.md, L2). The other
  // five were cleared on 15/11/2026 and are errors again.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
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
