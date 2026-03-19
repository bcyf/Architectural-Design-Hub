import { Router, type IRouter } from "express";
import { db, newsTable, insertNewsSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/news", async (req, res) => {
  try {
    const { limit, category } = req.query;
    const results = await db.select().from(newsTable).orderBy(newsTable.publishedAt);
    let filtered = results.reverse();
    if (category && typeof category === "string") {
      filtered = filtered.filter((n) => n.category === category);
    }
    if (limit) {
      filtered = filtered.slice(0, Number(limit));
    }
    res.json(filtered.map((n) => ({
      ...n,
      publishedAt: n.publishedAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

router.get("/news/:id", async (req, res) => {
  try {
    const [post] = await db.select().from(newsTable).where(eq(newsTable.id, Number(req.params.id)));
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ ...post, publishedAt: post.publishedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

router.post("/news", async (req, res) => {
  try {
    const data = insertNewsSchema.parse(req.body);
    const [post] = await db.insert(newsTable).values(data).returning();
    res.status(201).json({ ...post, publishedAt: post.publishedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid post data" });
  }
});

export default router;
