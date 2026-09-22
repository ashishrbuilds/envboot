import fs from "fs";
import path from "path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { scanProject } from "../core/scanner.js";
import { detectProject } from "../core/detector.js";
import { prepareInjection, applyInjection } from "../core/injector.js";
import {
  promptVariableClassification,
  promptEntryPoint,
  promptConfirmChanges,
} from "../ui/prompts.js";

export interface InitCommandOptions {
  yes?: boolean;
  cwd?: string;
}

export async function runInit(options: InitCommandOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const isAutoYes = Boolean(options.yes);

  if (!isAutoYes) {
    p.intro(pc.bgCyan(pc.black(" EnvBoot Setup ")));
  }

  // 1. Scan codebase and env files
  const spinner = isAutoYes ? null : p.spinner();
  if (spinner) spinner.start("Scanning project for environment variables...");

  const scanResult = await scanProject(cwd);
  const projectInfo = detectProject(cwd);

  if (spinner) {
    spinner.stop(
      `Scanned ${scanResult.scannedFilesCount} files. Found ${scanResult.variables.size} unique variable(s).`
    );
  }

  // 2. Classify variables
  const allDiscoveredVars = Array.from(scanResult.variables.keys()).sort();
  let requiredVars: string[] = [];
  let optionalVars: string[] = [];

  if (allDiscoveredVars.length > 0) {
    if (isAutoYes) {
      // By default in -y mode, all variables used in code are required
      requiredVars = allDiscoveredVars;
    } else {
      const classification = await promptVariableClassification(allDiscoveredVars);
      requiredVars = classification.required;
      optionalVars = classification.optional;
    }
  } else {
    if (!isAutoYes) {
      p.log.warn(
        "No environment variables were detected in source files or .env files. You can edit .envboot.json manually later."
      );
    }
  }

  // 3. Detect / Select Entry Point
  let entryPoint: string | null = projectInfo.detectedEntryPoint;

  if (!isAutoYes) {
    entryPoint = await promptEntryPoint(
      projectInfo.possibleEntryPoints,
      projectInfo.detectedEntryPoint
    );
  }

  // 4. Prepare changes
  const configContent = JSON.stringify(
    {
      required: requiredVars,
      optional: optionalVars,
    },
    null,
    2
  );

  const configPath = path.join(cwd, ".envboot.json");
  const isEsm = projectInfo.moduleType === "esm";

  let injectionPlan = null;
  if (entryPoint) {
    injectionPlan = prepareInjection(entryPoint, cwd, isEsm);
  }

  // 5. Preview & Confirm
  if (!isAutoYes) {
    const diffPreview = injectionPlan ? injectionPlan.diff : "";
    const confirmed = await promptConfirmChanges(diffPreview, ".envboot.json");
    if (!confirmed) {
      p.cancel("Setup aborted.");
      process.exit(0);
    }
  }

  // 6. Apply Changes
  fs.writeFileSync(configPath, configContent + "\n", "utf-8");

  if (injectionPlan && !injectionPlan.alreadyInjected) {
    applyInjection(injectionPlan, cwd);
  }

  // 7. Success Outro
  if (!isAutoYes) {
    p.outro(
      `${pc.green("✔")} EnvBoot installed successfully!\n\n` +
        `  ${pc.bold("Next steps:")}\n` +
        `  1. Ensure your environment has the required variables set.\n` +
        `  2. Start your app: ${pc.cyan(projectInfo.commands.runDev)}\n` +
        `  3. Check environment status at any time: ${pc.cyan(projectInfo.commands.check)}\n`
    );
  } else {
    console.log(pc.green("✔ EnvBoot initialized successfully!"));
  }
}
