export const CONFIG_BASENAME = "workers-build.jsonc";

export const DEFAULT_DISCOVERY_PATTERNS = [`**/${CONFIG_BASENAME}`];

export const DEFAULT_IGNORE_PATTERNS = [
  "**/.git/**",
  "**/.moon/**",
  "**/.nuxt/**",
  "**/.output/**",
  "**/.wrangler/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
];
