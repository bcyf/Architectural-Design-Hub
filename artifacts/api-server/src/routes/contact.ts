import { Router, type IRouter } from "express";
import { db, contactTable, newsletterTable, insertContactSchema, insertNewsletterSchema } from "@workspace/db";

const router: IRouter = Router();

router.post("/contact", async (req, res) => {
  try {
    const data = insertContactSchema.parse(req.body);
    await db.insert(contactTable).values(data);
    res.json({ success: true, message: "Your message has been received. We'll get back to you soon!" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid contact form data" });
  }
});

router.post("/newsletter", async (req, res) => {
  try {
    const data = insertNewsletterSchema.parse(req.body);
    await db.insert(newsletterTable).values(data).onConflictDoNothing();
    res.json({ success: true, message: "You've been subscribed to the newsletter!" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid email" });
  }
});

export default router;
