import { Router, type IRouter } from "express";
import { db, jobsTable, insertJobSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/jobs", async (req, res) => {
  try {
    const { type } = req.query;
    let results = await db.select().from(jobsTable);
    if (type && typeof type === "string") results = results.filter((j) => j.type === type);
    res.json(results.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

router.post("/jobs", async (req, res) => {
  try {
    const data = insertJobSchema.parse(req.body);
    const [job] = await db.insert(jobsTable).values(data).returning();
    res.status(201).json({ ...job, createdAt: job.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid job data" });
  }
});

router.patch("/jobs/:id", async (req, res) => {
  try {
    const data = insertJobSchema.partial().parse(req.body);
    const [job] = await db.update(jobsTable).set(data).where(eq(jobsTable.id, Number(req.params.id))).returning();
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ ...job, createdAt: job.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid job data" });
  }
});

router.delete("/jobs/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(jobsTable).where(eq(jobsTable.id, Number(req.params.id))).returning();
    if (!deleted) return res.status(404).json({ error: "Job not found" });
    res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete job" });
  }
});

export default router;
