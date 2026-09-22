import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hollowCloudRouter from "./hollow-cloud";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hollowCloudRouter);

export default router;
