import process from "node:process";

import { applyProjectPlan } from "./apply.js";
import { createCloudflareClient } from "./client.js";
import { loadConfigFile } from "./config.js";
import { CONFIG_BASENAME, DEFAULT_DISCOVERY_PATTERNS } from "./constants.js";
import { discoverConfigFiles } from "./discovery.js";
import { buildProjectPlan } from "./plan.js";
import type { CloudflareClient, Logger, ProjectConfig, SyncResult } from "./types.js";

const getRequiredEnv = (name: string, env: NodeJS.ProcessEnv): string => {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

export const syncWorkersBuildConfigs = async ({
  projectConfigs,
  client,
  dryRun = false,
  logger = console,
}: {
  projectConfigs: ProjectConfig[];
  client: CloudflareClient;
  dryRun?: boolean;
  logger?: Logger;
}): Promise<SyncResult> => {
  const actions: SyncResult["actions"] = [];

  for (const projectConfig of projectConfigs) {
    if (!projectConfig.enabled) {
      continue;
    }

    if (!projectConfig.scriptName) {
      throw new Error(`Unable to resolve script name for ${projectConfig.configPath}.`);
    }

    const remoteTriggers = await client.listTriggers(projectConfig.scriptName);
    const plan = buildProjectPlan({
      projectConfig,
      remoteTriggers,
    });

    actions.push(...plan.actions);
    await applyProjectPlan({
      plan,
      client,
      dryRun,
      logger,
    });
  }

  return { actions };
};

export const runSync = async ({
  cwd = process.cwd(),
  explicitPaths = [],
  patterns = DEFAULT_DISCOVERY_PATTERNS,
  dryRun = false,
  env = process.env,
  logger = console,
}: {
  cwd?: string;
  explicitPaths?: string[];
  patterns?: string[];
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
  logger?: Logger;
} = {}): Promise<SyncResult> => {
  const token = getRequiredEnv("CLOUDFLARE_API_TOKEN", env);
  const accountId = getRequiredEnv("CLOUDFLARE_ACCOUNT_ID", env);
  const configPaths = await discoverConfigFiles({
    cwd,
    explicitPaths,
    patterns,
  });

  if (configPaths.length === 0) {
    throw new Error(`No ${CONFIG_BASENAME} files were found.`);
  }

  const projectConfigs = await Promise.all(
    configPaths.map((configPath) => loadConfigFile(configPath)),
  );

  return syncWorkersBuildConfigs({
    projectConfigs,
    client: createCloudflareClient({
      token,
      accountId,
    }),
    dryRun,
    logger,
  });
};
