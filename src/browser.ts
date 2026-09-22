import { InitOptions, ValidationResult, EnvBootConfig } from "./runtime/types.js";
import { validateEnvironment } from "./runtime/validator.js";

/**
 * Safely resolves environment variables in browser/client-side environments (Vite, CRA, Next.js client).
 */
export function getBrowserEnv(): Record<string, string | undefined> {
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {};
  if (g.process && typeof g.process.env === "object" && g.process.env !== null) {
    return g.process.env;
  }
  if (g.__ENV__ && typeof g.__ENV__ === "object") {
    return g.__ENV__;
  }
  if (typeof window !== "undefined" && (window as any).__ENV__) {
    return (window as any).__ENV__;
  }
  return {};
}

export function logBrowserFailure(result: ValidationResult): void {
  if (typeof console === "undefined" || !console.error) return;

  const missing = result.missingRequired.map((k) => `  • ${k}`).join("\n");
  console.error(
    `%c❌ [envboot] Environment validation failed\n\nMissing required environment variables:\n${missing}`,
    "color: #ef4444; font-weight: bold; font-size: 13px;"
  );
}

/**
 * Browser-safe initialization (does not require Node.js fs/path modules).
 */
export function init(options: InitOptions & { config?: EnvBootConfig } = {}): ValidationResult {
  const {
    quiet = false,
    env = getBrowserEnv(),
    config: directConfig,
  } = options;

  const g = typeof globalThis !== "undefined" ? (globalThis as any) : {};
  const config: EnvBootConfig =
    directConfig ||
    g.__ENVBOOT_CONFIG__ ||
    g.__ENV_GUARD_CONFIG__ || { required: [], optional: [] };

  const result = validateEnvironment(config, env);

  if (!result.valid && !quiet) {
    logBrowserFailure(result);
  }

  return result;
}

/**
 * Validates environment in browser environments.
 */
export function validate(
  configOrOptions?: EnvBootConfig | (InitOptions & { config?: EnvBootConfig }),
  env?: Record<string, string | undefined>
): ValidationResult {
  const resolvedEnv = env || getBrowserEnv();
  let config: EnvBootConfig = { required: [], optional: [] };

  if (configOrOptions) {
    if ("required" in configOrOptions || "optional" in configOrOptions) {
      config = configOrOptions as EnvBootConfig;
    } else if ((configOrOptions as any).config) {
      config = (configOrOptions as any).config;
    }
  }

  return validateEnvironment(config, resolvedEnv);
}

export { validateEnvironment };
export * from "./runtime/types.js";

const envboot = {
  init,
  validate,
  validateEnvironment,
  getBrowserEnv,
};

export const envGuard = envboot;
export default envboot;
