import { Router } from "express";
import {
  listChallans,
  getChallan,
  createChallan,
  updateChallanStatus,
  createChallanSchema,
  updateStatusSchema,
} from "../controllers/challan.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

router.get("/", listChallans);
router.get("/:id", getChallan);
router.post("/", requireRole("ADMIN", "SALES"), validateBody(createChallanSchema), createChallan);
router.patch(
  "/:id/status",
  requireRole("ADMIN", "SALES", "WAREHOUSE"),
  validateBody(updateStatusSchema),
  updateChallanStatus
);

export default router;
