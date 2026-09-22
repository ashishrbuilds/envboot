import fs from "fs";
import path from "path";
import fg from "fast-glob";

export interface DiscoveredVariable {
  name: string;
  sources: {
    inCode: string[]; // file paths where used
    inEnvFiles: string[]; // .env files where defined
  };
}

export interface ScanResult {
  variables: Map<string, DiscoveredVariable>;
  codeVariables: string[];
  envFileVariables: string[];
  scannedFilesCount: number;
  envFilesFound: string[];
}

const IGNORED_DIRS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.output/**",
  "**/out/**",
  "**/coverage/**",
  "**/.turbo/**",
  "**/.vercel/**",
  "**/.cache/**",
];

const CODE_EXTENSIONS = ["js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte"];

// Matches:
// process.env.FOO_BAR / process.env['FOO_BAR'] / process.env["FOO_BAR"]
// import.meta.env.FOO_BAR / import.meta.env['FOO_BAR']
// Bun.env.FOO_BAR / Bun.env['FOO_BAR']
const STANDARD_ENV_REGEX = /(?:process\.env|import\.meta\.env|Bun\.env)(?:\.([A-Za-z0-9_]+)|\[\s*['"`]([A-Za-z0-9_]+)['"`]\s*\])/g;

// Matches:
// Deno.env.get("FOO_BAR") / Deno.env.get('FOO_BAR')
const DENO_ENV_REGEX = /Deno\.env\.get\(\s*['"`]([A-Za-z0-9_]+)['"`]\s*\)/g;

export const DEFAULT_IGNORED_VARS = new Set(["NODE_ENV", "TZ"]);

export function parseEnvFileContent(content: string): string[] {
  const vars: string[] = [];
  const lines = content.split("\n");

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    // Remove 'export ' prefix if present
    if (line.startsWith("export ")) {
      line = line.slice(7).trim();
    }

    const equalIndex = line.indexOf("=");
    if (equalIndex > 0) {
      const key = line.slice(0, equalIndex).trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        vars.push(key);
      }
    }
  }

  return vars;
}

export async function scanProject(cwd: string = process.cwd()): Promise<ScanResult> {
  const variables = new Map<string, DiscoveredVariable>();
  const codeVariablesSet = new Set<string>();
  const envFileVariablesSet = new Set<string>();

  const getOrCreate = (name: string): DiscoveredVariable => {
    if (!variables.has(name)) {
      variables.set(name, {
        name,
        sources: {
          inCode: [],
          inEnvFiles: [],
        },
      });
    }
    return variables.get(name)!;
  };

  // 1. Scan .env* files
  const envPattern = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
    ".env.production",
    ".env.production.local",
    ".env.test",
    ".env.test.local",
    ".env.example",
    ".env.sample",
    ".env.defaults",
  ];

  const envFilesFound: string[] = [];
  for (const envFile of envPattern) {
    const fullPath = path.join(cwd, envFile);
    if (fs.existsSync(fullPath)) {
      envFilesFound.push(envFile);
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const parsedKeys = parseEnvFileContent(content);
        for (const key of parsedKeys) {
          if (DEFAULT_IGNORED_VARS.has(key)) continue;
          envFileVariablesSet.add(key);
          const record = getOrCreate(key);
          if (!record.sources.inEnvFiles.includes(envFile)) {
            record.sources.inEnvFiles.push(envFile);
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // 2. Scan source code files
  const codeGlob = `**/*.{${CODE_EXTENSIONS.join(",")}}`;
  const codeFiles = await fg(codeGlob, {
    cwd,
    ignore: IGNORED_DIRS,
    dot: false,
    absolute: false,
  });

  for (const relFile of codeFiles) {
    const absFile = path.join(cwd, relFile);
    try {
      const content = fs.readFileSync(absFile, "utf-8");

      // Match process.env / import.meta.env / Bun.env
      let match: RegExpExecArray | null;
      STANDARD_ENV_REGEX.lastIndex = 0;
      while ((match = STANDARD_ENV_REGEX.exec(content)) !== null) {
        const varName = match[1] || match[2];
        if (!varName) continue;
        if (DEFAULT_IGNORED_VARS.has(varName)) continue;

        codeVariablesSet.add(varName);
        const record = getOrCreate(varName);
        if (!record.sources.inCode.includes(relFile)) {
          record.sources.inCode.push(relFile);
        }
      }

      // Match Deno.env.get("...")
      DENO_ENV_REGEX.lastIndex = 0;
      while ((match = DENO_ENV_REGEX.exec(content)) !== null) {
        const varName = match[1];
        if (!varName) continue;
        if (DEFAULT_IGNORED_VARS.has(varName)) continue;

        codeVariablesSet.add(varName);
        const record = getOrCreate(varName);
        if (!record.sources.inCode.includes(relFile)) {
          record.sources.inCode.push(relFile);
        }
      }
    } catch {
      // Ignore unreadable files
    }
  }

  return {
    variables,
    codeVariables: Array.from(codeVariablesSet).sort(),
    envFileVariables: Array.from(envFileVariablesSet).sort(),
    scannedFilesCount: codeFiles.length,
    envFilesFound,
  };
}
