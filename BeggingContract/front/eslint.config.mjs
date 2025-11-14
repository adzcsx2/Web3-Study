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
  ...compat.extends("prettier"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  // Turn off anonymous default export rule project-wide (prevents
  // "Assign object to a variable before exporting as module default" warnings)
  {
    rules: {
      // This rule comes from eslint-plugin-import via the shared Next.js config.
      // Disabling it here ensures files that export default anonymous objects
      // like `export default { ... }` won't trigger ESLint errors.
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default eslintConfig;
