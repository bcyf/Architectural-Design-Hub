import { Router, type IRouter } from "express";
import { db, eventsTable, insertEventSchema, rsvpsTable, insertRsvpSchema } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/events", async (req, res) => {
  try {
    const { upcoming, limit } = req.query;
    let results = await db.select().from(eventsTable);
    if (upcoming === "true") results = results.filter((e) => e.isUpcoming);
    results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (limit) results = results.slice(0, Number(limit));
    res.json(results.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, Number(req.params.id)));
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ ...event, createdAt: event.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

router.post("/events", requireAuth, async (req, res) => {
  try {
    const data = insertEventSchema.parse(req.body);
    const [event] = await db.insert(eventsTable).values(data).returning();
    res.status(201).json({ ...event, createdAt: event.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid event data" });
  }
});

router.patch("/events/:id", requireAuth, async (req, res) => {
  try {
    const data = insertEventSchema.partial().parse(req.body);
    const [event] = await db.update(eventsTable).set(data).where(eq(eventsTable.id, Number(req.params.id))).returning();
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ ...event, createdAt: event.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid event data" });
  }
});

router.delete("/events/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(rsvpsTable).where(eq(rsvpsTable.eventId, Number(req.params.id)));
    const [deleted] = await db.delete(eventsTable).where(eq(eventsTable.id, Number(req.params.id))).returning();
    if (!deleted) return res.status(404).json({ error: "Event not found" });
    res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

router.post("/events/:id/rsvp", async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    if (!event) return res.status(404).json({ error: "Event not found" });

    const existing = await db.select().from(rsvpsTable).where(eq(rsvpsTable.eventId, eventId));
    if (existing.find(r => r.email === req.body.email)) {
      return res.status(409).json({ error: "You have already RSVP\u2019d to this event." });
    }

    const data = insertRsvpSchema.parse({ ...req.body, eventId });
    const [rsvp] = await db.insert(rsvpsTable).values(data).returning();

    await db.update(eventsTable)
      .set({ rsvpCount: sql`${eventsTable.rsvpCount} + 1` })
      .where(eq(eventsTable.id, eventId));

    res.status(201).json({ ...rsvp, createdAt: rsvp.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to submit RSVP" });
  }
});

router.get("/events/:id/rsvps", requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const rsvps = await db.select().from(rsvpsTable)
      .where(eq(rsvpsTable.eventId, eventId))
      .orderBy(asc(rsvpsTable.createdAt));
    res.json(rsvps.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch RSVPs" });
  }
});

export default router;
