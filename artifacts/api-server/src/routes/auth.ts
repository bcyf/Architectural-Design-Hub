import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_ENV = process.env.ADMIN_PASSWORD || "password";

const CUSTOM_PASSWORD_KEY = "admin_password_hash";

async function getPasswordHash(): Promise<string | null> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, CUSTOM_PASSWORD_KEY));
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function validatePassword(input: string): Promise<boolean> {
  const hash = await getPasswordHash();
  if (hash) {
    return bcrypt.compare(input, hash);
  }
  return input === ADMIN_PASSWORD_ENV;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const valid = await validatePassword(password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const token = jwt.sign({ username, role: "admin" }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, username });
});

router.get("/auth/me", requireAuth, (req, res) => {
  const token = req.headers.authorization!.slice(7);
  const payload = jwt.decode(token) as { username: string };
  res.json({ username: payload.username, role: "admin" });
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const valid = await validatePassword(currentPassword);
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await db
    .insert(settingsTable)
    .values({ key: CUSTOM_PASSWORD_KEY, value: hash })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: hash, updatedAt: new Date() } });

  res.json({ success: true, message: "Password updated successfully" });
});

export default router;
