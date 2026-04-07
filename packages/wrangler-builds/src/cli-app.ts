import process from "node:process";

import { defineCommand } from "citty";

import { CONFIG_BASENAME } from "./constants.js";
import { runShow } from "./show.js";
import { runSync } from "./sync.js";

const createArgumentError = (message: string): Error & { code: string } =>
  Object.assign(new Error(message), { code: "EARG" });

export const createWranglerBuildsCommand = ({
  runSync: runSyncImpl = runSync,
  showConfig: showConfigImpl = runShow,
  write = (_value: string) => undefined,
}: {
  runSync?: typeof runSync;
  showConfig?: (input: { configPath: string; cwd: string }) => Promise<unknown>;
  write?: (value: string) => void;
} = {}) =>
  defineCommand({
    meta: {
      name: "wrangler-builds",
      description: [
        "Sync Cloudflare Workers Build triggers from workers-build.jsonc files.",
        "",
        "Main usage:",
        "  wrangler-builds <path-to-workers-build.jsonc>",
        "  wrangler-builds show <path-to-workers-build.jsonc>",
        "",
        "Advanced discovery:",
        "  wrangler-builds sync --cwd <dir> --glob '**/workers-build.jsonc'",
      ].join("\n"),
    },
    args: {
      cwd: {
        type: "string",
        description: "Working directory for resolving config paths and advanced discovery.",
        default: process.cwd(),
      },
      glob: {
        type: "string",
        description: `Advanced: discover multiple ${CONFIG_BASENAME} files from --cwd.`,
      },
      "dry-run": {
        type: "boolean",
        description: "Preview sync changes without mutating Cloudflare.",
        alias: "d",
      },
    },
    async run({ args }) {
      const patterns =
        typeof args.glob === "string" && args.glob.trim() ? [args.glob.trim()] : undefined;
      const cwd = typeof args.cwd === "string" && args.cwd.trim() ? args.cwd : process.cwd();
      const [firstArg, ...remainingArgs] = args._;

      if (firstArg === "show") {
        const configPath = remainingArgs[0];

        if (typeof configPath !== "string" || !configPath.trim()) {
          throw createArgumentError("Missing required positional argument: CONFIG");
        }

        const currentConfig = await showConfigImpl({
          configPath,
          cwd,
        });

        write(`${JSON.stringify(currentConfig, null, 2)}\n`);
        return;
      }

      const explicitPaths = firstArg === "sync" ? remainingArgs : args._;

      if (explicitPaths.length === 0 && patterns === undefined) {
        throw createArgumentError(
          "Pass a workers-build.jsonc path, or use `sync --glob ...` for advanced discovery.",
        );
      }

      await runSyncImpl({
        cwd,
        dryRun: Boolean(args["dry-run"]),
        explicitPaths,
        patterns,
      });
    },
  });
