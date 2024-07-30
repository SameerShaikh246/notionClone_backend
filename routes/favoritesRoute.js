import express from "express";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import {
  getFavoriteDocumentsController,
  addFavoriteDocumentsController,
  deleteFavoriteDocumentsController,
} from "../controllers/favoritesController.js";

//router object
const router = express.Router();

//get favorite documents
router.get("/", requireSignIn, getFavoriteDocumentsController);

//add to favorites
router.post("/:id", requireSignIn, addFavoriteDocumentsController);

//remove from favorites
router.delete("/:id", requireSignIn, deleteFavoriteDocumentsController);


export default router;
