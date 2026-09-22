import { ValidationResult } from "./types.js";

// Zero-dependency terminal styling
const isColorSupported =
  typeof process !== "undefined" &&
  process.stdout &&
  process.stdout.isTTY &&
  !process.env.NO_COLOR;

const c = {
  red: (str: string) => (isColorSupported ? `\x1b[31m${str}\x1b[0m` : str),
  green: (str: string) => (isColorSupported ? `\x1b[32m${str}\x1b[0m` : str),
  yellow: (str: string) => (isColorSupported ? `\x1b[33m${str}\x1b[0m` : str),
  dim: (str: string) => (isColorSupported ? `\x1b[2m${str}\x1b[0m` : str),
  bold: (str: string) => (isColorSupported ? `\x1b[1m${str}\x1b[0m` : str),
  redBold: (str: string) => (isColorSupported ? `\x1b[1;31m${str}\x1b[0m` : str),
};

export function logValidationFailure(result: ValidationResult): void {
  const lines: string[] = [];

  lines.push("");
  lines.push(`${c.redBold("❌ Environment validation failed")}`);
  lines.push("");

  if (result.missingRequired.length > 0) {
    lines.push(c.bold("Missing required environment variables:"));
    lines.push("");
    for (const key of result.missingRequired) {
      lines.push(`  ${c.red("•")} ${c.bold(key)}`);
    }
    lines.push("");
  }

  if (result.missingOptional.length > 0) {
    lines.push(c.dim("Optional variables missing:"));
    lines.push("");
    for (const key of result.missingOptional) {
      lines.push(`  ${c.dim("•")} ${c.dim(key)}`);
    }
    lines.push("");
  }

  lines.push(c.red("Application startup cancelled."));
  lines.push(c.dim("Set the required variables in your .env file or environment before starting."));
  lines.push("");

  console.error(lines.join("\n"));
}

export function logMissingConfigFile(searchedPath: string): void {
  console.warn(
    `\n${c.yellow("⚠ [envboot]")} Could not find .envboot.json at "${searchedPath}".\n` +
      `  Run ${c.bold("npx envboot init")} to generate your environment contract.\n`
  );
}
