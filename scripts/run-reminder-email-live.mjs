import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run", "src/lib/reminders/email.live.test.ts", "--reporter=verbose"],
  {
    cwd: process.cwd(),
    env: { ...process.env, RUN_REMINDER_EMAIL_LIVE: "1" },
    stdio: "inherit"
  }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
