import express from "express";
import { requireAdmin, requireSignIn } from "../middlewares/authMiddleware.js";
import {
  getUserController,
  updateUserController,
  deleteUserProfileController,
  getUserDetailsController,
} from "../controllers/userController.js";
import upload from "../middlewares/multerMiddleware.js";

const router = express.Router();

router.get("/user-details", requireSignIn, getUserDetailsController);
router.get("/:id", requireAdmin, getUserController);

//update documents routes
router.put(
  "/update-user",
  requireSignIn,
  upload.single("image"),
  updateUserController
);

router.post("/delete-profile", requireSignIn, deleteUserProfileController);

export default router;
