import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

const sourceFiles = ["**/*.ts", "**/*.mts"];
const recommendedConfig = obsidianmd.configs.recommended.map((config) => {
  const hasGlobalObsidianRules = !config.files
    && config.rules
    && Object.keys(config.rules).some((rule) => rule.startsWith("obsidianmd/"));

  return hasGlobalObsidianRules
    ? { ...config, files: sourceFiles }
    : config;
});

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "main.js",
      "node_modules/**",
      "test-vault/**"
    ]
  },
  ...recommendedConfig,
  {
    files: sourceFiles,
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json"
      }
    }
  }
]);
