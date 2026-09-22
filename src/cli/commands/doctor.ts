import fs from "fs";
import path from "path";
import pc from "picocolors";
import { detectProject } from "../core/detector.js";
import { scanProject } from "../core/scanner.js";
import { loadConfig, loadProjectEnv, findConfigFile } from "../../runtime/config.js";
import { validateEnvironment } from "../../runtime/validator.js";

export interface DoctorCommandOptions {
  cwd?: string;
  config?: string;
}

export async function runDoctor(options: DoctorCommandOptions = {}): Promise<boolean> {
  const cwd = options.cwd || process.cwd();

  console.log("\n" + pc.bgCyan(pc.black(" 🩺 EnvBoot Doctor — Diagnostic Health Check ")));
  console.log("");

  // 1. Detect project environment
  const projectInfo = detectProject(cwd);
  const configPath = findConfigFile(cwd, options.config);
  const config = configPath ? loadConfig(options.config, cwd) : null;
  const scanResult = await scanProject(cwd);
  const projectEnv = loadProjectEnv(cwd);

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Project Info Table
  console.log(pc.bold("Project Environment"));
  console.log(pc.dim("────────────────────────────────────────────────────────────"));
  console.log(`  Framework:        ${pc.cyan(projectInfo.framework.toUpperCase())}`);
  console.log(`  Package Manager:  ${pc.cyan(projectInfo.packageManager)}`);
  console.log(`  Module Type:      ${pc.cyan(projectInfo.moduleType.toUpperCase())}`);

  // Entry point analysis
  if (projectInfo.detectedEntryPoint) {
    const fullEntryPath = path.join(cwd, projectInfo.detectedEntryPoint);
    let isInjected = false;
    if (fs.existsSync(fullEntryPath)) {
      const entryContent = fs.readFileSync(fullEntryPath, "utf-8");
      isInjected = entryContent.includes("envboot");
    }
    const entryStatus = isInjected ? pc.green("✓ Injected") : pc.yellow("○ Not yet injected");
    console.log(`  Entry Point:      ${projectInfo.detectedEntryPoint} (${entryStatus})`);
    if (!isInjected) {
      recommendations.push(
        `Import envboot in ${pc.cyan(projectInfo.detectedEntryPoint)} or run ${pc.cyan("npx envboot init")} to auto-inject.`
      );
    }
  } else {
    console.log(`  Entry Point:      ${pc.dim("No standard entry point detected")}`);
  }

  // Contract analysis
  if (configPath) {
    console.log(`  Contract:         ${path.relative(cwd, configPath)} (${pc.green("✓ Found")})`);
  } else {
    console.log(`  Contract:         ${pc.red("✗ Missing (.envboot.json not found)")}`);
    issues.push("No .envboot.json contract found.");
    recommendations.push(`Run ${pc.cyan("npx envboot init")} to generate your .envboot.json contract.`);
  }

  // Env files found
  const envFilesStr = scanResult.envFilesFound.length > 0
    ? scanResult.envFilesFound.join(", ")
    : pc.dim("None found");
  console.log(`  Env Files:        ${envFilesStr}`);
  console.log("");

  // 2. Health & Dependency Checks
  console.log(pc.bold("Diagnostics & Health"));
  console.log(pc.dim("────────────────────────────────────────────────────────────"));

  // Check package dependency in package.json
  const deps = {
    ...(projectInfo.packageJson?.dependencies || {}),
    ...(projectInfo.packageJson?.devDependencies || {}),
  };
  const envbootVersion = deps["envboot"] || deps["@ashishrbuilds/envboot"];
  if (envbootVersion) {
    console.log(`  ${pc.green("✓")} Package dependency: envboot (${envbootVersion})`);
  } else if (projectInfo.packageJson) {
    console.log(`  ${pc.yellow("⚠")} Package dependency: envboot is not in package.json`);
    recommendations.push(`Install envboot: ${pc.cyan(projectInfo.commands.install)}`);
  }

  if (config) {
    const requiredList = config.required || [];
    const optionalList = config.optional || [];
    console.log(`  ${pc.green("✓")} Contract schema: ${requiredList.length} required, ${optionalList.length} optional variable(s)`);

    const validationResult = validateEnvironment(config, projectEnv);

    if (validationResult.missingRequired.length > 0) {
      console.log(`  ${pc.red("✗")} Missing ${validationResult.missingRequired.length} required environment variable(s):`);
      for (const missing of validationResult.missingRequired) {
        console.log(`      ${pc.red("•")} ${pc.bold(missing)} (Value is empty or undefined)`);
      }
      issues.push(`Missing required variables: ${validationResult.missingRequired.join(", ")}`);
      recommendations.push(
        `Define values for [${validationResult.missingRequired.join(", ")}] in .env or your environment.`
      );
    } else {
      console.log(`  ${pc.green("✓")} All required variables are set in environment`);
    }

    if (validationResult.missingOptional.length > 0) {
      console.log(`  ${pc.dim("○")} ${validationResult.missingOptional.length} optional variable(s) not set: ${validationResult.missingOptional.join(", ")}`);
    }

    // Check code drift
    const ignoreList = config.ignore || ["NODE_ENV", "TZ"];
    const contractAll = new Set([...requiredList, ...optionalList, ...ignoreList]);
    const undocumented: string[] = [];
    for (const codeVar of scanResult.codeVariables) {
      if (!contractAll.has(codeVar)) {
        undocumented.push(codeVar);
      }
    }

    if (undocumented.length > 0) {
      console.log(`  ${pc.yellow("⚠")} Source drift: ${undocumented.length} variable(s) used in code but missing from contract:`);
      for (const uv of undocumented) {
        console.log(`      ${pc.yellow("•")} ${uv}`);
      }
      recommendations.push(`Run ${pc.cyan("npx envboot sync")} to synchronize newly added variables.`);
    } else {
      console.log(`  ${pc.green("✓")} Source code and contract are fully in sync (0 drift)`);
    }
  }

  console.log("");

  // 3. Recommendations
  if (recommendations.length > 0) {
    console.log(pc.bold("🩺 Doctor Recommendations"));
    console.log(pc.dim("────────────────────────────────────────────────────────────"));
    recommendations.forEach((rec, idx) => {
      console.log(`  ${pc.cyan(`${idx + 1}.`)} ${rec}`);
    });
    console.log("");
  } else {
    console.log(pc.green("✨ Everything looks healthy! No issues detected."));
    console.log("");
  }

  const passed = issues.length === 0;
  return passed;
}
