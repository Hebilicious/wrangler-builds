import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runSync } from "../src/sync.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "wrangler-builds-integration-"));
  tempDirs.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
  vi.restoreAllMocks();
});

describe("runSync integration", () => {
  it("discovers configs, parses JSONC, plans updates, and applies patches deterministically", async () => {
    const cwd = await makeTempDir();
    const configDir = join(cwd, "packages", "demo");
    const configPath = join(configDir, "workers-build.jsonc");
    const logs: string[] = [];
    const requests: Array<{ url: string; method: string; body: string | null }> = [];

    await mkdir(configDir, { recursive: true });
    await writeFile(
      configPath,
      `{
        // sync the production trigger
        "scriptName": "demo-worker",
        "buildCommand": "pnpm build",
        "rootDirectory": "packages/demo",
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

    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? init.body : null;
      requests.push({ url, method, body });

      if (url.endsWith("/workers/scripts")) {
        return new Response(
          JSON.stringify({
            success: true,
            result: [{ id: "external-script-id", tag: "demo-worker" }],
          }),
        );
      }

      if (url.endsWith("/builds/workers/external-script-id/triggers")) {
        return new Response(
          JSON.stringify({
            success: true,
            result: [
              {
                trigger_uuid: "trigger-uuid",
                trigger_name: "production",
                build_command: "npm run build",
                deploy_command: "pnpm deploy",
                root_directory: "packages/demo",
                branch_includes: ["main"],
                branch_excludes: [],
                path_includes: ["src/**"],
                path_excludes: [],
              },
            ],
          }),
        );
      }

      if (url.endsWith("/builds/triggers/trigger-uuid") && method === "PATCH") {
        return new Response(JSON.stringify({ success: true, result: {} }));
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await runSync({
      cwd,
      env: {
        CLOUDFLARE_API_TOKEN: "token",
        CLOUDFLARE_ACCOUNT_ID: "account",
      },
      logger: {
        info: (message: string) => logs.push(message),
      },
    });

    expect(result.actions).toEqual([
      {
        type: "update",
        scriptName: "demo-worker",
        triggerName: "production",
        triggerUuid: "trigger-uuid",
        configPath,
        payload: {
          trigger_name: "production",
          build_command: "pnpm build",
          deploy_command: "pnpm deploy",
          root_directory: "packages/demo",
          branch_includes: ["main"],
          branch_excludes: [],
          path_includes: ["src/**"],
          path_excludes: [],
        },
      },
    ]);

    expect(logs).toEqual(["+ demo-worker: updated production"]);
    expect(requests).toEqual([
      {
        url: "https://api.cloudflare.com/client/v4/accounts/account/workers/scripts",
        method: "GET",
        body: null,
      },
      {
        url: "https://api.cloudflare.com/client/v4/accounts/account/builds/workers/external-script-id/triggers",
        method: "GET",
        body: null,
      },
      {
        url: "https://api.cloudflare.com/client/v4/accounts/account/builds/triggers/trigger-uuid",
        method: "PATCH",
        body: JSON.stringify({
          trigger_name: "production",
          build_command: "pnpm build",
          deploy_command: "pnpm deploy",
          root_directory: "packages/demo",
          branch_includes: ["main"],
          branch_excludes: [],
          path_includes: ["src/**"],
          path_excludes: [],
        }),
      },
    ]);
  });
});
