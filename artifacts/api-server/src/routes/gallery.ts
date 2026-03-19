import { Router, type IRouter } from "express";
import { db, galleryTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/gallery", async (req, res) => {
  try {
    const { category } = req.query;
    let results = await db.select().from(galleryTable);
    if (category && typeof category === "string") {
      results = results.filter((g) => g.category === category);
    }
    res.json(results.map((g) => ({
      ...g,
      createdAt: g.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

export default router;
