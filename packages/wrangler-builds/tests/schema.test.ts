import { describe, expect, it } from "vitest";

import { validateWorkersBuildConfig } from "../src/schema.js";

describe("validateWorkersBuildConfig", () => {
  it("accepts a valid config object", () => {
    const result = validateWorkersBuildConfig({
      scriptName: "demo",
      triggers: [
        {
          name: "production",
          deployCommand: "pnpm deploy",
          branchIncludes: ["main"],
          pathIncludes: ["src/**"],
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("reports schema violations", () => {
    const result = validateWorkersBuildConfig({
      scriptName: "demo",
      triggers: [
        {
          name: "production",
          deployCommand: "pnpm deploy",
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("branchIncludes");
    expect(result.errors.join("\n")).toContain("pathIncludes");
  });
});
