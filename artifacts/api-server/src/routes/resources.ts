import { Router, type IRouter } from "express";
import { db, resourcesTable, insertResourceSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/resources", async (req, res) => {
  try {
    const { type } = req.query;
    let results = await db.select().from(resourcesTable);
    if (type && typeof type === "string") results = results.filter((r) => r.type === type);
    res.json(results.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.post("/resources", async (req, res) => {
  try {
    const data = insertResourceSchema.parse(req.body);
    const [resource] = await db.insert(resourcesTable).values(data).returning();
    res.status(201).json({ ...resource, createdAt: resource.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid resource data" });
  }
});

router.patch("/resources/:id", async (req, res) => {
  try {
    const data = insertResourceSchema.partial().parse(req.body);
    const [resource] = await db.update(resourcesTable).set(data).where(eq(resourcesTable.id, Number(req.params.id))).returning();
    if (!resource) return res.status(404).json({ error: "Resource not found" });
    res.json({ ...resource, createdAt: resource.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid resource data" });
  }
});

router.delete("/resources/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(resourcesTable).where(eq(resourcesTable.id, Number(req.params.id))).returning();
    if (!deleted) return res.status(404).json({ error: "Resource not found" });
    res.json({ success: true, message: "Resource deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete resource" });
  }
});

export default router;
