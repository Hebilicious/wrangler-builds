import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfigFile, parseJsonc } from "../src/config.js";

const tempDirs: string[] = [];

const makeTempDir = async () => {
  const directory = await mkdtemp(join(tmpdir(), "cf-build-config-"));
  tempDirs.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("parseJsonc", () => {
  it("parses comments and trailing commas", () => {
    const result = parseJsonc(`
      {
        // comment
        "scriptName": "demo",
        "triggers": [
          {
            "name": "production",
            "deployCommand": "pnpm deploy",
            "branchIncludes": ["main",],
            "pathIncludes": ["apps/demo/**",],
          },
        ],
      }
    `);

    expect(result).toMatchObject({
      scriptName: "demo",
      triggers: [
        {
          name: "production",
          deployCommand: "pnpm deploy",
        },
      ],
    });
  });
});

describe("loadConfigFile", () => {
  it("normalizes defaults for enabled configs", async () => {
    const cwd = await makeTempDir();
    const filePath = join(cwd, "workers-build.jsonc");

    await mkdir(cwd, { recursive: true });
    await writeFile(
      filePath,
      `{
        "scriptName": "demo-worker",
        "buildCommand": "pnpm build",
        "rootDirectory": "apps/demo",
        "triggers": [
          {
            "name": "production",
            "deployCommand": "pnpm deploy",
            "branchIncludes": ["main"],
            "pathIncludes": ["src/**"]
          }
        ]
      }`,
    );

    const result = await loadConfigFile(filePath);

    expect(result).toEqual({
      configPath: filePath,
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
    });
  });

  it("allows disabled configs without a script name", async () => {
    const cwd = await makeTempDir();
    const filePath = join(cwd, "workers-build.jsonc");

    await writeFile(
      filePath,
      `{
        "enabled": false,
        "triggers": [
          {
            "name": "preview",
            "deployCommand": "pnpm deploy",
            "branchIncludes": ["main"],
            "pathIncludes": ["src/**"]
          }
        ]
      }`,
    );

    const result = await loadConfigFile(filePath);

    expect(result.enabled).toBe(false);
    expect(result.scriptName).toBeNull();
  });
});
