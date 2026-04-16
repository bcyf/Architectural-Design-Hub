import { Router } from "express";
import { db, quotesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

// Public: get all quotes (home page picks the active one)
router.get("/quotes", async (_req, res) => {
  const quotes = await db.select().from(quotesTable).orderBy(desc(quotesTable.createdAt));
  res.json(quotes.map(q => ({ ...q, createdAt: q.createdAt.toISOString() })));
});

// POST /quotes — admin, create
router.post("/quotes", requireAuth, async (req, res) => {
  const { text, author, isActive } = req.body;
  if (!text || !author) return res.status(400).json({ error: "text and author are required." });

  // If this one is active, deactivate all others first
  if (isActive) {
    await db.update(quotesTable).set({ isActive: false });
  }

  const [created] = await db
    .insert(quotesTable)
    .values({ text, author, isActive: isActive ?? false })
    .returning();
  res.status(201).json({ ...created, createdAt: created.createdAt.toISOString() });
});

// PUT /quotes/:id — admin, update
router.put("/quotes/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { text, author, isActive } = req.body;

  if (isActive) {
    await db.update(quotesTable).set({ isActive: false });
  }

  const [updated] = await db
    .update(quotesTable)
    .set({ text, author, isActive: isActive ?? false })
    .where(eq(quotesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Quote not found." });
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// DELETE /quotes/:id — admin
router.delete("/quotes/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(quotesTable).where(eq(quotesTable.id, id));
  res.json({ success: true, message: "Quote deleted." });
});

// PUT /quotes/:id/activate — admin, set as the active quote
router.put("/quotes/:id/activate", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db.update(quotesTable).set({ isActive: false });
  const [updated] = await db
    .update(quotesTable)
    .set({ isActive: true })
    .where(eq(quotesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Quote not found." });
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

export default router;
