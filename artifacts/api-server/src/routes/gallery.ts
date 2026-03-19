import { Router, type IRouter } from "express";
import { db, galleryTable, insertGallerySchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/gallery", async (req, res) => {
  try {
    const { category } = req.query;
    let results = await db.select().from(galleryTable);
    if (category && typeof category === "string") results = results.filter((g) => g.category === category);
    res.json(results.map((g) => ({ ...g, createdAt: g.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

router.post("/gallery", async (req, res) => {
  try {
    const data = insertGallerySchema.parse(req.body);
    const [image] = await db.insert(galleryTable).values(data).returning();
    res.status(201).json({ ...image, createdAt: image.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid gallery data" });
  }
});

router.patch("/gallery/:id", async (req, res) => {
  try {
    const data = insertGallerySchema.partial().parse(req.body);
    const [image] = await db.update(galleryTable).set(data).where(eq(galleryTable.id, Number(req.params.id))).returning();
    if (!image) return res.status(404).json({ error: "Image not found" });
    res.json({ ...image, createdAt: image.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid gallery data" });
  }
});

router.delete("/gallery/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(galleryTable).where(eq(galleryTable.id, Number(req.params.id))).returning();
    if (!deleted) return res.status(404).json({ error: "Image not found" });
    res.json({ success: true, message: "Image deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
