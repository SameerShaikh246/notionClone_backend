import express from "express";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import {
  grammarController,
  translateController,
  autocompleteController,
} from "../controllers/openAiController.js";

const router=express.Router();


router.post("/grammar", requireSignIn, grammarController);
router.post("/translate", requireSignIn, translateController);
router.post("/autoComplete",autocompleteController);


export default router;
