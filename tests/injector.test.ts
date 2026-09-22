import { describe, it, expect } from "vitest";
import { prepareInjection, applyInjection } from "../src/cli/core/injector.js";
import path from "path";
import fs from "fs";
import os from "os";

describe("Injector Core", () => {
  it("injects ESM import at top while preserving client directives", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-injector-"));

    try {
      const filePath = "src/main.tsx";
      const initialContent = `"use client";\n\nimport React from "react";\n`;

      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, filePath), initialContent);

      const plan = prepareInjection(filePath, tmpDir, true);
      expect(plan.alreadyInjected).toBe(false);
      expect(plan.newContent).toContain('"use client";');
      expect(plan.newContent).toContain('import envboot from "envboot";');
      expect(plan.newContent).toContain("envboot.init();");

      applyInjection(plan, tmpDir);

      const saved = fs.readFileSync(path.join(tmpDir, filePath), "utf-8");
      expect(saved).toBe(plan.newContent);

      // Subsequent injection should do nothing
      const plan2 = prepareInjection(filePath, tmpDir, true);
      expect(plan2.alreadyInjected).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("injects CJS require for CommonJS projects", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-injector-cjs-"));

    try {
      const filePath = "src/server.js";
      const initialContent = `const express = require("express");\n`;

      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, filePath), initialContent);

      const plan = prepareInjection(filePath, tmpDir, false);
      expect(plan.newContent).toContain('const envboot = require("envboot");');
      expect(plan.newContent).toContain("envboot.init();");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
