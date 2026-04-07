import { describe, expect, it, vi } from "vitest";

import { syncWorkersBuildConfigs } from "../src/sync.js";

const projectConfig = {
  configPath: "/repo/apps/demo/workers-build.jsonc",
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
};

describe("syncWorkersBuildConfigs", () => {
  it("does not patch remote triggers during dry-run", async () => {
    const logs: string[] = [];
    const client = {
      listTriggers: vi.fn().mockResolvedValue([
        {
          trigger_uuid: "uuid-1",
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

    const result = await syncWorkersBuildConfigs({
      projectConfigs: [projectConfig],
      client,
      dryRun: true,
      logger: {
        info: (message) => logs.push(message),
      },
    });

    expect(result.actions).toEqual([
      {
        type: "update",
        scriptName: "demo-worker",
        triggerName: "production",
        triggerUuid: "uuid-1",
        configPath: "/repo/apps/demo/workers-build.jsonc",
        payload: {
          trigger_name: "production",
          build_command: "pnpm build",
          deploy_command: "pnpm deploy",
          root_directory: "apps/demo",
          branch_includes: ["main"],
          branch_excludes: [],
          path_includes: ["src/**"],
          path_excludes: [],
        },
      },
    ]);
    expect(client.patchTrigger).not.toHaveBeenCalled();
    expect(logs).toEqual(["~ demo-worker: would update production"]);
  });

  it("surfaces missing trigger failures before applying mutations", async () => {
    const client = {
      listTriggers: vi.fn().mockResolvedValue([]),
      patchTrigger: vi.fn(),
    };

    await expect(
      syncWorkersBuildConfigs({
        projectConfigs: [projectConfig],
        client,
        dryRun: false,
      }),
    ).rejects.toThrow('Missing Cloudflare Build trigger "production" for demo-worker.');
    expect(client.patchTrigger).not.toHaveBeenCalled();
  });
});
