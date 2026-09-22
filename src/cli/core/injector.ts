import fs from "fs";
import path from "path";
import { generateDiff } from "./diff.js";

export interface InjectionPlan {
  filePath: string;
  originalContent: string;
  newContent: string;
  diff: string;
  alreadyInjected: boolean;
}

export function prepareInjection(
  entryFilePath: string,
  cwd: string = process.cwd(),
  isEsm: boolean = true
): InjectionPlan {
  const fullPath = path.resolve(cwd, entryFilePath);
  let originalContent = "";

  if (fs.existsSync(fullPath)) {
    originalContent = fs.readFileSync(fullPath, "utf-8");
  }

  // Check if already contains envboot.init() or envGuard.init()
  if (
    originalContent.includes("envboot.init()") ||
    originalContent.includes("envboot.validate(") ||
    originalContent.includes("envGuard.init()")
  ) {
    return {
      filePath: entryFilePath,
      originalContent,
      newContent: originalContent,
      diff: "",
      alreadyInjected: true,
    };
  }

  const importStatement = isEsm
    ? `import envboot from "envboot";\n\nenvboot.init();\n`
    : `const envboot = require("envboot");\n\nenvboot.init();\n`;

  const lines = originalContent.split("\n");
  let insertIndex = 0;

  // Preserve shebang, directives like "use client", "use server", ts-nocheck
  while (insertIndex < lines.length) {
    const line = lines[insertIndex].trim();
    if (
      line.startsWith("#!") ||
      line.startsWith('"use client"') ||
      line.startsWith("'use client'") ||
      line.startsWith('"use server"') ||
      line.startsWith("'use server'") ||
      line.startsWith("// @ts-nocheck") ||
      line.startsWith("/* eslint-disable")
    ) {
      insertIndex++;
    } else {
      break;
    }
  }

  const beforeLines = lines.slice(0, insertIndex);
  const afterLines = lines.slice(insertIndex);

  const prefix = beforeLines.length > 0 ? beforeLines.join("\n") + "\n\n" : "";
  const suffix = afterLines.join("\n");

  const newContent = `${prefix}${importStatement}\n${suffix}`.replace(/\n{3,}/g, "\n\n");
  const diff = generateDiff(entryFilePath, originalContent, newContent);

  return {
    filePath: entryFilePath,
    originalContent,
    newContent,
    diff,
    alreadyInjected: false,
  };
}

export function applyInjection(plan: InjectionPlan, cwd: string = process.cwd()): void {
  const fullPath = path.resolve(cwd, plan.filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, plan.newContent, "utf-8");
}
