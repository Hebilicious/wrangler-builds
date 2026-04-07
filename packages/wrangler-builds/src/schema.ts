import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";

const schemaPath = new URL("../schema/workers-build.schema.json", import.meta.url);
const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as object;

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
});

const validator = ajv.compile(schema);

const formatInstancePath = (error: ErrorObject): string => {
  if (error.keyword === "required" && typeof error.params?.missingProperty === "string") {
    return error.instancePath || "/";
  }

  return error.instancePath || "/";
};

export const validateWorkersBuildConfig = (
  value: unknown,
): { valid: true; errors: [] } | { valid: false; errors: string[] } => {
  const valid = validator(value);

  if (valid) {
    return {
      valid: true,
      errors: [],
    };
  }

  return {
    valid: false,
    errors:
      validator.errors?.map((error: ErrorObject) => {
        const missingProperty =
          error.keyword === "required" && typeof error.params?.missingProperty === "string"
            ? ` (${error.params.missingProperty})`
            : "";

        return `${formatInstancePath(error)} ${error.message ?? "is invalid"}${missingProperty}`;
      }) ?? [],
  };
};
