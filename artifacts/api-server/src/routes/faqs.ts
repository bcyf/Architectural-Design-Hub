import { Router } from "express";
import { db, faqsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

const serialize = (faq: typeof faqsTable.$inferSelect) => ({
  ...faq,
  createdAt: faq.createdAt.toISOString(),
});

// Public: published FAQs ordered by `order`
router.get("/faqs", async (_req, res) => {
  const faqs = await db
    .select()
    .from(faqsTable)
    .where(eq(faqsTable.isPublished, true))
    .orderBy(asc(faqsTable.order), asc(faqsTable.createdAt));
  res.json(faqs.map(serialize));
});

// Admin: all FAQs (including unpublished)
router.get("/faqs/all", requireAuth, async (_req, res) => {
  const faqs = await db
    .select()
    .from(faqsTable)
    .orderBy(asc(faqsTable.order), asc(faqsTable.createdAt));
  res.json(faqs.map(serialize));
});

// Admin: create
router.post("/faqs", requireAuth, async (req, res) => {
  const { question, answer, order, isPublished } = req.body;
  if (!question || !answer) return res.status(400).json({ error: "question and answer are required." });
  const [created] = await db
    .insert(faqsTable)
    .values({ question, answer, order: order ?? 0, isPublished: isPublished ?? true })
    .returning();
  res.status(201).json(serialize(created));
});

// Admin: update
router.put("/faqs/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { question, answer, order, isPublished } = req.body;
  const [updated] = await db
    .update(faqsTable)
    .set({ question, answer, order, isPublished })
    .where(eq(faqsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "FAQ not found." });
  res.json(serialize(updated));
});

// Admin: delete
router.delete("/faqs/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(faqsTable).where(eq(faqsTable.id, id));
  res.json({ success: true, message: "FAQ deleted." });
});

export default router;
