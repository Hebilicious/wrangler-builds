import type { CloudflareClient, RemoteTrigger, TriggerPayload } from "./types.js";
import { normalizeList } from "./utils.js";

interface CloudflareApiResponse<T> {
  success?: boolean;
  result?: T | { items?: T[] } | T[];
  errors?: unknown;
}

export const createCloudflareClient = ({
  token,
  accountId,
  fetchImpl = globalThis.fetch,
}: {
  token: string;
  accountId: string;
  fetchImpl?: typeof fetch;
}): CloudflareClient => {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;

  const request = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<CloudflareApiResponse<T>> => {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    const text = await response.text();
    const data = (text ? JSON.parse(text) : {}) as CloudflareApiResponse<T>;

    if (!response.ok || data.success === false) {
      throw new Error(
        `Cloudflare API request failed for ${path}: ${JSON.stringify(data.errors ?? data, null, 2)}`,
      );
    }

    return data;
  };

  let externalScriptIdsByNamePromise: Promise<Map<string, string>> | undefined;

  const getExternalScriptIdsByName = async (): Promise<Map<string, string>> => {
    if (!externalScriptIdsByNamePromise) {
      externalScriptIdsByNamePromise = request<{ id?: string; tag?: string }>(
        "/workers/scripts",
      ).then((data) => {
        const scripts = new Map<string, string>();

        for (const script of normalizeList<{ id?: string; tag?: string }>(data.result)) {
          if (typeof script.id === "string" && typeof script.tag === "string") {
            scripts.set(script.id, script.tag);
          }
        }

        return scripts;
      });
    }

    return externalScriptIdsByNamePromise;
  };

  return {
    async listTriggers(scriptName: string): Promise<RemoteTrigger[]> {
      const externalScriptIdsByName = await getExternalScriptIdsByName();
      const externalScriptId = externalScriptIdsByName.get(scriptName);

      if (!externalScriptId) {
        throw new Error(`Cloudflare Workers script ${scriptName} was not found.`);
      }

      const data = await request<RemoteTrigger>(`/builds/workers/${externalScriptId}/triggers`);
      return normalizeList<RemoteTrigger>(data.result);
    },
    patchTrigger(triggerUuid: string, payload: TriggerPayload): Promise<unknown> {
      return request(`/builds/triggers/${triggerUuid}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
  };
};
