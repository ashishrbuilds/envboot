<div align="center">

  <a href="https://github.com/ashishrbuilds/envboot" target="_blank" rel="noopener noreferrer">
    <img src="https://raw.githubusercontent.com/ashishrbuilds/envboot-core/main/src/assets/envboot.png" alt="EnvBoot Logo" width="120" height="120" />
  </a>

  <h1>EnvBoot</h1>

  <p><strong>Your app shouldn't start with a broken environment.</strong></p>

  <p>Automatically discover, configure, and validate environment variables with zero runtime overhead.</p>

  <p>
    <a href="https://www.npmjs.com/package/envboot"><img src="https://img.shields.io/npm/v/envboot?color=38bdf8&label=npm%20package" alt="npm version" /></a>
    <a href="https://github.com/ashishrbuilds/envboot"><img src="https://img.shields.io/github/stars/ashishrbuilds/envboot?style=social" alt="GitHub Stars" /></a>
    <a href="https://www.npmjs.com/package/envboot"><img src="https://img.shields.io/badge/runtime%20dependencies-0-10b981.svg" alt="Runtime Dependencies" /></a>
    <a href="https://www.npmjs.com/package/envboot"><img src="https://img.shields.io/badge/runtimes-Node%20%7C%20Bun%20%7C%20Deno-a855f7" alt="Node / Bun / Deno" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
    <a href="https://ashishrbuilds.github.io/envboot-core/"><img src="https://img.shields.io/badge/docs-live-4f46e5?style=flat&logo=github" alt="Documentation" /></a>
  </p>

  <br />

  ```bash
  npx envboot@latest init
  ```

  <br />

  <p>
    <a href="#-quick-start"><b>Quickstart</b></a> &bull;
    <a href="#-why-envboot"><b>Why EnvBoot?</b></a> &bull;
    <a href="#-the-30-second-demo"><b>Interactive Demo</b></a> &bull;
    <a href="#-diagnostic-health-check-envboot-doctor"><b>Doctor Diagnostics</b></a> &bull;
    <a href="#-synchronizing-contract--templates-envboot-sync"><b>Sync Contract</b></a> &bull;
    <a href="#-cicd-drift-protection-envboot-check"><b>CI/CD Guard</b></a> &bull;
    <a href="#-automatic-env-file-loading-zero-dependency"><b>Automatic .env Loader</b></a> &bull;
    <a href="#-cli-commands-reference"><b>CLI Reference</b></a> &bull;
    <a href="#-configuration-envbootjson"><b>Configuration</b></a> &bull;
    <a href="#-runtime-api"><b>Runtime API</b></a> &bull;
    <a href="#-supported-runtimes--package-managers"><b>Ecosystem</b></a>
  </p>

</div>

<br />

---

## 💥 The Problem

You or a teammate clones a repository:

```bash
git clone https://github.com/org/repo.git
cd repo && npm install
npm run dev
```

The application boots up silently. **5 minutes later in production or testing:**
* ❌ Database connection fails (`DATABASE_URL` is `undefined`)
* ❌ Auth handler throws `TypeError` (`JWT_SECRET` is missing)
* ❌ Third-party webhook silently drops events (`STRIPE_WEBHOOK_SECRET` was never configured)

---

## 🛡️ The Solution: The 30-Second Demo

Run **EnvBoot** once:

```bash
npx envboot@latest init   # or bunx envboot@latest init / pnpm dlx envboot@latest init
```

EnvBoot scans your codebase, extracts all `process.env`, `Bun.env`, `Deno.env`, and `import.meta.env` usage, creates a typed `.envboot.json` contract, and installs a lightweight startup guard.

