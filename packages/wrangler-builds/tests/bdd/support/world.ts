import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { After, Before, World, setWorldConstructor } from "@cucumber/cucumber";
import { parse } from "jsonc-parser";

const execFileAsync = promisify(execFile);

const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const cliPath = fileURLToPath(new URL("../../../dist/cli.mjs", import.meta.url));
const exampleConfigPath = join(repoRoot, "examples/live-e2e-worker/workers-build.jsonc");
const driftedBuildCommand = "echo bdd-live-drift";

interface TriggerConfigShape {
  name?: unknown;
  buildCommand?: unknown;
  deployCommand?: unknown;
  rootDirectory?: unknown;
  branchIncludes?: unknown;
  branchExcludes?: unknown;
  pathIncludes?: unknown;
  pathExcludes?: unknown;
}

interface ProjectConfigShape {
  scriptName?: unknown;
  buildCommand?: unknown;
  rootDirectory?: unknown;
  triggers?: unknown;
}

interface TriggerPayload {
  trigger_name: string;
  build_command: string;
  deploy_command: string;
  root_directory: string;
  branch_includes: string[];
  branch_excludes: string[];
  path_includes: string[];
  path_excludes: string[];
}

interface RemoteTrigger extends TriggerPayload {
  trigger_uuid: string;
}

const getString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const parseExampleConfig = (text: string): { scriptName: string; trigger: TriggerPayload } => {
  const parsed = parse(text) as ProjectConfigShape;

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Unable to parse example config at ${exampleConfigPath}.`);
  }

  const scriptName = getString(parsed.scriptName).trim();
  const projectBuildCommand = getString(parsed.buildCommand);
  const projectRootDirectory = getString(parsed.rootDirectory);
  const [firstTrigger] = Array.isArray(parsed.triggers)
    ? (parsed.triggers as TriggerConfigShape[])
    : [];

  if (!scriptName || !firstTrigger?.name || !firstTrigger.deployCommand) {
    throw new Error(`Example config at ${exampleConfigPath} is missing required trigger fields.`);
  }

  return {
    scriptName,
    trigger: {
      trigger_name: getString(firstTrigger.name),
      build_command: getString(firstTrigger.buildCommand, projectBuildCommand),
      deploy_command: getString(firstTrigger.deployCommand),
      root_directory: getString(firstTrigger.rootDirectory, projectRootDirectory),
      branch_includes: getStringArray(firstTrigger.branchIncludes),
      branch_excludes: getStringArray(firstTrigger.branchExcludes),
      path_includes: getStringArray(firstTrigger.pathIncludes),
      path_excludes: getStringArray(firstTrigger.pathExcludes),
    },
  };
};

const getRequiredEnv = (names: string[]): string => {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required environment variable. Tried: ${names.join(", ")}.`);
};

export class LiveCliWorld extends World {
  readonly accountId = getRequiredEnv(["WRANGLER_BUILDS_E2E_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID"]);
  readonly apiToken = getRequiredEnv(["CLOUDFLARE_API_TOKEN"]);
  readonly buildTokenUuid = process.env.WRANGLER_BUILDS_E2E_BUILD_TOKEN_UUID?.trim() ?? "";
  readonly repoConnectionUuid = process.env.WRANGLER_BUILDS_E2E_REPO_CONNECTION_UUID?.trim() ?? "";

  repoRoot = repoRoot;
  configPath = exampleConfigPath;
  cwd = repoRoot;
  stdout = "";
  stderr = "";
  exitCode = 0;
  tempDirs: string[] = [];
  scriptName = "";
  expectedTrigger!: TriggerPayload;
  currentTriggerName = "";

  async initialize(): Promise<void> {
    const configText = await readFile(exampleConfigPath, "utf8");
    const example = parseExampleConfig(configText);
    this.scriptName = example.scriptName;
    this.expectedTrigger = example.trigger;
    this.currentTriggerName = example.trigger.trigger_name;
    this.configPath = exampleConfigPath;
    this.cwd = repoRoot;
  }

  async cleanup(): Promise<void> {
    await this.restoreExpectedTrigger().catch(() => undefined);
    await Promise.all(
      this.tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
    );
  }

  async ensureTriggerExists(): Promise<RemoteTrigger> {
    const trigger = await this.getTriggerByName(this.expectedTrigger.trigger_name);

    if (trigger) {
      return trigger;
    }

    await this.ensureScriptExists();

    if (!this.buildTokenUuid || !this.repoConnectionUuid) {
      throw new Error(
        [
          `Live trigger "${this.expectedTrigger.trigger_name}" for ${this.scriptName} does not exist.`,
          "Set WRANGLER_BUILDS_E2E_BUILD_TOKEN_UUID and WRANGLER_BUILDS_E2E_REPO_CONNECTION_UUID to allow bootstrap.",
        ].join(" "),
      );
    }

    const created = await this.request<{ trigger_uuid?: string; trigger_name?: string }>(
      `/accounts/${this.accountId}/builds/triggers`,
      {
        method: "POST",
        body: JSON.stringify({
          ...this.expectedTrigger,
          build_token_uuid: this.buildTokenUuid,
          external_script_id: this.scriptName,
          repo_connection_uuid: this.repoConnectionUuid,
        }),
      },
    );

    if (!created?.trigger_uuid) {
      throw new Error(`Cloudflare did not return a trigger UUID when creating ${this.scriptName}.`);
    }

    const hydrated = await this.getTriggerByName(this.expectedTrigger.trigger_name);

    if (!hydrated) {
      throw new Error(
        `Cloudflare trigger "${this.expectedTrigger.trigger_name}" was created but could not be reloaded.`,
      );
    }

    return hydrated;
  }

