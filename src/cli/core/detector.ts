import fs from "fs";
import path from "path";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "deno";

export interface ProjectInfo {
  framework: "next" | "vite" | "express" | "node" | "nestjs" | "deno" | "unknown";
  moduleType: "esm" | "cjs";
  packageManager: PackageManager;
  packageJson: Record<string, unknown> | null;
  denoConfig: Record<string, unknown> | null;
  detectedEntryPoint: string | null;
  possibleEntryPoints: string[];
  commands: {
    runDev: string;
    check: string;
    install: string;
  };
}

const COMMON_ENTRY_POINTS = [
  "src/server.ts",
  "src/server.js",
  "src/main.ts",
  "src/main.tsx",
  "src/main.js",
  "src/main.jsx",
  "src/index.ts",
  "src/index.tsx",
  "src/index.js",
  "src/index.jsx",
  "src/app.ts",
  "src/app.js",
  "server.ts",
  "server.js",
  "main.ts",
  "main.js",
  "index.ts",
  "index.js",
  "app.ts",
  "app.js",
];

const NEXT_ENTRY_POINTS = [
  "src/instrumentation.ts",
  "src/instrumentation.js",
  "instrumentation.ts",
  "instrumentation.js",
  "src/app/layout.tsx",
  "src/app/layout.jsx",
  "src/app/layout.js",
  "app/layout.tsx",
  "app/layout.jsx",
  "app/layout.js",
  "src/pages/_app.tsx",
  "src/pages/_app.jsx",
  "pages/_app.tsx",
  "pages/_app.jsx",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
];

export function detectPackageManager(cwd: string): PackageManager {
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) {
    return "bun";
  }
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  }
  if (
    fs.existsSync(path.join(cwd, "deno.json")) ||
    fs.existsSync(path.join(cwd, "deno.jsonc")) ||
    fs.existsSync(path.join(cwd, "deno.lock"))
  ) {
    return "deno";
  }
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) {
    return "npm";
  }
  return "npm";
}

export function detectProject(cwd: string = process.cwd()): ProjectInfo {
  let packageJson: Record<string, any> | null = null;
  let denoConfig: Record<string, any> | null = null;

  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    } catch {
      // ignore
    }
  }

  const denoPath = path.join(cwd, "deno.json");
  const denoJsoncPath = path.join(cwd, "deno.jsonc");
  if (fs.existsSync(denoPath)) {
    try {
      denoConfig = JSON.parse(fs.readFileSync(denoPath, "utf-8"));
    } catch {
      // ignore
    }
  } else if (fs.existsSync(denoJsoncPath)) {
    try {
      // Basic JSONC parse
      const raw = fs.readFileSync(denoJsoncPath, "utf-8");
      denoConfig = JSON.parse(raw.replace(/\/\/.*$/gm, ""));
    } catch {
      // ignore
    }
  }

  const packageManager = detectPackageManager(cwd);

  const deps = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
  };

  // 1. Detect Framework
  let framework: ProjectInfo["framework"] = "unknown";
  if (deps["next"] || fs.existsSync(path.join(cwd, "next.config.js")) || fs.existsSync(path.join(cwd, "next.config.mjs"))) {
    framework = "next";
  } else if (deps["vite"] || fs.existsSync(path.join(cwd, "vite.config.ts")) || fs.existsSync(path.join(cwd, "vite.config.js"))) {
    framework = "vite";
  } else if (deps["@nestjs/core"]) {
    framework = "nestjs";
  } else if (deps["express"]) {
    framework = "express";
  } else if (denoConfig && !packageJson) {
    framework = "deno";
  } else if (packageJson) {
    framework = "node";
  }

  // 2. Detect Module Type (ESM vs CJS)
  let moduleType: ProjectInfo["moduleType"] = "cjs";
  if (packageJson?.type === "module" || framework === "vite" || framework === "next" || packageManager === "bun" || packageManager === "deno") {
    moduleType = "esm";
  }

  // 3. Find Entry Points
  const possibleEntryPoints: string[] = [];
  const foundCandidates = new Set<string>();

  const checkAndAdd = (filePath: string) => {
    if (fs.existsSync(path.join(cwd, filePath)) && !foundCandidates.has(filePath)) {
      foundCandidates.add(filePath);
      possibleEntryPoints.push(filePath);
    }
  };

  // Priority 1: package.json "main" / "module"
  if (typeof packageJson?.main === "string") {
    const mainFile = packageJson.main;
    checkAndAdd(mainFile);

    if (mainFile.startsWith("dist/") || mainFile.startsWith("build/") || mainFile.startsWith("lib/")) {
      const srcTs = mainFile.replace(/^(dist|build|lib)\//, "src/").replace(/\.js$/, ".ts");
      const srcJs = mainFile.replace(/^(dist|build|lib)\//, "src/").replace(/\.js$/, ".js");
      checkAndAdd(srcTs);
      checkAndAdd(srcJs);
    }
  }

  if (typeof packageJson?.module === "string") {
    checkAndAdd(packageJson.module);
  }

  // Priority 2: package.json / deno.json scripts and tasks
  const scripts = packageJson?.scripts || {};
  const tasks = denoConfig?.tasks || {};
  const devStartScripts = [
    scripts.dev,
    scripts.start,
    scripts.serve,
    tasks.dev,
    tasks.start,
    tasks.serve,
  ].filter(Boolean);

  for (const script of devStartScripts) {
    const tokens = typeof script === "string" ? script.split(/\s+/) : [];
    for (const token of tokens) {
      if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(token)) {
        checkAndAdd(token);
      }
    }
  }

  // Priority 3: Framework-specific standard entries
  if (framework === "next") {
    for (const entry of NEXT_ENTRY_POINTS) {
      checkAndAdd(entry);
    }
  }

  // Priority 4: Common conventions
  for (const entry of COMMON_ENTRY_POINTS) {
    checkAndAdd(entry);
  }

  const detectedEntryPoint = possibleEntryPoints.length > 0 ? possibleEntryPoints[0] : null;

  // Build tailored commands
  let runDev = "npm run dev";
  let check = "npx envboot check";
  let install = "npm install envboot";

  switch (packageManager) {
    case "bun":
      runDev = "bun dev";
      check = "bunx envboot check";
      install = "bun add envboot";
      break;
    case "pnpm":
      runDev = "pnpm dev";
      check = "pnpm dlx envboot check";
      install = "pnpm add envboot";
      break;
    case "yarn":
      runDev = "yarn dev";
      check = "yarn dlx envboot check";
      install = "yarn add envboot";
      break;
    case "deno":
      runDev = denoConfig?.tasks?.dev ? "deno task dev" : "deno run --allow-all src/main.ts";
      check = "deno run --allow-all npm:envboot check";
      install = "deno add npm:envboot";
      break;
    case "npm":
    default:
      runDev = "npm run dev";
      check = "npx envboot check";
      install = "npm install envboot";
      break;
  }

  return {
    framework,
    moduleType,
    packageManager,
    packageJson,
    denoConfig,
    detectedEntryPoint,
    possibleEntryPoints,
    commands: {
      runDev,
      check,
      install,
    },
  };
}
