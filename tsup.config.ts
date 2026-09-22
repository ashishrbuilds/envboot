import { defineConfig } from "tsup";

export default defineConfig([
  // Runtime build (Dual CJS and ESM, zero external dependencies)
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    outDir: "dist",
  },
  // CLI build (Single executable file, bundles CLI dependencies)
  {
    entry: {
      cli: "src/cli/index.ts",
    },
    format: ["cjs"],
    dts: false,
    clean: false,
    sourcemap: false,
    noExternal: [/.*/],
    outDir: "dist",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
