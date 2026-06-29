import { createInterface } from "node:readline";
import { randomBytes, scryptSync } from "node:crypto";

const prompt = (question) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const main = async () => {
  const password = await prompt("Enter admin password: ");

  if (!password || password.length < 8) {
    console.error("Password must be at least 8 characters long.");
    process.exit(1);
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  const sessionSecret = randomBytes(32).toString("hex");

  console.log("\nAdd these values to your .env.local (or .env.production):\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`ADMIN_PASSWORD_SALT=${salt}`);
  console.log(`ADMIN_SESSION_SECRET=${sessionSecret}`);
  console.log("");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
