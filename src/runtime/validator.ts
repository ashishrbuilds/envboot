import { EnvBootConfig, ValidationResult } from "./types.js";

/**
 * Safely resolves the environment dictionary across Node.js, Bun, Deno, and browser runtimes.
 */
export function getRuntimeEnv(): Record<string, string | undefined> {
  // 1. Check Node.js / Bun standard process.env
  if (typeof process !== "undefined" && process && typeof process.env === "object" && process.env !== null) {
    return process.env;
  }

  // 2. Check Bun runtime
  const g = globalThis as any;
  if (typeof g.Bun !== "undefined" && g.Bun && typeof g.Bun.env === "object" && g.Bun.env !== null) {
    return g.Bun.env;
  }

  // 3. Check Deno runtime
  if (typeof g.Deno !== "undefined" && g.Deno && typeof g.Deno.env?.toObject === "function") {
    try {
      return g.Deno.env.toObject();
    } catch {
      // If permissions block Deno.env.toObject()
    }
  }

  return {};
}

export function validateEnvironment(
  config: EnvBootConfig,
  env: Record<string, string | undefined> = getRuntimeEnv()
): ValidationResult {
  const required = config.required || [];
  const optional = config.optional || [];

  const missingRequired: string[] = [];
  const presentRequired: string[] = [];
  const missingOptional: string[] = [];
  const presentOptional: string[] = [];

  for (const key of required) {
    const val = env[key];
    if (val === undefined || val === "") {
      missingRequired.push(key);
    } else {
      presentRequired.push(key);
    }
  }

  for (const key of optional) {
    const val = env[key];
    if (val === undefined || val === "") {
      missingOptional.push(key);
    } else {
      presentOptional.push(key);
    }
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    presentRequired,
    presentOptional,
  };
}
