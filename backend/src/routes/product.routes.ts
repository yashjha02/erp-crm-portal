import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  addStockMovement,
  productSchema,
  updateProductSchema,
  stockMovementSchema,
} from "../controllers/product.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

router.get("/", listProducts);
router.get("/:id", getProduct);
router.post("/", requireRole("ADMIN", "WAREHOUSE"), validateBody(productSchema), createProduct);
router.patch(
  "/:id",
  requireRole("ADMIN", "WAREHOUSE"),
  validateBody(updateProductSchema),
  updateProduct
);
router.post(
  "/:id/stock-movements",
  requireRole("ADMIN", "WAREHOUSE"),
  validateBody(stockMovementSchema),
  addStockMovement
);

export default router;
