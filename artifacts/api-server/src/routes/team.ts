import { Router, type IRouter } from "express";
import { db, teamTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/team", async (_req, res) => {
  try {
    const members = await db.select().from(teamTable).orderBy(asc(teamTable.order));
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

export default router;
