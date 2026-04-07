#!/usr/bin/env node

import process from "node:process";

import { defineCommand, runMain } from "citty";

import { CONFIG_BASENAME } from "./constants.js";
import { runSync } from "./sync.js";

const command = defineCommand({
  meta: {
    name: "wrangler-builds",
    description: "Sync Cloudflare Workers Build triggers from workers-build.jsonc files.",
  },
  args: {
    cwd: {
      type: "string",
      description: "Working directory used for discovery and resolving explicit config paths.",
      default: process.cwd(),
    },
    glob: {
      type: "string",
      description: `Glob used for config discovery when no explicit ${CONFIG_BASENAME} paths are passed.`,
    },
    "dry-run": {
      type: "boolean",
      description: "Print updates without mutating Cloudflare.",
      alias: "d",
    },
  },
  async run({ args }) {
    const patterns =
      typeof args.glob === "string" && args.glob.trim() ? [args.glob.trim()] : undefined;

    await runSync({
      cwd: typeof args.cwd === "string" && args.cwd.trim() ? args.cwd : process.cwd(),
      dryRun: Boolean(args["dry-run"]),
      explicitPaths: args._,
      patterns,
    });
  },
});

await runMain(command);
