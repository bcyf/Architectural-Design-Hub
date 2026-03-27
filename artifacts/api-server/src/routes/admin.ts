import { Router, type IRouter } from "express";
import { db, eventsTable, newsTable, teamTable, galleryTable, resourcesTable, jobsTable, contactTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/admin/stats", requireAuth, async (_req, res) => {
  try {
    const [events] = await db.select({ count: count() }).from(eventsTable);
    const [news] = await db.select({ count: count() }).from(newsTable);
    const [gallery] = await db.select({ count: count() }).from(galleryTable);
    const [team] = await db.select({ count: count() }).from(teamTable);
    const [resources] = await db.select({ count: count() }).from(resourcesTable);
    const [jobs] = await db.select({ count: count() }).from(jobsTable);
    const [contacts] = await db.select({ count: count() }).from(contactTable);
    const upcomingList = await db.select().from(eventsTable).where(eq(eventsTable.isUpcoming, true));

    res.json({
      totalEvents: Number(events.count),
      totalNews: Number(news.count),
      totalGallery: Number(gallery.count),
      totalTeamMembers: Number(team.count),
      totalResources: Number(resources.count),
      totalJobs: Number(jobs.count),
      totalContacts: Number(contacts.count),
      upcomingEvents: upcomingList.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/admin/contacts", requireAuth, async (_req, res) => {
  try {
    const contacts = await db.select().from(contactTable).orderBy(contactTable.createdAt);
    res.json(contacts.reverse().map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

export default router;
