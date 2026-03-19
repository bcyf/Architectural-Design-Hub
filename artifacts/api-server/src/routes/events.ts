import { Router, type IRouter } from "express";
import { db, eventsTable, insertEventSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

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

router.post("/events", async (req, res) => {
  try {
    const data = insertEventSchema.parse(req.body);
    const [event] = await db.insert(eventsTable).values(data).returning();
    res.status(201).json({ ...event, createdAt: event.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid event data" });
  }
});

router.patch("/events/:id", async (req, res) => {
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

router.delete("/events/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(eventsTable).where(eq(eventsTable.id, Number(req.params.id))).returning();
    if (!deleted) return res.status(404).json({ error: "Event not found" });
    res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
