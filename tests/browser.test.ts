import { describe, it, expect } from "vitest";
import { init, validate, getBrowserEnv } from "../src/browser.js";

describe("Browser Runtime", () => {
  it("runs in browser environment without Node fs/path dependencies", () => {
    const result = init({
      config: {
        required: ["VITE_API_URL"],
        optional: ["VITE_ANALYTICS_KEY"],
      },
      env: {
        VITE_API_URL: "https://api.example.com",
      },
      quiet: true,
    });

    expect(result.valid).toBe(true);
    expect(result.presentRequired).toEqual(["VITE_API_URL"]);
    expect(result.missingOptional).toEqual(["VITE_ANALYTICS_KEY"]);
  });

  it("throws fatal error in browser mode when exitOnError is true and variables are missing", () => {
    expect(() => {
      init({
        config: {
          required: ["VITE_SECRET_API_KEY"],
        },
        env: {},
        quiet: true,
        exitOnError: true,
      });
    }).toThrow("[envboot] Environment validation failed. Missing required environment variable(s): VITE_SECRET_API_KEY");
  });

  it("returns invalid result without throwing when exitOnError is false", () => {
    const result = init({
      config: {
        required: ["VITE_SECRET_API_KEY"],
      },
      env: {},
      quiet: true,
      exitOnError: false,
    });

    expect(result.valid).toBe(false);
    expect(result.missingRequired).toEqual(["VITE_SECRET_API_KEY"]);
  });
});
