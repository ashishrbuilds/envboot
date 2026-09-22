import { describe, it, expect } from "vitest";
import { parseEnvFileContent, scanProject } from "../src/cli/core/scanner.js";
import path from "path";
import fs from "fs";
import os from "os";

describe("Scanner Core", () => {
  describe("parseEnvFileContent", () => {
    it("parses variable names ignoring comments, empty lines, and exports", () => {
      const sample = `
        # Database Config
        DATABASE_URL="postgres://user:pass@localhost:5432/db"
        
        # Auth
        export JWT_SECRET=supersecret
        API_KEY='12345'
        PORT=3000
        # Commented var:
        # DISABLED_VAR=true
      `;

      const result = parseEnvFileContent(sample);
      expect(result).toEqual(["DATABASE_URL", "JWT_SECRET", "API_KEY", "PORT"]);
    });
  });

  describe("scanProject", () => {
    it("extracts process.env, import.meta.env, Bun.env, and Deno.env.get across files", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envboot-scan-test-"));

      try {
        // Create sample files
        fs.writeFileSync(
          path.join(tmpDir, ".env.example"),
          "DATABASE_URL=postgres://...\nUNUSED_IN_CODE=123\n"
        );

        fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
        fs.writeFileSync(
          path.join(tmpDir, "src", "server.ts"),
          `
          const dbUrl = process.env.DATABASE_URL;
          const secret = process.env["JWT_SECRET"];
          const apiKey = process.env['API_KEY'];
          const bunPort = Bun.env.BUN_PORT;
          const denoSecret = Deno.env.get("DENO_SECRET");
          `
        );

        fs.writeFileSync(
          path.join(tmpDir, "src", "client.tsx"),
          `
          const viteUrl = import.meta.env.VITE_API_URL;
          const viteKey = import.meta.env["VITE_PUBLIC_KEY"];
          `
        );

        const result = await scanProject(tmpDir);

        expect(result.codeVariables).toContain("DATABASE_URL");
        expect(result.codeVariables).toContain("JWT_SECRET");
        expect(result.codeVariables).toContain("API_KEY");
        expect(result.codeVariables).toContain("BUN_PORT");
        expect(result.codeVariables).toContain("DENO_SECRET");
        expect(result.codeVariables).toContain("VITE_API_URL");
        expect(result.codeVariables).toContain("VITE_PUBLIC_KEY");
        expect(result.envFileVariables).toContain("DATABASE_URL");
        expect(result.envFileVariables).toContain("UNUSED_IN_CODE");
        expect(result.envFilesFound).toContain(".env.example");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
