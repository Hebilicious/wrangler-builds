import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("README sync", () => {
  it("keeps the published package README aligned with the root README", async () => {
    const packageDir = resolve(import.meta.dirname, "..");
    const rootReadme = await readFile(resolve(packageDir, "../../README.md"), "utf8");
    const packageReadme = await readFile(resolve(packageDir, "README.md"), "utf8");

    expect(packageReadme).toBe(rootReadme);
  });
});
