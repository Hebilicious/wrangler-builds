import type {
  ProjectConfig,
  ProjectPlan,
  RemoteTrigger,
  TriggerConfig,
  TriggerPayload,
  UpdateAction,
} from "./types.js";
import { arraysEqual, normalizeStringArray } from "./utils.js";

export const createDesiredTriggerPayload = (trigger: TriggerConfig): TriggerPayload => ({
  trigger_name: trigger.name,
  build_command: trigger.buildCommand,
  deploy_command: trigger.deployCommand,
  root_directory: trigger.rootDirectory,
  branch_includes: trigger.branchIncludes,
  branch_excludes: trigger.branchExcludes,
  path_includes: trigger.pathIncludes,
  path_excludes: trigger.pathExcludes,
});

export const needsTriggerUpdate = (
  existingTrigger: RemoteTrigger,
  desiredTrigger: TriggerPayload,
): boolean =>
  existingTrigger.build_command !== desiredTrigger.build_command ||
  existingTrigger.deploy_command !== desiredTrigger.deploy_command ||
  (existingTrigger.root_directory ?? "") !== desiredTrigger.root_directory ||
  !arraysEqual(
    normalizeStringArray(existingTrigger.branch_includes),
    desiredTrigger.branch_includes,
  ) ||
  !arraysEqual(
    normalizeStringArray(existingTrigger.branch_excludes),
    desiredTrigger.branch_excludes,
  ) ||
  !arraysEqual(normalizeStringArray(existingTrigger.path_includes), desiredTrigger.path_includes) ||
  !arraysEqual(normalizeStringArray(existingTrigger.path_excludes), desiredTrigger.path_excludes);

export const buildProjectPlan = ({
  projectConfig,
  remoteTriggers,
}: {
  projectConfig: ProjectConfig;
  remoteTriggers: RemoteTrigger[];
}): ProjectPlan => {
  const actions: ProjectPlan["actions"] = [];

  for (const trigger of projectConfig.triggers) {
    const existingTrigger = remoteTriggers.find((remote) => remote.trigger_name === trigger.name);

    if (typeof existingTrigger?.trigger_uuid !== "string") {
      throw new Error(
        `Missing Cloudflare Build trigger "${trigger.name}" for ${projectConfig.scriptName}.`,
      );
    }

    const payload = createDesiredTriggerPayload(trigger);

    if (!needsTriggerUpdate(existingTrigger, payload)) {
      actions.push({
        type: "noop",
        scriptName: projectConfig.scriptName ?? "",
        triggerName: trigger.name,
        configPath: projectConfig.configPath,
      });
      continue;
    }

    const action: UpdateAction = {
      type: "update",
      scriptName: projectConfig.scriptName ?? "",
      triggerName: trigger.name,
      triggerUuid: existingTrigger.trigger_uuid,
      configPath: projectConfig.configPath,
      payload,
    };

    actions.push(action);
  }

  return {
    projectConfig,
    actions,
  };
};
