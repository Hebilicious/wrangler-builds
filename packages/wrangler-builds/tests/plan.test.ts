import { describe, expect, it } from "vitest";

import { buildProjectPlan } from "../src/plan.js";

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

describe("buildProjectPlan", () => {
  it("marks matching triggers as no-op", () => {
    const result = buildProjectPlan({
      projectConfig,
      remoteTriggers: [
        {
          trigger_uuid: "uuid-1",
          trigger_name: "production",
          build_command: "pnpm build",
          deploy_command: "pnpm deploy",
          root_directory: "apps/demo",
          branch_includes: ["main"],
          branch_excludes: [],
          path_includes: ["src/**"],
          path_excludes: [],
        },
      ],
    });

    expect(result.actions).toEqual([
      {
        type: "noop",
        scriptName: "demo-worker",
        triggerName: "production",
        configPath: "/repo/apps/demo/workers-build.jsonc",
      },
    ]);
  });

  it("creates an update action when mutable fields drift", () => {
    const result = buildProjectPlan({
      projectConfig,
      remoteTriggers: [
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
      ],
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
  });

  it("fails when a configured trigger does not exist remotely", () => {
    expect(() =>
      buildProjectPlan({
        projectConfig,
        remoteTriggers: [],
      }),
    ).toThrow('Missing Cloudflare Build trigger "production" for demo-worker.');
  });
});