```text
┌  EnvBoot Setup
│
◇  Scanned 34 source files — Discovered 4 environment variables.
│
◆  Select REQUIRED variables (unselected become optional):
│  ● DATABASE_URL       (Required for boot)
│  ● JWT_SECRET         (Required for boot)
│  ○ REDIS_URL          (Optional)
│  ○ SENTRY_DSN         (Optional)
│
◇  Entry point detected: src/server.ts
│
◇  Applied environment contract and startup guard.
│
◇  Installed envboot dependency.
│
✔  EnvBoot initialized successfully!

  Next steps:
  1. Ensure your environment has the required variables set.
  2. Start your app: npm run dev
  3. Check environment status at any time: npx envboot check
  4. Best Practice (Fail-fast in package.json):
     Add envboot check to your scripts to block dev/build on missing variables:
       "dev":   "envboot check && npm run dev"
       "build": "envboot check && npm run build"
```

Now, whenever anyone boots the application without the required environment:

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

**The application halts instantly before damaged connections or corrupted transactions occur.**

---

## ✨ Why EnvBoot?

| Feature | `envboot` | Manual Checks | `zod` / Schema libs | `dotenv-safe` |
| :--- | :---: | :---: | :---: | :---: |
| **Runtime Dependencies** | **`0` (Zero)** | `0` | Heavy (~50kb+) | 3+ deps |
| **Code Refactoring** | **None** (Keep `process.env.X`) | High boilerplate | Requires `env.X` wrappers | None |
| **Automated AST Codebase Scanner** | **Yes** | ❌ No | ❌ No | ❌ No |
| **Interactive Setup CLI & Auto-Install** | **Yes** | ❌ No | ❌ No | ❌ No |
| **Built-in Cascading `.env*` Loader** | **Yes (Zero-dep)** | ❌ No | ❌ No | Requires `dotenv` |
| **Browser / Client-Safe Build** | **Yes (`envboot/browser`)** | Manual | Heavy bundle | ❌ Node only |
| **CI/CD Drift & Stale Var Detection** | **Yes** | ❌ No | ❌ No | Partial |
| **Multi-Runtime (Node, Bun, Deno, Vite)** | **Yes** | Manual | Varies | Node only |
| **Secret Masking Guarantee** | **Yes** | Manual | Manual | Partial |

---

## 🚀 Quick Start

### 1. Initialize your project

Run the interactive setup wizard in your favorite package manager:

```bash
# npm
npx envboot@latest init

# bun
bunx envboot@latest init

# pnpm
pnpm dlx envboot@latest init

# yarn
yarn dlx envboot@latest init

# Deno
deno run --allow-all npm:envboot@latest init
```

> [!TIP]
> **CLI Flags:**
> * Pass `--yes` (or `-y`) to accept all detected variables non-interactively: `npx envboot@latest init --yes`
> * Pass `--skip-install` to skip automatic dependency installation: `npx envboot@latest init --skip-install`

### 2. Startup Guard Injection

EnvBoot automatically places the guard at the very top of your application entry point:

```typescript
import envboot from "envboot";

envboot.init();

// Continue writing standard native code without any wrappers:
import express from "express";

const app = express();
const dbUrl = process.env.DATABASE_URL || Bun.env.DATABASE_URL;
```

*CommonJS is fully supported:*
```javascript
const envboot = require("envboot");
envboot.init();
```

---

## 🛑 Crashing Dev Servers & Client Apps on Startup

### 1. Block Dev Server Startup (`pnpm dev` / `npm run dev`)
To prevent Vite, Next.js, or Express dev servers from opening when `.env` is incomplete, prepend `envboot check` to your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "envboot check && vite",
    "build": "envboot check && tsc -b && vite build"
  }
}
```

Whenever you run `pnpm dev`, if any required variable in `.env` is missing or empty, `envboot check` halts with exit code `1` before Vite / Next.js ever boots.

### 2. Browser & Frontend Runtime Guard (Vite / React / Next.js)
In client-side entrypoints (`src/main.tsx` or `src/index.tsx`), you can throw a fatal startup error before React mounts:

```tsx
import envboot from "envboot";
import config from "../.envboot.json";

// Throws fatal error & displays error overlay if required variables are missing
envboot.init({
  config,
  env: import.meta.env,
  exitOnError: true
});

