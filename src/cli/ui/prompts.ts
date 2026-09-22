import * as p from "@clack/prompts";
import pc from "picocolors";

export async function promptVariableClassification(
  detectedVars: string[]
): Promise<{ required: string[]; optional: string[] }> {
  if (detectedVars.length === 0) {
    return { required: [], optional: [] };
  }

  p.note(
    "Select variables that MUST be present for your app to start.\nUnchecked variables will be marked as optional.",
    "Configure Environment Contract"
  );

  const selectedRequired = await p.multiselect({
    message: "Select REQUIRED environment variables:",
    options: detectedVars.map((v) => ({
      value: v,
      label: v,
      hint: "Required for startup",
    })),
    required: false,
    initialValues: detectedVars, // Default all discovered to selected
  });

  if (p.isCancel(selectedRequired)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const reqSet = new Set(selectedRequired as string[]);
  const required = detectedVars.filter((v) => reqSet.has(v));
  const optional = detectedVars.filter((v) => !reqSet.has(v));

  return { required, optional };
}

export async function promptEntryPoint(
  candidates: string[],
  detected: string | null
): Promise<string> {
  if (candidates.length === 0) {
    const manual = await p.text({
      message: "Could not detect application entry point. Please enter file path (e.g. src/index.ts):",
      placeholder: "src/index.ts",
      validate: (val) => {
        if (!val || val.trim().length === 0) return "Please enter a valid file path";
      },
    });

    if (p.isCancel(manual)) {
      p.cancel("Operation cancelled.");
      process.exit(0);
    }
    return manual.trim();
  }

  if (candidates.length === 1 && detected) {
    const confirmDetected = await p.confirm({
      message: `Detected entry point: ${pc.cyan(detected)}. Install EnvBoot here?`,
      initialValue: true,
    });

    if (p.isCancel(confirmDetected)) {
      p.cancel("Operation cancelled.");
      process.exit(0);
    }

    if (confirmDetected) {
      return detected;
    }
  }

  const selected = await p.select({
    message: "Select your application entry point:",
    options: [
      ...candidates.map((c) => ({
        value: c,
        label: c,
        hint: c === detected ? "Recommended" : undefined,
      })),
      {
        value: "__custom__",
        label: "Other (specify path manually)",
      },
    ],
    initialValue: detected || candidates[0],
  });

  if (p.isCancel(selected)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  if (selected === "__custom__") {
    const custom = await p.text({
      message: "Enter entry point file path:",
      placeholder: "src/server.ts",
      validate: (val) => {
        if (!val || val.trim().length === 0) return "Please enter a valid file path";
      },
    });
    if (p.isCancel(custom)) {
      p.cancel("Operation cancelled.");
      process.exit(0);
    }
    return custom.trim();
  }

  return selected as string;
}

export async function promptConfirmChanges(diff: string, configFile: string): Promise<boolean> {
  console.log("\n" + pc.bold("EnvBoot will:"));
  console.log(`  ${pc.green("✓")} Create ${pc.cyan(configFile)}`);
  console.log(`  ${pc.green("✓")} Add startup environment validation`);
  console.log("");
  console.log(pc.bold("Preview of changes:"));
  console.log(diff || pc.dim("  (No code modifications needed)"));
  console.log("");

  const confirmed = await p.confirm({
    message: "Apply these changes to your project?",
    initialValue: true,
  });

  if (p.isCancel(confirmed)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return confirmed;
}
