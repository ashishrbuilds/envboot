import { describe, it, expect } from "vitest";
import { runInit } from "../src/cli/commands/init.js";
import { runCheck } from "../src/cli/commands/check.js";
import { runDoctor } from "../src/cli/commands/doctor.js";
import { runSync } from "../src/cli/commands/sync.js";
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

      await runInit({ yes: true, cwd: tmpDir, skipInstall: true });

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

  it("loads variables directly from .env file during check", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-cli-check-env-"));

    try {
      fs.writeFileSync(
        path.join(tmpDir, ".envboot.json"),
        JSON.stringify({
          required: ["VITE_APP_NAME"],
          optional: ["VITE_APP_BASE_URL"],
        })
      );

      fs.writeFileSync(
        path.join(tmpDir, ".env"),
        `
        VITE_APP_BASE_URL=
        VITE_APP_NAME='Kalyanam Studio'
        `
      );

      const passed = await runCheck({ cwd: tmpDir });
      expect(passed).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("runs doctor command and returns diagnostic results", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-cli-doctor-"));

    try {
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "doctor-app",
          dependencies: { envboot: "^0.1.5" },
        })
      );
      fs.writeFileSync(
        path.join(tmpDir, ".envboot.json"),
        JSON.stringify({
          required: ["HEALTH_CHECK_VAR"],
          optional: [],
        })
      );
      fs.writeFileSync(
        path.join(tmpDir, ".env"),
        `HEALTH_CHECK_VAR="ok"\n`
      );

      const passed = await runDoctor({ cwd: tmpDir });
      expect(passed).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("runs sync command to update .envboot.json and .env.example", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-cli-sync-"));

    try {
      fs.writeFileSync(
        path.join(tmpDir, ".envboot.json"),
        JSON.stringify({
          required: ["OLD_VAR"],
          optional: [],
        })
      );

      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "src", "index.ts"),
        `
        const v1 = process.env.OLD_VAR;
        const v2 = process.env.NEW_FEATURE_FLAG;
        `
      );

      await runSync({ cwd: tmpDir, yes: true });

      // Verify contract updated with NEW_FEATURE_FLAG
      const updatedConfig = JSON.parse(
        fs.readFileSync(path.join(tmpDir, ".envboot.json"), "utf-8")
      );
      expect(updatedConfig.required).toContain("NEW_FEATURE_FLAG");
      expect(updatedConfig.required).toContain("OLD_VAR");

      // Verify .env.example created
      const exampleContent = fs.readFileSync(path.join(tmpDir, ".env.example"), "utf-8");
      expect(exampleContent).toContain("NEW_FEATURE_FLAG=");
      expect(exampleContent).toContain("OLD_VAR=");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
