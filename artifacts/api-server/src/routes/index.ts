import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(adminRouter);

export default router;
