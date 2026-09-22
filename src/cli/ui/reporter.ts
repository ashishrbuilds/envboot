import pc from "picocolors";

export interface CheckReportData {
  presentRequired: string[];
  missingRequired: string[];
  presentOptional: string[];
  missingOptional: string[];
  undocumentedInCode: Array<{ name: string; files: string[] }>;
  unusedInEnvFiles: Array<{ name: string; files: string[] }>;
}

export function printCheckReport(data: CheckReportData): boolean {
  console.log("\n" + pc.bold(pc.cyan("EnvBoot Check")));
  console.log("");

  // Required section
  console.log(pc.bold("Required"));
  console.log(pc.dim("────────────────────────────────────────"));
  if (data.presentRequired.length === 0 && data.missingRequired.length === 0) {
    console.log(pc.dim("  (No required variables defined in contract)"));
  } else {
    for (const key of data.presentRequired) {
      console.log(`  ${pc.green("✓")} ${pc.bold(key)}`);
    }
    for (const key of data.missingRequired) {
      console.log(`  ${pc.red("✗")} ${pc.bold(key)}`);
    }
  }
  console.log("");

  // Optional section
  console.log(pc.bold("Optional"));
  console.log(pc.dim("────────────────────────────────────────"));
  if (data.presentOptional.length === 0 && data.missingOptional.length === 0) {
    console.log(pc.dim("  (No optional variables defined in contract)"));
  } else {
    for (const key of data.presentOptional) {
      console.log(`  ${pc.green("✓")} ${key}`);
    }
    for (const key of data.missingOptional) {
      console.log(`  ${pc.dim("○")} ${pc.dim(key)}`);
    }
  }
  console.log("");

  // Source & Drift analysis
  const hasDrift = data.undocumentedInCode.length > 0 || data.unusedInEnvFiles.length > 0;
  if (hasDrift) {
    console.log(pc.bold("Source analysis"));
    console.log(pc.dim("────────────────────────────────────────"));

    for (const item of data.undocumentedInCode) {
      console.log(`  ${pc.yellow("⚠")} ${pc.bold(item.name)}`);
      console.log(`    ${pc.dim(`Used in source (${item.files.slice(0, 2).join(", ")}${item.files.length > 2 ? "..." : ""}) but missing from .envboot.json`)}`);
    }

    for (const item of data.unusedInEnvFiles) {
      console.log(`  ${pc.yellow("⚠")} ${pc.bold(item.name)}`);
      console.log(`    ${pc.dim(`Found in ${item.files.join(", ")} but not used in source code`)}`);
    }
    console.log("");
  }

  // Final result
  const passed = data.missingRequired.length === 0;

  console.log(pc.dim("────────────────────────────────────────"));
  if (passed) {
    console.log(`Result: ${pc.bold(pc.green("PASSED"))}`);
    if (data.missingOptional.length > 0) {
      console.log(pc.dim(`Note: ${data.missingOptional.length} optional variable(s) not set.`));
    }
  } else {
    console.log(`Result: ${pc.bold(pc.red("FAILED"))}`);
    console.log(
      pc.red(`Error: Missing ${data.missingRequired.length} required environment variable(s).`)
    );
  }
  console.log("");

  return passed;
}
