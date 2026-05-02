import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import adminRouter from "./admin";
import adminExtraRouter from "./adminExtra";
import adminCmsRouter from "./adminCms";
import adminCoursesRouter from "./adminCourses";
import adminUsersRouter from "./adminUsers";
import adminNotificationsRouter from "./adminNotifications";
import adminMonetizationRouter from "./adminMonetization";
import contentRouter from "./content";
import sessionsRouter from "./sessions";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(adminRouter);
router.use(adminExtraRouter);
router.use(adminCmsRouter);
router.use(adminCoursesRouter);
router.use(adminUsersRouter);
router.use(adminNotificationsRouter);
router.use(adminMonetizationRouter);
router.use(contentRouter);
router.use(sessionsRouter);
router.use(paymentsRouter);

export default router;
