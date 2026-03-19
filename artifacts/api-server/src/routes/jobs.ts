import { Router, type IRouter } from "express";
import { db, jobsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/jobs", async (req, res) => {
  try {
    const { type } = req.query;
    let results = await db.select().from(jobsTable);
    if (type && typeof type === "string") {
      results = results.filter((j) => j.type === type);
    }
    res.json(results.map((j) => ({
      ...j,
      createdAt: j.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

export default router;
