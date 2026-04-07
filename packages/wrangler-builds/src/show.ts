import process from "node:process";
import { resolve } from "node:path";

import { createCloudflareClient } from "./client.js";
import { loadConfigFile } from "./config.js";
import type { CloudflareClient, RemoteTrigger } from "./types.js";
import { normalizeStringArray } from "./utils.js";

const toCurrentTrigger = (trigger: RemoteTrigger) => ({
  triggerUuid: typeof trigger.trigger_uuid === "string" ? trigger.trigger_uuid : null,
  buildCommand: typeof trigger.build_command === "string" ? trigger.build_command : "",
  deployCommand: typeof trigger.deploy_command === "string" ? trigger.deploy_command : "",
  rootDirectory: typeof trigger.root_directory === "string" ? trigger.root_directory : "",
  branchIncludes: normalizeStringArray(trigger.branch_includes),
  branchExcludes: normalizeStringArray(trigger.branch_excludes),
  pathIncludes: normalizeStringArray(trigger.path_includes),
  pathExcludes: normalizeStringArray(trigger.path_excludes),
});

export const getCurrentConfig = async ({
  configPath,
  loadConfigFile: loadConfigFileImpl = loadConfigFile,
  client,
}: {
  configPath: string;
  loadConfigFile?: typeof loadConfigFile;
  client: CloudflareClient;
}) => {
  const projectConfig = await loadConfigFileImpl(configPath);

  if (!projectConfig.scriptName) {
    return {
      configPath: projectConfig.configPath,
      enabled: projectConfig.enabled,
      scriptName: projectConfig.scriptName,
      triggers: [],
    };
  }

  const remoteTriggers = await client.listTriggers(projectConfig.scriptName);

  return {
    configPath: projectConfig.configPath,
    enabled: projectConfig.enabled,
    scriptName: projectConfig.scriptName,
    triggers: projectConfig.triggers.map((trigger) => ({
      name: trigger.name,
      current: (() => {
        const remoteTrigger = remoteTriggers.find((item) => item.trigger_name === trigger.name);
        return remoteTrigger ? toCurrentTrigger(remoteTrigger) : null;
      })(),
    })),
  };
};

const getRequiredEnv = (name: string, env: NodeJS.ProcessEnv): string => {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

export const runShow = async ({
  cwd = process.cwd(),
  configPath,
  env = process.env,
  createCloudflareClient: createCloudflareClientImpl = createCloudflareClient,
  getCurrentConfig: getCurrentConfigImpl = getCurrentConfig,
}: {
  cwd?: string;
  configPath: string;
  env?: NodeJS.ProcessEnv;
  createCloudflareClient?: typeof createCloudflareClient;
  getCurrentConfig?: typeof getCurrentConfig;
}) => {
  const token = getRequiredEnv("CLOUDFLARE_API_TOKEN", env);
  const accountId = getRequiredEnv("CLOUDFLARE_ACCOUNT_ID", env);

  return getCurrentConfigImpl({
    client: createCloudflareClientImpl({
      accountId,
      token,
    }),
    configPath: resolve(cwd, configPath),
  });
};
