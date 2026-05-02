import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import adminRouter from "./admin";
import adminExtraRouter from "./adminExtra";
import contentRouter from "./content";
import sessionsRouter from "./sessions";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(adminRouter);
router.use(adminExtraRouter);
router.use(contentRouter);
router.use(sessionsRouter);
router.use(paymentsRouter);

export default router;
