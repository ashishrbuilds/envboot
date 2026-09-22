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
      ignore: Array.isArray(parsed.ignore) ? parsed.ignore : ["NODE_ENV", "TZ"],
      ...parsed,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse envboot config at "${resolvedPath}": ${(error as Error).message}`
    );
  }
}

export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("export ")) {
      line = line.slice(7).trim();
    }

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();

    // Check if key is valid identifier
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    // Handle quoted values
    if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
      val = val
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"');
    } else if (val.startsWith("'") && val.endsWith("'") && val.length >= 2) {
      val = val.slice(1, -1);
    } else if (val.startsWith("`") && val.endsWith("`") && val.length >= 2) {
      val = val.slice(1, -1);
    } else {
      // Unquoted: strip trailing inline comments
      const commentIdx = val.indexOf(" #");
      if (commentIdx !== -1) {
        val = val.slice(0, commentIdx).trim();
      }
    }

    result[key] = val;
  }

  return result;
}

export function loadProjectEnv(
  cwd: string = process.cwd(),
  mode?: string
): Record<string, string | undefined> {
  const envFiles = [
    ".env",
    ".env.local",
    ...(mode
      ? [`.env.${mode}`, `.env.${mode}.local`]
      : [
          ".env.development",
          ".env.development.local",
          ".env.production",
          ".env.production.local",
        ]),
  ];

  const loadedEnv: Record<string, string> = {};

  for (const envFile of envFiles) {
    const filePath = path.join(cwd, envFile);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = parseEnvContent(content);
        Object.assign(loadedEnv, parsed);
      } catch {
        // ignore read error
      }
    }
  }

  // System environment variables (process.env / Bun.env / Deno.env) override .env file variables
  if (typeof process !== "undefined" && process && typeof process.env === "object" && process.env !== null) {
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) {
        loadedEnv[k] = v;
      }
    }
  }

  return loadedEnv;
}
