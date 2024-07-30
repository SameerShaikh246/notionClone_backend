import express from "express";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import {
  getPrivateDocumentsController,
  addPrivateDocumentsController,
  removePrivateDocumentsController,
} from "../controllers/privateController.js";

//router object
const router = express.Router();

//get private documents
router.get("/", requireSignIn, getPrivateDocumentsController);

//add to privates
router.post("/:id", requireSignIn, addPrivateDocumentsController);

//remove from privates
router.put("/:id", requireSignIn, removePrivateDocumentsController);

export default router;
