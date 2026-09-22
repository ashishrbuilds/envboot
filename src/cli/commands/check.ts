import fs from "fs";
import path from "path";
import pc from "picocolors";
import { loadConfig, loadProjectEnv } from "../../runtime/config.js";
import { validateEnvironment } from "../../runtime/validator.js";
import { scanProject } from "../core/scanner.js";
import { printCheckReport, CheckReportData } from "../ui/reporter.js";

export interface CheckCommandOptions {
  config?: string;
  strict?: boolean; // If true, fails on undocumented source usage as well
  cwd?: string;
}

export async function runCheck(options: CheckCommandOptions = {}): Promise<boolean> {
  const cwd = options.cwd || process.cwd();
  const config = loadConfig(options.config, cwd);

  if (!config) {
    console.error(
      pc.red("Error:") +
        ` No .envboot.json found in ${cwd}.\n` +
        `Run ${pc.cyan("npx envboot init")} to initialize your environment contract first.\n`
    );
    process.exit(1);
  }

  // 1. Validate actual environment (merging .env files + system env) vs contract
  const projectEnv = loadProjectEnv(cwd);
  const validationResult = validateEnvironment(config, projectEnv);

  // 2. Scan project for source drift and dead env variables
  const scanResult = await scanProject(cwd);

  const contractRequired = new Set(config.required || []);
  const contractOptional = new Set(config.optional || []);
  const contractIgnored = new Set(config.ignore || ["NODE_ENV", "TZ"]);
  const allContractVars = new Set([...contractRequired, ...contractOptional, ...contractIgnored]);

  const undocumentedInCode: Array<{ name: string; files: string[] }> = [];
  for (const varName of scanResult.codeVariables) {
    if (!allContractVars.has(varName)) {
      const record = scanResult.variables.get(varName);
      undocumentedInCode.push({
        name: varName,
        files: record?.sources.inCode || [],
      });
    }
  }

  const codeVarsSet = new Set(scanResult.codeVariables);
  const unusedInEnvFiles: Array<{ name: string; files: string[] }> = [];
  for (const varName of scanResult.envFileVariables) {
    if (!codeVarsSet.has(varName) && !allContractVars.has(varName)) {
      const record = scanResult.variables.get(varName);
      unusedInEnvFiles.push({
        name: varName,
        files: record?.sources.inEnvFiles || [],
      });
    }
  }

  const reportData: CheckReportData = {
    presentRequired: validationResult.presentRequired,
    missingRequired: validationResult.missingRequired,
    presentOptional: validationResult.presentOptional,
    missingOptional: validationResult.missingOptional,
    undocumentedInCode,
    unusedInEnvFiles,
  };

  const passed = printCheckReport(reportData);

  if (!passed || (options.strict && undocumentedInCode.length > 0)) {
    process.exit(1);
  }

  return passed;
}
