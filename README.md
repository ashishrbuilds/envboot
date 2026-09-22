# EnvBoot 🚀

> **Your app shouldn't start with a broken environment.**

Automatically discover, configure, and validate environment variables across **Node.js, Bun, Deno, Next.js, Vite, and Express** with **zero runtime dependencies**.

[![npm version](https://img.shields.io/npm/v/envboot.svg)](https://www.npmjs.com/package/envboot)
[![GitHub](https://img.shields.io/github/stars/ashishrbuilds/envboot?style=social)](https://github.com/ashishrbuilds/envboot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-success.svg)](https://www.npmjs.com/package/envboot)

---

## The Problem

A developer clones an existing project:

```bash
git clone https://github.com/ashishrbuilds/envboot.git
cd envboot
bun install  # or npm / pnpm / yarn / deno
bun dev
```

Application starts. 5 minutes later during testing:
- ❌ Database connection failed (`DATABASE_URL` is undefined)
- ❌ Auth crashed (`JWT_SECRET` missing)
- ❌ Feature X threw runtime TypeError

---

## The Solution: 30-Second Killer Demo

Run the setup wizard with your favorite package manager:

```bash
# npm
npx envboot init

# pnpm
pnpm dlx envboot init

# bun
bunx envboot init

# yarn
yarn dlx envboot init

# deno
deno run --allow-all npm:envboot init
```

The CLI scans your codebase, detects environment usage (`process.env.*`, `import.meta.env.*`, `Bun.env.*`, `Deno.env.get(*)`, `.env*` files), generates an environment contract (`.envboot.json`), and installs a startup guard into your entry point.

Now, whenever anyone starts the application:

```bash
npm run dev   # or bun dev / pnpm dev / yarn dev / deno task dev
```

If required environment variables are missing, it fails fast **immediately at boot**:

```text
❌ Environment validation failed

Missing required environment variables:

  • DATABASE_URL
  • JWT_SECRET

Optional variables missing:

  • REDIS_URL

Application startup cancelled.
Set the required variables in your .env file or environment before starting.
```

Developer fixes their `.env` file, starts the app, and everything runs smoothly.

---

## Key Features

- ⚡ **Zero Runtime Dependencies**: The runtime guard has **0 dependencies** and works out of the box on **Node.js, Bun, and Deno**.
- 📦 **Works With All Package Managers**: First-class support for **npm, pnpm, bun, yarn, and deno**.
- 🔍 **Universal Variable Scanner**: Scans for `process.env.X`, `import.meta.env.X`, `Bun.env.X`, `Deno.env.get("X")`, and all `.env*` files.
- 🎯 **Non-Invasive**: Keep using standard native syntax (`process.env.DATABASE_URL` or `Bun.env.DATABASE_URL`) — no wrapper objects or refactoring required.
- 🚀 **Smart Entry-Point & Framework Detection**: Automatically configures **Node.js, Bun, Deno, Express, Vite, Next.js, and NestJS**.
- 🔒 **CI/CD Drift Checker**: `envboot check` ensures that your production environment and codebase never drift apart — **with guaranteed secret masking**.
- 🛠️ **Safe Preview & Confirmation**: Never modifies your files without showing an interactive git diff preview and asking confirmation.

---

## Quick Start

### 1. Initialize your project

```bash
# npm
npx envboot init

# pnpm
pnpm dlx envboot init

# bun
bunx envboot init

# yarn
yarn dlx envboot init

# deno
deno run --allow-all npm:envboot init
```

Interactive prompts will guide you to classify detected variables as **Required** or **Optional**, preview the changes, and install the guard.

### 2. Runtime Protection

The CLI automatically adds the runtime guard to your entry point:

```typescript
import envboot from "envboot";

envboot.init();

// Your application code continues using standard APIs:
import express from "express";
const app = express();
const dbUrl = process.env.DATABASE_URL || Bun.env.DATABASE_URL;
```

*CommonJS is also supported:*
```javascript
const envboot = require("envboot");
envboot.init();
```

---

## Commands

### `envboot init`

Scans your project, builds `.envboot.json`, and installs the startup guard.

```bash
# Interactive setup
npx envboot init          # or bunx envboot init / pnpm dlx envboot init

# Non-interactive mode (accept defaults in CI or scripts)
npx envboot init --yes
```

### `envboot check`

Validates your current environment against `.envboot.json`, and scans for source drift and unused variables:

```bash
# Run check
npx envboot check         # or bunx envboot check / pnpm dlx envboot check
```

**Sample Output:**

```text
EnvBoot Check

Required
────────────────────────────────────────
  ✓ DATABASE_URL
  ✓ API_URL
  ✗ JWT_SECRET

Optional
────────────────────────────────────────
  ✓ REDIS_URL
  ○ SENTRY_DSN

Source analysis
────────────────────────────────────────
  ⚠ STRIPE_SECRET_KEY
    Used in source (src/billing.ts) but missing from .envboot.json
  ⚠ OLD_API_URL
    Found in .env.example but not used in source code

────────────────────────────────────────
Result: FAILED
Error: Missing 1 required environment variable(s).
```

---

## CI / CD Integration

Add `envboot check` to your CI pipeline. EnvBoot returns exit code `0` on success and `1` on missing required variables.

### GitHub Actions (Node / Bun / Deno)

```yaml
name: CI
on: [push, pull_request]

jobs:
  validate-environment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Verify Environment Contract
        run: npx envboot check
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          API_URL: ${{ secrets.API_URL }}
```

> [!NOTE]
> **Secret Protection Guarantee**: EnvBoot **never** prints environment variable values to the console or logs — only whether they are present (`✓`) or missing (`✗`).

---

## Configuration (`.envboot.json`)

```json
{
  "required": [
    "DATABASE_URL",
    "JWT_SECRET",
    "API_URL"
  ],
  "optional": [
    "REDIS_URL",
    "SENTRY_DSN"
  ]
}
```

---

## Runtime API Options

```typescript
import envboot from "envboot";

// Default startup validation
envboot.init();

// Advanced options:
envboot.init({
  configPath: "./custom-config.json", // Custom path to config
  exitOnError: false,                // Don't terminate process on failure
  quiet: false,                      // Suppress failure logs
  env: process.env,                  // Custom env dictionary (defaults to runtime env)
});

// Non-terminating validation helper:
const result = envboot.validate();
console.log(result.valid); // boolean
console.log(result.missingRequired); // string[]
```

---

## Supported Runtimes & Package Managers

| Tool / Runtime | Setup Command | Dev Command | Check Command |
| :--- | :--- | :--- | :--- |
| **Node.js + npm** | `npx envboot init` | `npm run dev` | `npx envboot check` |
| **pnpm** | `pnpm dlx envboot init` | `pnpm dev` | `pnpm dlx envboot check` |
| **Bun** | `bunx envboot init` | `bun dev` | `bunx envboot check` |
| **Yarn** | `yarn dlx envboot init` | `yarn dev` | `yarn dlx envboot check` |
| **Deno** | `deno run --allow-all npm:envboot init` | `deno task dev` | `deno run --allow-all npm:envboot check` |

---

## License

MIT © EnvBoot Contributors
