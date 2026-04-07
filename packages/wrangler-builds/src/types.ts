export type JsonObject = Record<string, unknown>;

export interface TriggerConfig {
  name: string;
  buildCommand: string;
  deployCommand: string;
  rootDirectory: string;
  branchIncludes: string[];
  branchExcludes: string[];
  pathIncludes: string[];
  pathExcludes: string[];
}

export interface ProjectConfig {
  configPath: string;
  enabled: boolean;
  scriptName: string | null;
  triggers: TriggerConfig[];
}

export interface TriggerPayload {
  trigger_name: string;
  build_command: string;
  deploy_command: string;
  root_directory: string;
  branch_includes: string[];
  branch_excludes: string[];
  path_includes: string[];
  path_excludes: string[];
}

export interface RemoteTrigger {
  trigger_uuid?: string;
  trigger_name?: string;
  build_command?: string;
  deploy_command?: string;
  root_directory?: string | null;
  branch_includes?: unknown;
  branch_excludes?: unknown;
  path_includes?: unknown;
  path_excludes?: unknown;
}

export interface NoopAction {
  type: "noop";
  scriptName: string;
  triggerName: string;
  configPath: string;
}

export interface UpdateAction {
  type: "update";
  scriptName: string;
  triggerName: string;
  triggerUuid: string;
  configPath: string;
  payload: TriggerPayload;
}

export type PlanAction = NoopAction | UpdateAction;

export interface ProjectPlan {
  projectConfig: ProjectConfig;
  actions: PlanAction[];
}

export interface Logger {
  info: (message: string) => void;
}

export interface CloudflareClient {
  listTriggers: (scriptName: string) => Promise<RemoteTrigger[]>;
  patchTrigger: (triggerUuid: string, payload: TriggerPayload) => Promise<unknown>;
}

export interface SyncResult {
  actions: PlanAction[];
}
