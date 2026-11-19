import { defaultConfig } from "@caido/eslint-config";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...defaultConfig(),
  {
    // Caido plugins run in Caido's own Chromium, not in Opera Mini or KaiOS.
    settings: { targets: ["last 2 Chrome versions"] },
    rules: {
      // null is part of the data here (DOM and Vue refs, stored state, SDK
      // values), so banning it as a type would only move it out of sight.
      "@typescript-eslint/no-restricted-types": "off",
    },
  },
  {
    // Tests mock freely: loose types, async stubs, vi.mock before imports.
    files: ["**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-require-imports": "off",
      "import/first": "off",
    },
  },
];
