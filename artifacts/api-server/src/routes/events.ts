import { Router, type IRouter } from "express";
import { db, eventsTable, insertEventSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/events", async (req, res) => {
  try {
    const { upcoming, limit } = req.query;
    let query = db.select().from(eventsTable);
    const results = await query;
    let filtered = results;
    if (upcoming === "true") {
      filtered = filtered.filter((e) => e.isUpcoming);
    }
    if (limit) {
      filtered = filtered.slice(0, Number(limit));
    }
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    res.json(filtered.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })));
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
    console.error(err);
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

export default router;
