import { cac } from "cac";
import { runInit } from "./commands/init.js";
import { runCheck } from "./commands/check.js";

const cli = cac("envboot");

cli
  .command("init", "Automatically detect, configure, and install EnvBoot")
  .option("-y, --yes", "Skip interactive prompts and accept default detected options")
  .action(async (options) => {
    try {
      await runInit({ yes: options.yes });
    } catch (err) {
      console.error("\nFailed to initialize EnvBoot:", (err as Error).message);
      process.exit(1);
    }
  });

cli
  .command("check", "Validate current environment against .envboot.json and detect drift")
  .option("-c, --config <path>", "Custom path to .envboot.json")
  .option("--strict", "Fail if variables used in source code are missing from contract")
  .action(async (options) => {
    try {
      await runCheck({
        config: options.config,
        strict: options.strict,
      });
    } catch (err) {
      console.error("\nCheck command encountered an error:", (err as Error).message);
      process.exit(1);
    }
  });

cli.help();
cli.version("0.1.0");

cli.parse();
