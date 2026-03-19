import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import newsRouter from "./news";
import teamRouter from "./team";
import galleryRouter from "./gallery";
import resourcesRouter from "./resources";
import jobsRouter from "./jobs";
import contactRouter from "./contact";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(newsRouter);
router.use(teamRouter);
router.use(galleryRouter);
router.use(resourcesRouter);
router.use(jobsRouter);
router.use(contactRouter);
router.use(adminRouter);

export default router;
