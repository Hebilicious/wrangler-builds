import { copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, "..");
const repoRoot = resolve(packageDir, "../..");
const rootReadmePath = resolve(repoRoot, "README.md");
const packageReadmePath = resolve(packageDir, "README.md");

await copyFile(rootReadmePath, packageReadmePath);
