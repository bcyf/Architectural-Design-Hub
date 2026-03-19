import { Router, type IRouter } from "express";
import { db, newsTable, insertNewsSchema } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/news", async (req, res) => {
  try {
    const { limit, category } = req.query;
    let results = await db.select().from(newsTable).orderBy(desc(newsTable.publishedAt));
    if (category && typeof category === "string") results = results.filter((n) => n.category === category);
    if (limit) results = results.slice(0, Number(limit));
    res.json(results.map((n) => ({ ...n, publishedAt: n.publishedAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

router.get("/news/:id", async (req, res) => {
  try {
    const [post] = await db.select().from(newsTable).where(eq(newsTable.id, Number(req.params.id)));
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ ...post, publishedAt: post.publishedAt.toISOString() });
  } catch (err) {
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

router.patch("/news/:id", async (req, res) => {
  try {
    const data = insertNewsSchema.partial().parse(req.body);
    const [post] = await db.update(newsTable).set(data).where(eq(newsTable.id, Number(req.params.id))).returning();
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ ...post, publishedAt: post.publishedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid post data" });
  }
});

router.delete("/news/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(newsTable).where(eq(newsTable.id, Number(req.params.id))).returning();
    if (!deleted) return res.status(404).json({ error: "Post not found" });
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;
