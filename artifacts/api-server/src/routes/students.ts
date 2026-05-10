import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";

export function requireStudentAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.role !== "student") {
      return res.status(403).json({ error: "Forbidden" });
    }
    (req as any).student = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// POST /students/signup
router.post("/students/signup", async (req, res) => {
  const { firstName, lastName, email, studentId, password, collegeLevel } = req.body;

  if (!firstName || !lastName || !email || !studentId || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.email, email.toLowerCase()));
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    const [existingId] = await db.select().from(studentsTable).where(eq(studentsTable.studentId, studentId));
    if (existingId) return res.status(409).json({ error: "This student ID is already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const [student] = await db
      .insert(studentsTable)
      .values({ firstName, lastName, email: email.toLowerCase(), studentId, passwordHash, isApproved: true, collegeLevel: collegeLevel || "1st Year" })
      .returning();

    const token = jwt.sign(
      { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, studentId: student.studentId, role: "student" },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({ token, student: { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, studentId: student.studentId, collegeLevel: student.collegeLevel, profilePicture: student.profilePicture } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /students/login
router.post("/students/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.email, email.toLowerCase()));
    if (!student) return res.status(401).json({ error: "Invalid email or password" });
    if (!student.isApproved) return res.status(403).json({ error: "Your account is pending approval" });

    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, studentId: student.studentId, role: "student" },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ token, student: { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, studentId: student.studentId, collegeLevel: student.collegeLevel, profilePicture: student.profilePicture } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// GET /students/me – returns JWT payload (lightweight)
router.get("/students/me", requireStudentAuth, (req, res) => {
  res.json((req as any).student);
});

// GET /students/me/profile – full profile from DB
router.get("/students/me/profile", requireStudentAuth, async (req, res) => {
  const me = (req as any).student;
  try {
    const [student] = await db
      .select({ id: studentsTable.id, firstName: studentsTable.firstName, lastName: studentsTable.lastName, email: studentsTable.email, studentId: studentsTable.studentId, collegeLevel: studentsTable.collegeLevel, bio: studentsTable.bio, profilePicture: studentsTable.profilePicture, createdAt: studentsTable.createdAt })
      .from(studentsTable)
      .where(eq(studentsTable.id, me.id));
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PATCH /students/me/profile – update profile fields
router.patch("/students/me/profile", requireStudentAuth, async (req, res) => {
  const me = (req as any).student;
  const { firstName, lastName, bio, collegeLevel, profilePicture } = req.body;

  const updates: Record<string, any> = {};
  if (firstName?.trim()) updates.firstName = firstName.trim();
  if (lastName?.trim()) updates.lastName = lastName.trim();
  if (bio !== undefined) updates.bio = bio?.trim() || null;
  if (collegeLevel) updates.collegeLevel = collegeLevel;
  if (profilePicture !== undefined) updates.profilePicture = profilePicture || null;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const [updated] = await db
      .update(studentsTable)
      .set(updates)
      .where(eq(studentsTable.id, me.id))
      .returning({ id: studentsTable.id, firstName: studentsTable.firstName, lastName: studentsTable.lastName, email: studentsTable.email, studentId: studentsTable.studentId, collegeLevel: studentsTable.collegeLevel, bio: studentsTable.bio, profilePicture: studentsTable.profilePicture });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET /students/search?q=...
router.get("/students/search", requireStudentAuth, async (req, res) => {
  const me = (req as any).student;
  const q = String(req.query.q || "").trim().toLowerCase();
  if (!q || q.length < 2) return res.json([]);
  try {
    const all = await db
      .select({ id: studentsTable.id, firstName: studentsTable.firstName, lastName: studentsTable.lastName, email: studentsTable.email, studentId: studentsTable.studentId, collegeLevel: studentsTable.collegeLevel, profilePicture: studentsTable.profilePicture })
      .from(studentsTable);
    const results = all.filter(s =>
      s.id !== me.id &&
      (s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q))
    ).slice(0, 10);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /students (admin - list all)
router.get("/students", async (req, res) => {
  try {
    const students = await db
      .select({ id: studentsTable.id, firstName: studentsTable.firstName, lastName: studentsTable.lastName, email: studentsTable.email, studentId: studentsTable.studentId, collegeLevel: studentsTable.collegeLevel, isApproved: studentsTable.isApproved, createdAt: studentsTable.createdAt })
      .from(studentsTable)
      .orderBy(studentsTable.createdAt);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

export default router;