  async driftTrigger(): Promise<void> {
    const trigger = await this.ensureTriggerExists();

    await this.patchTrigger(trigger.trigger_uuid, {
      ...this.expectedTrigger,
      build_command: driftedBuildCommand,
    });
  }

  async assertTriggerStillDrifted(): Promise<void> {
    const trigger = await this.requireTrigger(this.expectedTrigger.trigger_name);

    if (trigger.build_command !== driftedBuildCommand) {
      throw new Error(
        `Expected Cloudflare to keep build_command=${driftedBuildCommand}, received ${trigger.build_command}.`,
      );
    }
  }

  async assertTriggerMatchesExpected(): Promise<void> {
    const trigger = await this.requireTrigger(this.expectedTrigger.trigger_name);

    const actual = {
      trigger_name: trigger.trigger_name,
      build_command: trigger.build_command,
      deploy_command: trigger.deploy_command,
      root_directory: trigger.root_directory,
      branch_includes: trigger.branch_includes,
      branch_excludes: trigger.branch_excludes,
      path_includes: trigger.path_includes,
      path_excludes: trigger.path_excludes,
    };

    if (JSON.stringify(actual) !== JSON.stringify(this.expectedTrigger)) {
      throw new Error(
        `Expected Cloudflare trigger to match example config.\nExpected: ${JSON.stringify(this.expectedTrigger)}\nReceived: ${JSON.stringify(actual)}`,
      );
    }
  }

  async createMissingTriggerConfig(triggerName: string): Promise<void> {
    const directory = await mkdtemp(join(tmpdir(), "wrangler-builds-live-bdd-"));
    const filePath = join(directory, "workers-build.jsonc");
    const missingTrigger = {
      ...this.expectedTrigger,
      trigger_name: triggerName,
    };

    const jsonc = `{
  "scriptName": "${this.scriptName}",
  "buildCommand": "${missingTrigger.build_command}",
  "rootDirectory": "${missingTrigger.root_directory}",
  "triggers": [
    {
      "name": "${missingTrigger.trigger_name}",
      "deployCommand": "${missingTrigger.deploy_command}",
      "branchIncludes": ${JSON.stringify(missingTrigger.branch_includes)},
      "branchExcludes": ${JSON.stringify(missingTrigger.branch_excludes)},
      "pathIncludes": ${JSON.stringify(missingTrigger.path_includes)},
      "pathExcludes": ${JSON.stringify(missingTrigger.path_excludes)}
    }
  ]
}
`;

    await writeFile(filePath, jsonc, "utf8");
    this.tempDirs.push(directory);
    this.cwd = dirname(filePath);
    this.configPath = filePath;
    this.currentTriggerName = triggerName;
  }

  async runCli(extraArgs: string[]): Promise<void> {
    try {
      const result = await execFileAsync(
        process.execPath,
        [cliPath, "--cwd", this.cwd, ...extraArgs],
        {
          cwd: this.cwd,
          env: {
            ...process.env,
            CLOUDFLARE_ACCOUNT_ID: this.accountId,
            CLOUDFLARE_API_TOKEN: this.apiToken,
          },
        },
      );

      this.stdout = result.stdout;
      this.stderr = result.stderr;
      this.exitCode = 0;
    } catch (error) {
      const failure = error as NodeJS.ErrnoException & {
        code?: number;
        stdout?: string;
        stderr?: string;
      };
      this.stdout = failure.stdout ?? "";
      this.stderr = failure.stderr ?? "";
      this.exitCode = typeof failure.code === "number" ? failure.code : 1;
    }
  }

  private async restoreExpectedTrigger(): Promise<void> {
    const trigger = await this.getTriggerByName(this.expectedTrigger?.trigger_name ?? "");

    if (!trigger) {
      return;
    }

    await this.patchTrigger(trigger.trigger_uuid, this.expectedTrigger);
  }

  private async ensureScriptExists(): Promise<void> {
    const scripts = await this.request<Array<{ id?: string }>>(
      `/accounts/${this.accountId}/workers/scripts`,
    );
    const found = Array.isArray(scripts)
      ? scripts.some((script) => script?.id === this.scriptName)
      : false;

    if (!found) {
      throw new Error(
        `Cloudflare Worker script ${this.scriptName} was not found. Deploy the live example worker before running BDD.`,
      );
    }
  }

  private async requireTrigger(name: string): Promise<RemoteTrigger> {
    const trigger = await this.getTriggerByName(name);

    if (!trigger) {
      throw new Error(`Cloudflare trigger "${name}" was not found for ${this.scriptName}.`);
    }

    return trigger;
  }

  private async getTriggerByName(name: string): Promise<RemoteTrigger | null> {
    const triggers = await this.request<RemoteTrigger[]>(
      `/accounts/${this.accountId}/builds/workers/${this.scriptName}/triggers`,
    );

    return Array.isArray(triggers)
      ? (triggers.find((trigger) => trigger?.trigger_name === name) ?? null)
      : null;
  }

  private async patchTrigger(triggerUuid: string, payload: TriggerPayload): Promise<void> {
    await this.request(`/accounts/${this.accountId}/builds/triggers/${triggerUuid}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    const text = await response.text();
    const data = text
      ? (JSON.parse(text) as { success?: boolean; errors?: unknown; result?: T })
      : {};

    if (!response.ok || data.success === false) {
      throw new Error(
        `Cloudflare API request failed for ${path}: ${JSON.stringify(data.errors ?? data, null, 2)}`,
      );
    }

    return data.result as T;
  }
}

Before(async function () {
  await this.initialize();
});

After(async function () {
  await this.cleanup();
});

setWorldConstructor(LiveCliWorld);
