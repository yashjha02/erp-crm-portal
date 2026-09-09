import { Router } from "express";
import { login, loginSchema, me } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", validateBody(loginSchema), login);
router.get("/me", requireAuth, me);

export default router;
