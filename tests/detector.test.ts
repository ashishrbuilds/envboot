import { describe, it, expect } from "vitest";
import { detectProject } from "../src/cli/core/detector.js";
import path from "path";
import fs from "fs";
import os from "os";

describe("Detector Core", () => {
  it("detects Vite React project and entry point", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-detect-vite-"));

    try {
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "my-vite-app",
          dependencies: {
            react: "^18.0.0",
            vite: "^5.0.0",
          },
        })
      );

      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "main.tsx"), "console.log('hi');");

      const info = detectProject(tmpDir);
      expect(info.framework).toBe("vite");
      expect(info.moduleType).toBe("esm");
      expect(info.detectedEntryPoint).toBe("src/main.tsx");
      expect(info.commands.runDev).toBe("npm run dev");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects Express project and main entry point from package.json with pnpm", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-detect-express-"));

    try {
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "my-express-app",
          main: "src/server.ts",
          dependencies: {
            express: "^4.18.0",
          },
        })
      );
      fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "# pnpm lockfile");

      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "server.ts"), "const express = require('express');");

      const info = detectProject(tmpDir);
      expect(info.framework).toBe("express");
      expect(info.packageManager).toBe("pnpm");
      expect(info.detectedEntryPoint).toBe("src/server.ts");
      expect(info.commands.runDev).toBe("pnpm dev");
      expect(info.commands.check).toBe("pnpm dlx envboot check");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects Bun project and Bun package manager", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-detect-bun-"));

    try {
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "my-bun-app",
          scripts: {
            dev: "bun run src/index.ts",
          },
        })
      );
      fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");

      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src", "index.ts"), "console.log('bun');");

      const info = detectProject(tmpDir);
      expect(info.packageManager).toBe("bun");
      expect(info.moduleType).toBe("esm");
      expect(info.detectedEntryPoint).toBe("src/index.ts");
      expect(info.commands.runDev).toBe("bun dev");
      expect(info.commands.check).toBe("bunx envboot check");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects Deno project from deno.json and tasks", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-detect-deno-"));

    try {
      fs.writeFileSync(
        path.join(tmpDir, "deno.json"),
        JSON.stringify({
          tasks: {
            dev: "deno run --watch main.ts",
          },
        })
      );

      fs.writeFileSync(path.join(tmpDir, "main.ts"), "console.log('deno');");

      const info = detectProject(tmpDir);
      expect(info.framework).toBe("deno");
      expect(info.packageManager).toBe("deno");
      expect(info.moduleType).toBe("esm");
      expect(info.detectedEntryPoint).toBe("main.ts");
      expect(info.commands.runDev).toBe("deno task dev");
      expect(info.commands.check).toBe("deno run --allow-all npm:envboot check");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
