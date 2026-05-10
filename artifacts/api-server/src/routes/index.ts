import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import eventsRouter from "./events";
import newsRouter from "./news";
import teamRouter from "./team";
import galleryRouter from "./gallery";
import resourcesRouter from "./resources";
import jobsRouter from "./jobs";
import contactRouter from "./contact";
import adminRouter from "./admin";
import newsletterRouter from "./newsletter";
import quotesRouter from "./quotes";
import faqsRouter from "./faqs";
import studentsRouter from "./students";

const router: IRouter = Router();

router.use(authRouter);
router.use(studentsRouter);
router.use(healthRouter);
router.use(storageRouter);
router.use(eventsRouter);
router.use(newsRouter);
router.use(teamRouter);
router.use(galleryRouter);
router.use(resourcesRouter);
router.use(jobsRouter);
router.use(contactRouter);
router.use(adminRouter);
router.use(newsletterRouter);
router.use(quotesRouter);
router.use(faqsRouter);

export default router;
