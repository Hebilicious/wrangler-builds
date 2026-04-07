import { formatActionMessage } from "./output.js";
import type { CloudflareClient, Logger, ProjectPlan } from "./types.js";

export const applyProjectPlan = async ({
  plan,
  client,
  dryRun = false,
  logger = console,
}: {
  plan: ProjectPlan;
  client: CloudflareClient;
  dryRun?: boolean;
  logger?: Logger;
}): Promise<ProjectPlan> => {
  for (const action of plan.actions) {
    if (action.type === "noop") {
      logger.info(formatActionMessage(action));
      continue;
    }

    if (dryRun) {
      logger.info(formatActionMessage(action, { dryRun: true }));
      continue;
    }

    await client.patchTrigger(action.triggerUuid, action.payload);
    logger.info(formatActionMessage(action));
  }

  return plan;
};
