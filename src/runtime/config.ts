import fs from "fs";
import path from "path";
import { EnvBootConfig } from "./types.js";

const DEFAULT_CONFIG_FILES = [".envboot.json", ".envguard.json"];

export function findConfigFile(cwd: string = process.cwd(), explicitPath?: string): string | null {
  if (explicitPath) {
    const resolved = path.resolve(cwd, explicitPath);
    return fs.existsSync(resolved) ? resolved : null;
  }

  // Look in current directory and traverse upwards up to root
  let currentDir = path.resolve(cwd);
  while (true) {
    for (const filename of DEFAULT_CONFIG_FILES) {
      const candidate = path.join(currentDir, filename);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  return null;
}

export function loadConfig(configPath?: string, cwd: string = process.cwd()): EnvBootConfig | null {
  const resolvedPath = findConfigFile(cwd, configPath);
  if (!resolvedPath) {
    return null;
  }

  try {
    const content = fs.readFileSync(resolvedPath, "utf-8");
    const parsed = JSON.parse(content);
    return {
      required: Array.isArray(parsed.required) ? parsed.required : [],
      optional: Array.isArray(parsed.optional) ? parsed.optional : [],
      ...parsed,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse envboot config at "${resolvedPath}": ${(error as Error).message}`
    );
  }
}
