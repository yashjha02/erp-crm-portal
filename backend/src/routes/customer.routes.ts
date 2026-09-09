import { Router } from "express";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  addCustomerNote,
  customerSchema,
  updateCustomerSchema,
  noteSchema,
} from "../controllers/customer.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

router.get("/", listCustomers);
router.get("/:id", getCustomer);
router.post("/", requireRole("ADMIN", "SALES"), validateBody(customerSchema), createCustomer);
router.patch(
  "/:id",
  requireRole("ADMIN", "SALES"),
  validateBody(updateCustomerSchema),
  updateCustomer
);
router.post(
  "/:id/notes",
  requireRole("ADMIN", "SALES"),
  validateBody(noteSchema),
  addCustomerNote
);

export default router;
