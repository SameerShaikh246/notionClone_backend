import express from "express";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import {
  updateSettingsController,
} from "../controllers/settingsController.js";

const router = express.Router();

router.put("/", requireSignIn, updateSettingsController);
export default router;
