import { resolve } from "node:path";

import { glob } from "tinyglobby";

import { DEFAULT_DISCOVERY_PATTERNS, DEFAULT_IGNORE_PATTERNS } from "./constants.js";
import { sortStrings } from "./utils.js";

export interface DiscoverConfigFilesOptions {
  cwd: string;
  explicitPaths?: string[];
  patterns?: string[];
  ignore?: string[];
}

export const discoverConfigFiles = async ({
  cwd,
  explicitPaths = [],
  patterns = DEFAULT_DISCOVERY_PATTERNS,
  ignore = DEFAULT_IGNORE_PATTERNS,
}: DiscoverConfigFilesOptions): Promise<string[]> => {
  if (explicitPaths.length > 0) {
    return sortStrings(explicitPaths.map((target) => resolve(cwd, target)));
  }

  const matches = await glob(patterns, {
    absolute: true,
    cwd,
    ignore,
    onlyFiles: true,
  });

  return sortStrings(matches.map((match) => resolve(match)));
};
