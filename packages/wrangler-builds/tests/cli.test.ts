import process from "node:process";

import { runCommand } from "citty";
import { describe, expect, it, vi } from "vitest";

import { createWranglerBuildsCommand } from "../src/cli-app.js";

describe("wrangler-builds CLI", () => {
  it("syncs an explicit config path by default", async () => {
    const runSync = vi.fn().mockResolvedValue({ actions: [] });
    const showConfig = vi.fn();
    const write = vi.fn();

    await runCommand(
      createWranglerBuildsCommand({
        runSync,
        showConfig,
        write,
      }),
      {
        rawArgs: ["configs/demo/workers-build.jsonc"],
      },
    );

    expect(runSync).toHaveBeenCalledWith({
      cwd: process.cwd(),
      dryRun: false,
      explicitPaths: ["configs/demo/workers-build.jsonc"],
      patterns: undefined,
    });
    expect(showConfig).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("shows the current config for an explicit path", async () => {
    const runSync = vi.fn();
    const showConfig = vi.fn().mockResolvedValue({
      scriptName: "demo-worker",
      triggers: [],
    });
    const write = vi.fn();

    await runCommand(
      createWranglerBuildsCommand({
        runSync,
        showConfig,
        write,
      }),
      {
        rawArgs: ["show", "configs/demo/workers-build.jsonc"],
      },
    );

    expect(showConfig).toHaveBeenCalledWith({
      configPath: "configs/demo/workers-build.jsonc",
      cwd: process.cwd(),
    });
    expect(runSync).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith('{\n  "scriptName": "demo-worker",\n  "triggers": []\n}\n');
  });

  it("supports advanced discovery with the sync command", async () => {
    const runSync = vi.fn().mockResolvedValue({ actions: [] });
    const showConfig = vi.fn();
    const write = vi.fn();

    await runCommand(
      createWranglerBuildsCommand({
        runSync,
        showConfig,
        write,
      }),
      {
        rawArgs: ["sync", "--cwd", "/repo", "--glob", "configs/**/workers-build.jsonc"],
      },
    );

    expect(runSync).toHaveBeenCalledWith({
      cwd: "/repo",
      dryRun: false,
      explicitPaths: [],
      patterns: ["configs/**/workers-build.jsonc"],
    });
    expect(showConfig).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("requires an explicit config path unless advanced discovery is requested", async () => {
    const runSync = vi.fn();

    await expect(
      runCommand(
        createWranglerBuildsCommand({
          runSync,
          showConfig: vi.fn(),
          write: vi.fn(),
        }),
        {
          rawArgs: [],
        },
      ),
    ).rejects.toThrowError(
      "Pass a workers-build.jsonc path, or use `sync --glob ...` for advanced discovery.",
    );

    expect(runSync).not.toHaveBeenCalled();
  });
});