import React from 'react';
import ReactDOM from 'react-dom/client';
...
```

---

## 🩺 Diagnostic Health Check (`envboot doctor`)

Run `envboot doctor` to perform an end-to-end diagnostic of your framework, package manager, `.env` files, contract schema, and startup injection:

```bash
npx envboot@latest doctor   # or bunx envboot@latest doctor / pnpm dlx envboot@latest doctor
```

```text
 🩺 EnvBoot Doctor — Diagnostic Health Check 

Project Environment
────────────────────────────────────────────────────────────
  Framework:        VITE
  Package Manager:  pnpm
  Module Type:      ESM
  Entry Point:      src/main.tsx (✓ Injected)
  Contract:         .envboot.json (✓ Found)
  Env Files:        .env, .env.local

Diagnostics & Health
────────────────────────────────────────────────────────────
  ✓ Package dependency: envboot (0.1.7)
  ✓ Contract schema: 2 required, 1 optional variable(s)
  ✓ All required variables are set in environment
  ✓ Source code and contract are fully in sync (0 drift)

✨ Everything looks healthy! No issues detected.
```

> **Options:** Pass `-c <path>` or `--config <path>` to specify a custom contract path: `npx envboot@latest doctor -c custom/.envboot.json`

---

## 🔄 Synchronizing Contract & Templates (`envboot sync`)

When you introduce new environment variables to your codebase, run `envboot sync` to automatically detect them, update `.envboot.json`, and regenerate `.env.example`:

```bash
# Interactive classification
npx envboot@latest sync

# Automated sync in CI or pre-commit hooks
npx envboot@latest sync --yes

# Automatically prune variables removed from codebase
npx envboot@latest sync --yes --prune

# Custom contract path
npx envboot@latest sync -c custom/.envboot.json
```

---

## 🔍 CI/CD Drift Protection (`envboot check`)

Run `envboot check` in local verification or CI/CD pipelines to ensure that:
1. All required variables are present in the current execution environment.
2. The codebase has not introduced undocumented environment variables (**Drift Detection**).
3. Stale variables defined in `.env` files that are no longer used in code are flagged.

```bash
# Standard check
npx envboot@latest check

# Strict mode: fail build if undocumented variables are used in source code
npx envboot@latest check --strict

# Custom contract path
npx envboot@latest check -c custom/.envboot.json
```

### Sample Output

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
  ⚠ OLD_ANALYTICS_KEY
    Found in .env.example but not referenced in source code

────────────────────────────────────────
Result: FAILED
Error: Missing 1 required environment variable(s).
```

> [!TIP]
> **Ignoring System Variables**: Standard system/runtime variables like `NODE_ENV` and `TZ` are ignored by default. You can add any custom variables to the `"ignore": [...]` array in `.envboot.json` to prevent them from triggering drift warnings.

### GitHub Actions Workflow Recipe

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
> **Secret Shield**: EnvBoot **never** prints secret values to console output or CI logs — only verification status (`✓` or `✗`).

---

## ⚡ Automatic `.env` File Loading (Zero-Dependency)

EnvBoot automatically discovers, parses, and loads local `.env` files into your application with zero external runtime dependencies (no `dotenv` needed):

* **Cascading Precedence (Highest to Lowest):**
  1. System Environment (`process.env` / Docker / Kubernetes / CI secrets)
  2. `.env.[development|test|production].local`
  3. `.env.[development|test|production]` (based on `NODE_ENV`)
  4. `.env.local`
  5. `.env`

* **Full Syntax Support:** Handles quoted values (`"..."`, `'...'`, `` `...` ``), escape sequences (`\n`, `\t`), comments (`#`), and `export VAR=value` syntax.
* **Production Safe:** System environment variables take top priority and are never overwritten by `.env` files.

---

## ⚙️ Configuration (`.envboot.json`)

