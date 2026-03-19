import { Router, type IRouter } from "express";
import { db, resourcesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/resources", async (req, res) => {
  try {
    const { type } = req.query;
    let results = await db.select().from(resourcesTable);
    if (type && typeof type === "string") {
      results = results.filter((r) => r.type === type);
    }
    res.json(results.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

export default router;
