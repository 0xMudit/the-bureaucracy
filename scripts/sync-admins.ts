import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { syncAdminRoles } from "./lib/admins";

const dryRun = process.argv.includes("--dry-run");

syncAdminRoles({ dryRun })
  .then((result) => {
    if (result.skipped) {
      console.error(`\n  ✗ Admin sync skipped: ${result.skipped}\n`);
      process.exit(1);
    }
    if (!result.promoted.length) {
      console.log("\n  ✓ Admin roles are already current.\n");
      return;
    }
    console.log(
      `\n  ${dryRun ? "Would promote" : "Promoted"} ${result.promoted.join(", ")} to admin.\n`,
    );
  })
  .catch((error) => {
    console.error(`\n  ✗ ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
