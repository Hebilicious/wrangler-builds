import type { PlanAction } from "./types.js";

export const formatActionMessage = (
  action: PlanAction,
  { dryRun = false }: { dryRun?: boolean } = {},
): string => {
  if (action.type === "noop") {
    return `= ${action.scriptName}: ${action.triggerName} already matches ${action.configPath}`;
  }

  if (dryRun) {
    return `~ ${action.scriptName}: would update ${action.triggerName}`;
  }

  return `+ ${action.scriptName}: updated ${action.triggerName}`;
};