The generated `.envboot.json` contract is lightweight, human-readable, and version-controlled:

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
  ],
  "ignore": [
    "NODE_ENV",
    "TZ"
  ]
}
```

### Schema Properties

* `required`: Mandatory variables. Application terminates immediately on startup with exit code `1` if any are missing or empty.
* `optional`: Optional variables. EnvBoot warns about missing values in terminal output, but does not abort startup.
* `ignore`: System or framework variables excluded from drift detection and missing warnings (defaults to `["NODE_ENV", "TZ"]`).

---

## 🛠️ CLI Commands Reference

| Command | Flags | Description |
| :--- | :--- | :--- |
| `envboot init` | `-y, --yes`<br>`--skip-install` | Scans codebase, generates `.envboot.json`, injects startup guard, and installs `envboot` |
| `envboot check` | `--strict`<br>`-c, --config <path>` | Validates environment against contract, checks for missing variables and source drift |
| `envboot doctor` | `-c, --config <path>` | Runs full diagnostics on project setup, framework, package manager, and contract health |
| `envboot sync` | `-y, --yes`<br>`--prune`<br>`-c, --config <path>` | Scans for new variables, updates `.envboot.json`, and refreshes `.env.example` |

---

## 📦 Runtime API

```typescript
import envboot from "envboot";

// Standard startup check (halts process with exit code 1 if invalid)
envboot.init();

// Advanced configuration
envboot.init({
  configPath: "./config/.envboot.json", // Custom path to config
  exitOnError: false,                   // Return status instead of process.exit(1)
  quiet: false,                         // Suppress terminal output
  env: process.env,                     // Custom environment object
});

// Non-terminating programmatic check
const status = envboot.validate();
console.log(status.valid);           // boolean
console.log(status.missingRequired); // string[]
console.log(status.presentRequired); // string[]
```

---

## 🌐 Supported Runtimes & Package Managers

<table align="center">
  <thead>
    <tr>
      <th align="left">Ecosystem</th>
      <th align="left">Setup Command</th>
      <th align="left">Dev Run</th>
      <th align="left">CI Check</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Node.js (npm)</b></td>
      <td><code>npx envboot@latest init</code></td>
      <td><code>npm run dev</code></td>
      <td><code>npx envboot check</code></td>
    </tr>
    <tr>
      <td><b>Bun</b></td>
      <td><code>bunx envboot@latest init</code></td>
      <td><code>bun dev</code></td>
      <td><code>bunx envboot check</code></td>
    </tr>
    <tr>
      <td><b>pnpm</b></td>
      <td><code>pnpm dlx envboot@latest init</code></td>
      <td><code>pnpm dev</code></td>
      <td><code>pnpm dlx envboot check</code></td>
    </tr>
    <tr>
      <td><b>Yarn</b></td>
      <td><code>yarn dlx envboot@latest init</code></td>
      <td><code>yarn dev</code></td>
      <td><code>yarn dlx envboot check</code></td>
    </tr>
    <tr>
      <td><b>Deno</b></td>
      <td><code>deno run -A npm:envboot@latest init</code></td>
      <td><code>deno task dev</code></td>
      <td><code>deno run -A npm:envboot check</code></td>
    </tr>
  </tbody>
</table>

### Framework Detection

* ✅ **Next.js** (App Router & Pages Router)
* ✅ **Vite + React / Vue / Svelte**
* ✅ **Express / Fastify / Koa**
* ✅ **NestJS**
* ✅ **Bun HTTP Server**
* ✅ **Deno Server**

---

## 📄 License

MIT © [Ashish Ranjan](https://github.com/ashishrbuilds) & [EnvBoot Contributors](https://github.com/ashishrbuilds/envboot/graphs/contributors)

---

<div align="center">
  <a href="https://ashishrbuilds.github.io/envboot-core/">📖 Documentation</a> &bull;
  <a href="https://www.npmjs.com/package/envboot">📦 npm</a> &bull;
  <a href="https://github.com/ashishrbuilds/envboot/issues">🐛 Issues</a>

  <br /><br />

  Made with ❤️ by <a href="https://github.com/ashishrbuilds">@ashishrbuilds</a>
</div>
