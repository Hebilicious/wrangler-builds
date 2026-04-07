import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { discoverConfigFiles } from "../src/discovery.js";

const tempDirs: string[] = [];

const makeTempDir = async () => {
  const directory = await mkdtemp(join(tmpdir(), "cf-build-discovery-"));
  tempDirs.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (directory) => {
      const { rm } = await import("node:fs/promises");
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("discoverConfigFiles", () => {
  it("returns sorted explicit paths resolved from the provided cwd", async () => {
    const cwd = await makeTempDir();
    const alpha = join(cwd, "alpha", "workers-build.jsonc");
    const beta = join(cwd, "beta", "workers-build.jsonc");

    await mkdir(join(cwd, "alpha"), { recursive: true });
    await mkdir(join(cwd, "beta"), { recursive: true });
    await writeFile(alpha, "{}");
    await writeFile(beta, "{}");

    const result = await discoverConfigFiles({
      cwd,
      explicitPaths: ["beta/workers-build.jsonc", "alpha/workers-build.jsonc"],
    });

    expect(result).toEqual([resolve(alpha), resolve(beta)]);
  });

  it("discovers matching files from a caller-provided cwd and glob", async () => {
    const cwd = await makeTempDir();
    const docsConfig = join(cwd, "docs", "workers-build.jsonc");
    const appConfig = join(cwd, "packages", "app", "workers-build.jsonc");
    const ignoredConfig = join(cwd, "node_modules", "dep", "workers-build.jsonc");

    await mkdir(join(cwd, "docs"), { recursive: true });
    await mkdir(join(cwd, "packages", "app"), { recursive: true });
    await mkdir(join(cwd, "node_modules", "dep"), { recursive: true });
    await writeFile(docsConfig, "{}");
    await writeFile(appConfig, "{}");
    await writeFile(ignoredConfig, "{}");

    const result = await discoverConfigFiles({
      cwd,
      patterns: ["**/workers-build.jsonc"],
    });

    expect(result).toEqual([resolve(docsConfig), resolve(appConfig)]);
  });
});
