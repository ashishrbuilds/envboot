export interface EnvBootConfig {
  required?: string[];
  optional?: string[];
  [key: string]: unknown;
}

// Backward-compatible alias
export type EnvGuardConfig = EnvBootConfig;

export interface InitOptions {
  /** Custom path to .envboot.json */
  configPath?: string;
  /** Custom working directory to look for config */
  cwd?: string;
  /** Whether to exit process on validation failure (default: true) */
  exitOnError?: boolean;
  /** Suppress all logs (default: false) */
  quiet?: boolean;
  /** Custom environment object (default: process.env) */
  env?: Record<string, string | undefined>;
}

export interface ValidationResult {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  presentRequired: string[];
  presentOptional: string[];
}
