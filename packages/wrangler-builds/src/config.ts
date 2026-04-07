import { readFile } from "node:fs/promises";

import { parse, printParseErrorCode } from "jsonc-parser";

import { validateWorkersBuildConfig } from "./schema.js";
import type { JsonObject, ProjectConfig, TriggerConfig } from "./types.js";
import { normalizeList, normalizeStringArray } from "./utils.js";

export const parseJsonc = <T>(
  text: string,
  { filePath = "<inline>" }: { filePath?: string } = {},
): T => {
  const errors: Parameters<typeof parse>[1] = [];
  const value = parse(text, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  }) as T;

  if (errors.length > 0) {
    const message = errors
      .map((error) => `${printParseErrorCode(error.error)} at offset ${error.offset}`)
      .join(", ");

    throw new Error(`Invalid JSONC in ${filePath}: ${message}`);
  }

  return value;
};

const normalizeTrigger = (
  trigger: JsonObject,
  defaults: { buildCommand: string; rootDirectory: string },
): TriggerConfig => ({
  name: String(trigger.name),
  buildCommand:
    typeof trigger.buildCommand === "string" ? trigger.buildCommand : defaults.buildCommand,
  deployCommand: String(trigger.deployCommand),
  rootDirectory:
    typeof trigger.rootDirectory === "string" ? trigger.rootDirectory : defaults.rootDirectory,
  branchIncludes: normalizeStringArray(trigger.branchIncludes),
  branchExcludes: normalizeStringArray(trigger.branchExcludes),
  pathIncludes: normalizeStringArray(trigger.pathIncludes),
  pathExcludes: normalizeStringArray(trigger.pathExcludes),
});

export const loadConfigFile = async (filePath: string): Promise<ProjectConfig> => {
  const text = await readFile(filePath, "utf8");
  const config = parseJsonc<JsonObject>(text, { filePath });
  const validation = validateWorkersBuildConfig(config);

  if (!validation.valid) {
    throw new Error(
      `Invalid workers build config at ${filePath}:\n- ${validation.errors.join("\n- ")}`,
    );
  }

  const enabled = config.enabled !== false;
  const scriptName =
    typeof config.scriptName === "string" && config.scriptName.trim()
      ? config.scriptName.trim()
      : null;

  if (enabled && !scriptName) {
    throw new Error(`Unable to resolve script name for ${filePath}.`);
  }

  const defaults = {
    buildCommand: typeof config.buildCommand === "string" ? config.buildCommand : "",
    rootDirectory: typeof config.rootDirectory === "string" ? config.rootDirectory : "",
  };

  return {
    configPath: filePath,
    enabled,
    scriptName,
    triggers: normalizeList<JsonObject>(config.triggers).map((trigger) =>
      normalizeTrigger(trigger, defaults),
    ),
  };
};
