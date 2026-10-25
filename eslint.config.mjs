import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".legacy/**",
    "node_modules/**",
    "mobile/**",
    ".data/**",
    "public/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Server components legitimately read the clock; these rules are aimed at
      // client render purity and produce false positives in async pages.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
