import fs from "fs";
import path from "path";
import { execSync } from "child_process";
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
  skipInstall?: boolean;
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
      ignore: ["NODE_ENV", "TZ"],
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

  // 6. Apply Changes (with loader)
  const applySpinner = isAutoYes ? null : p.spinner();
  if (applySpinner) {
    applySpinner.start("Applying environment contract and configuring project...");
  }

  fs.writeFileSync(configPath, configContent + "\n", "utf-8");

  if (injectionPlan && !injectionPlan.alreadyInjected) {
    applyInjection(injectionPlan, cwd);
  }

  if (applySpinner) {
    applySpinner.stop("Applied environment contract and startup guard.");
  }

  // 7. Install package dependency if needed
  const deps: Record<string, any> = {
    ...(projectInfo.packageJson?.dependencies || {}),
    ...(projectInfo.packageJson?.devDependencies || {}),
  };
  const isInstalled = Boolean(deps["envboot"]);

  if (!isInstalled && !options.skipInstall && (projectInfo.packageJson || projectInfo.denoConfig)) {
    const installSpinner = isAutoYes ? null : p.spinner();
    if (installSpinner) {
      installSpinner.start(`Installing envboot with ${projectInfo.packageManager}...`);
    }

    try {
      execSync(projectInfo.commands.install, {
        cwd,
        stdio: "ignore",
      });
      if (installSpinner) {
        installSpinner.stop(`Installed envboot dependency via ${projectInfo.packageManager}.`);
      }
    } catch {
      if (installSpinner) {
        installSpinner.stop(
          pc.yellow(`Could not auto-install envboot. Please run: ${projectInfo.commands.install}`)
        );
      }
    }
  }

  // 8. Success Outro
  if (!isAutoYes) {
    const devScriptExample =
      projectInfo.framework === "vite"
        ? 'envboot check && vite'
        : `envboot check && ${projectInfo.commands.runDev}`;
    const buildScriptExample =
      projectInfo.framework === "vite"
        ? 'envboot check && tsc -b && vite build'
        : 'envboot check && npm run build';

    p.outro(
      `${pc.green("✔")} EnvBoot initialized successfully!\n\n` +
        `  ${pc.bold("Next steps:")}\n` +
        `  1. Ensure your environment has the required variables set.\n` +
        `  2. Start your app: ${pc.cyan(projectInfo.commands.runDev)}\n` +
        `  3. Check environment status at any time: ${pc.cyan(projectInfo.commands.check)}\n` +
        `  4. ${pc.bold("Best Practice (Fail-fast in package.json):")}\n` +
        `     Add ${pc.cyan("envboot check")} to your scripts to block dev/build on missing variables:\n` +
        `       ${pc.dim('"dev"')}:   ${pc.green(`"${devScriptExample}"`)}\n` +
        `       ${pc.dim('"build"')}: ${pc.green(`"${buildScriptExample}"`)}\n`
    );
  } else {
    console.log(pc.green("✔ EnvBoot initialized successfully!"));
  }
}
