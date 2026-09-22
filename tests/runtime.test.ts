import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { init, validate, validateEnvironment, loadConfig } from "../src/index.js";
import { parseEnvContent } from "../src/runtime/config.js";
import { EnvBootConfig } from "../src/runtime/types.js";

describe("Runtime Guard", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnvironment", () => {
    it("passes when all required variables are set", () => {
      const config: EnvBootConfig = {
        required: ["DATABASE_URL", "JWT_SECRET"],
        optional: ["REDIS_URL"],
      };

      const env = {
        DATABASE_URL: "postgresql://localhost:5432/db",
        JWT_SECRET: "super-secret-key",
      };

      const result = validateEnvironment(config, env);
      expect(result.valid).toBe(true);
      expect(result.missingRequired).toEqual([]);
      expect(result.presentRequired).toEqual(["DATABASE_URL", "JWT_SECRET"]);
      expect(result.missingOptional).toEqual(["REDIS_URL"]);
    });

    it("fails when any required variable is missing or empty string", () => {
      const config: EnvBootConfig = {
        required: ["DATABASE_URL", "JWT_SECRET", "API_KEY"],
        optional: ["REDIS_URL"],
      };

      const env = {
        DATABASE_URL: "postgresql://localhost:5432/db",
        JWT_SECRET: "", // empty string should be treated as missing
      };

      const result = validateEnvironment(config, env);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toEqual(["JWT_SECRET", "API_KEY"]);
      expect(result.presentRequired).toEqual(["DATABASE_URL"]);
    });

    it("tracks optional variables properly", () => {
      const config: EnvBootConfig = {
        required: [],
        optional: ["REDIS_URL", "SENTRY_DSN"],
      };

      const env = {
        REDIS_URL: "redis://localhost:6379",
      };

      const result = validateEnvironment(config, env);
      expect(result.valid).toBe(true);
      expect(result.presentOptional).toEqual(["REDIS_URL"]);
      expect(result.missingOptional).toEqual(["SENTRY_DSN"]);
    });
  });

  describe("init()", () => {
    it("terminates process with code 1 when exitOnError is true and validation fails", () => {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("process.exit(1)");
      }) as any);

      expect(() => {
        init({
          configPath: "tests/fixtures/sample.envguard.json",
          exitOnError: true,
          quiet: true,
          env: {}, // empty env -> fails required vars
        });
      }).toThrow("process.exit(1)");

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it("does not exit when exitOnError is false", () => {
      const result = init({
        configPath: "tests/fixtures/sample.envguard.json",
        exitOnError: false,
        quiet: true,
        env: {},
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("parseEnvContent", () => {
    it("correctly parses key-value pairs with single and double quotes and empty values", () => {
      const raw = `
        # Comment line
        VITE_APP_BASE_URL=
        VITE_APP_NAME='Kalyanam Studio'
        API_SECRET="secret\\"value"
        NUMBER_VAL=12345 # trailing comment
        export EXPORTED_VAR=true
      `;
      const parsed = parseEnvContent(raw);
      expect(parsed.VITE_APP_BASE_URL).toBe("");
      expect(parsed.VITE_APP_NAME).toBe("Kalyanam Studio");
      expect(parsed.API_SECRET).toBe('secret"value');
      expect(parsed.NUMBER_VAL).toBe("12345");
      expect(parsed.EXPORTED_VAR).toBe("true");
    });
  });
});
