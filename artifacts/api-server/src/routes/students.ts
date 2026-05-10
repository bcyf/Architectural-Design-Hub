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
  const { firstName, lastName, email, studentId, password } = req.body;

  if (!firstName || !lastName || !email || !studentId || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const [existing] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.email, email.toLowerCase()));
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const [existingId] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.studentId, studentId));
    if (existingId) {
      return res.status(409).json({ error: "This student ID is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [student] = await db
      .insert(studentsTable)
      .values({ firstName, lastName, email: email.toLowerCase(), studentId, passwordHash, isApproved: true })
      .returning();

    const token = jwt.sign(
      { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, studentId: student.studentId, role: "student" },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({ token, student: { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, studentId: student.studentId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /students/login
router.post("/students/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.email, email.toLowerCase()));

    if (!student) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!student.isApproved) {
      return res.status(403).json({ error: "Your account is pending approval" });
    }

    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, studentId: student.studentId, role: "student" },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ token, student: { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email, studentId: student.studentId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// GET /students/me
router.get("/students/me", requireStudentAuth, (req, res) => {
  res.json((req as any).student);
});

// GET /students/search?q=... – search students by name, email or student ID
router.get("/students/search", requireStudentAuth, async (req, res) => {
  const me = (req as any).student;
  const q = String(req.query.q || "").trim().toLowerCase();
  if (!q || q.length < 2) return res.json([]);
  try {
    const all = await db
      .select({ id: studentsTable.id, firstName: studentsTable.firstName, lastName: studentsTable.lastName, email: studentsTable.email, studentId: studentsTable.studentId })
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

// GET /students (admin only - list all students)
router.get("/students", async (req, res) => {
  try {
    const students = await db
      .select({ id: studentsTable.id, firstName: studentsTable.firstName, lastName: studentsTable.lastName, email: studentsTable.email, studentId: studentsTable.studentId, isApproved: studentsTable.isApproved, createdAt: studentsTable.createdAt })
      .from(studentsTable)
      .orderBy(studentsTable.createdAt);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

export default router;
