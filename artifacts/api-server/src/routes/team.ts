import { Router, type IRouter } from "express";
import { db, teamTable, insertTeamSchema } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/team", async (_req, res) => {
  try {
    const members = await db.select().from(teamTable).orderBy(asc(teamTable.order));
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

router.post("/team", async (req, res) => {
  try {
    const data = insertTeamSchema.parse(req.body);
    const [member] = await db.insert(teamTable).values(data).returning();
    res.status(201).json(member);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid team member data" });
  }
});

router.patch("/team/:id", async (req, res) => {
  try {
    const data = insertTeamSchema.partial().parse(req.body);
    const [member] = await db.update(teamTable).set(data).where(eq(teamTable.id, Number(req.params.id))).returning();
    if (!member) return res.status(404).json({ error: "Member not found" });
    res.json(member);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid team member data" });
  }
});

router.delete("/team/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(teamTable).where(eq(teamTable.id, Number(req.params.id))).returning();
    if (!deleted) return res.status(404).json({ error: "Member not found" });
    res.json({ success: true, message: "Member deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete member" });
  }
});

export default router;
