import { Router } from "express";
import { db, newsletterTable, newsletterCampaignsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

// Public: list of subscribers is protected. Subscribe is in contact.ts
// But we add admin subscriber management here.

// GET /newsletter/subscribers — admin
router.get("/newsletter/subscribers", requireAuth, async (_req, res) => {
  const subscribers = await db
    .select()
    .from(newsletterTable)
    .orderBy(desc(newsletterTable.subscribedAt));
  res.json(subscribers);
});

// DELETE /newsletter/subscribers/:id — admin
router.delete("/newsletter/subscribers/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(newsletterTable).where(eq(newsletterTable.id, id));
  res.json({ success: true, message: "Subscriber removed." });
});

// GET /newsletter/campaigns — admin
router.get("/newsletter/campaigns", requireAuth, async (_req, res) => {
  const campaigns = await db
    .select()
    .from(newsletterCampaignsTable)
    .orderBy(desc(newsletterCampaignsTable.createdAt));
  res.json(campaigns);
});

// POST /newsletter/campaigns — admin
router.post("/newsletter/campaigns", requireAuth, async (req, res) => {
  const { title, subject, content, status } = req.body;
  if (!title || !subject || !content) {
    return res.status(400).json({ error: "title, subject, and content are required." });
  }
  const [created] = await db
    .insert(newsletterCampaignsTable)
    .values({ title, subject, content, status: status || "draft" })
    .returning();
  res.status(201).json(created);
});

// PUT /newsletter/campaigns/:id — admin
router.put("/newsletter/campaigns/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { title, subject, content, status } = req.body;
  const [updated] = await db
    .update(newsletterCampaignsTable)
    .set({ title, subject, content, status, updatedAt: new Date() })
    .where(eq(newsletterCampaignsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Campaign not found." });
  res.json(updated);
});

// DELETE /newsletter/campaigns/:id — admin
router.delete("/newsletter/campaigns/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(newsletterCampaignsTable).where(eq(newsletterCampaignsTable.id, id));
  res.json({ success: true, message: "Campaign deleted." });
});

// POST /newsletter/campaigns/:id/send — admin (marks as sent, records subscriber count)
router.post("/newsletter/campaigns/:id/send", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [campaign] = await db
    .select()
    .from(newsletterCampaignsTable)
    .where(eq(newsletterCampaignsTable.id, id));
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });
  if (campaign.status === "sent") return res.status(400).json({ error: "Campaign already sent." });

  const subscribers = await db.select({ id: newsletterTable.id }).from(newsletterTable);
  const count = subscribers.length;

  const [updated] = await db
    .update(newsletterCampaignsTable)
    .set({ status: "sent", sentAt: new Date(), recipientCount: count, updatedAt: new Date() })
    .where(eq(newsletterCampaignsTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
