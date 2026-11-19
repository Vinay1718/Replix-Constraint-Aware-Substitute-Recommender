import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { connectDB, disconnectDB } from "../config/db.js";
import { ROLES } from "../constants/index.js";
import { createAccount } from "../services/auth.service.js";
import { registerSchema } from "../validators/auth.validator.js";

const rl = readline.createInterface({ input: stdin, output: stdout });
try {
  const name = await rl.question("Admin name: ");
  const email = await rl.question("Admin email: ");
  const password = await rl.question("Password (visible as you type, min 8 chars): ");
  rl.close();

  const parsed = registerSchema.safeParse({ name, email, password });
  if (!parsed.success) {
    console.error(parsed.error.issues.map((i) => `- ${i.message}`).join("\n"));
    process.exit(1);
  }
  await connectDB();
  const admin = await createAccount({ ...parsed.data, role: ROLES.ADMIN });
  console.log(`Admin created: ${admin.email} (${admin._id})`);
} catch (err) {
  console.error("Failed to create admin:", err.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await disconnectDB();
}
