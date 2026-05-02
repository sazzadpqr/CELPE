import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import adminRouter from "./admin";
import contentRouter from "./content";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(adminRouter);
router.use(contentRouter);

export default router;
