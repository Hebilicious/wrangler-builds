import process from "node:process";

import { describe, expect, it, vi } from "vitest";

import { getCurrentConfig, runShow } from "../src/show.js";

describe("getCurrentConfig", () => {
  it("returns the current Cloudflare trigger config for one workers-build file", async () => {
    const client = {
      listTriggers: vi.fn().mockResolvedValue([
        {
          trigger_uuid: "trigger-uuid",
          trigger_name: "production",
          build_command: "npm run build",
          deploy_command: "pnpm deploy",
          root_directory: "apps/demo",
          branch_includes: ["main"],
          branch_excludes: [],
          path_includes: ["src/**"],
          path_excludes: [],
        },
      ]),
      patchTrigger: vi.fn(),
    };

    const result = await getCurrentConfig({
      configPath: "/repo/workers-build.jsonc",
      loadConfigFile: async () => ({
        configPath: "/repo/workers-build.jsonc",
        enabled: true,
        scriptName: "demo-worker",
        triggers: [
          {
            name: "production",
            buildCommand: "pnpm build",
            deployCommand: "pnpm deploy",
            rootDirectory: "apps/demo",
            branchIncludes: ["main"],
            branchExcludes: [],
            pathIncludes: ["src/**"],
            pathExcludes: [],
          },
        ],
      }),
      client,
    });

    expect(client.listTriggers).toHaveBeenCalledWith("demo-worker");
    expect(result).toEqual({
      configPath: "/repo/workers-build.jsonc",
      enabled: true,
      scriptName: "demo-worker",
      triggers: [
        {
          name: "production",
          current: {
            triggerUuid: "trigger-uuid",
            buildCommand: "npm run build",
            deployCommand: "pnpm deploy",
            rootDirectory: "apps/demo",
            branchIncludes: ["main"],
            branchExcludes: [],
            pathIncludes: ["src/**"],
            pathExcludes: [],
          },
        },
      ],
    });
  });

  it("resolves the config path from cwd before loading Cloudflare state", async () => {
    const getCurrentConfigImpl = vi.fn().mockResolvedValue({ ok: true });
    const createCloudflareClient = vi.fn().mockReturnValue({
      listTriggers: vi.fn(),
      patchTrigger: vi.fn(),
    });

    const result = await runShow({
      cwd: "/repo",
      configPath: "configs/demo/workers-build.jsonc",
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: "account-id",
        CLOUDFLARE_API_TOKEN: "token",
      },
      createCloudflareClient,
      getCurrentConfig: getCurrentConfigImpl,
    });

    expect(createCloudflareClient).toHaveBeenCalledWith({
      accountId: "account-id",
      token: "token",
    });
    expect(getCurrentConfigImpl).toHaveBeenCalledWith({
      client: createCloudflareClient.mock.results[0]?.value,
      configPath: "/repo/configs/demo/workers-build.jsonc",
    });
    expect(result).toEqual({ ok: true });
  });
});
