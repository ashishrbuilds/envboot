import { describe, it, expect } from "vitest";
import { runInit } from "../src/cli/commands/init.js";
import { runCheck } from "../src/cli/commands/check.js";
import path from "path";
import fs from "fs";
import os from "os";

describe("CLI End-to-End", () => {
  it("runs init --yes on a fixture project and generates valid .envboot.json and entry injection", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-cli-init-"));

    try {
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-app",
          main: "src/index.ts",
          dependencies: { express: "^4.18.0" },
        })
      );

      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "index.ts"),
        `
        const db = process.env.DATABASE_URL;
        const secret = process.env.JWT_SECRET;
        `
      );

      await runInit({ yes: true, cwd: tmpDir });

      // Verify .envboot.json created
      const configPath = path.join(tmpDir, ".envboot.json");
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.required).toContain("DATABASE_URL");
      expect(config.required).toContain("JWT_SECRET");

      // Verify entry point injected
      const entryContent = fs.readFileSync(path.join(tmpDir, "src", "index.ts"), "utf-8");
      expect(entryContent).toContain("envboot.init()");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("runs check command and passes when environment is complete", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-cli-check-"));

    try {
      fs.writeFileSync(
        path.join(tmpDir, ".envboot.json"),
        JSON.stringify({
          required: ["MY_API_KEY"],
          optional: ["DEBUG_MODE"],
        })
      );

      process.env.MY_API_KEY = "12345";

      const passed = await runCheck({ cwd: tmpDir });
      expect(passed).toBe(true);
    } finally {
      delete process.env.MY_API_KEY;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
