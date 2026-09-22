import { loadConfig, loadProjectEnv } from "./runtime/config.js";
import { logMissingConfigFile, logValidationFailure } from "./runtime/logger.js";
import { InitOptions, ValidationResult, EnvBootConfig } from "./runtime/types.js";
import { validateEnvironment, getRuntimeEnv } from "./runtime/validator.js";

function exitProcess(code: number = 1): void {
  if (typeof process !== "undefined" && typeof process.exit === "function") {
    process.exit(code);
  }
  const g = globalThis as any;
  if (typeof g.Deno !== "undefined" && typeof g.Deno.exit === "function") {
    g.Deno.exit(code);
  }
}

/**
 * Initializes EnvBoot startup validation.
 * Reads `.envboot.json` and verifies that all required variables are set.
 * Automatically loads and parses local `.env*` files merged with system environment.
 * If required variables are missing, prints an error message and terminates the process with exit code 1.
 */
export function init(options: InitOptions = {}): ValidationResult {
  const {
    configPath,
    cwd = process.cwd ? process.cwd() : ".",
    exitOnError = true,
    quiet = false,
    env = loadProjectEnv(cwd),
  } = options;

  const config = loadConfig(configPath, cwd);

  if (!config) {
    if (!quiet) {
      logMissingConfigFile(configPath || `${cwd}/.envboot.json`);
    }
    return {
      valid: true,
      missingRequired: [],
      missingOptional: [],
      presentRequired: [],
      presentOptional: [],
    };
  }

  const result = validateEnvironment(config, env);

  if (!result.valid) {
    if (!quiet) {
      logValidationFailure(result);
    }
    if (exitOnError) {
      exitProcess(1);
    }
  }

  return result;
}

/**
 * Validates the environment against an explicit config or .envboot.json without exiting.
 */
export function validate(
  configOrOptions?: EnvBootConfig | InitOptions,
  env?: Record<string, string | undefined>
): ValidationResult {
  const resolvedEnv = env || getRuntimeEnv();
  if (configOrOptions && ("required" in configOrOptions || "optional" in configOrOptions)) {
    return validateEnvironment(configOrOptions as EnvBootConfig, resolvedEnv);
  }
  const opts = (configOrOptions as InitOptions) || {};
  const config = loadConfig(opts.configPath, opts.cwd || (process.cwd ? process.cwd() : "."));
  if (!config) {
    return {
      valid: true,
      missingRequired: [],
      missingOptional: [],
      presentRequired: [],
      presentOptional: [],
    };
  }
  return validateEnvironment(config, opts.env || resolvedEnv);
}

export { loadConfig, validateEnvironment, getRuntimeEnv };
export * from "./runtime/types.js";

const envboot = {
  init,
  validate,
  loadConfig,
  validateEnvironment,
  getRuntimeEnv,
};

// Backward-compatible alias
export const envGuard = envboot;

export default envboot;
