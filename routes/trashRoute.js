import express from "express";
import {getTrashController} from "../controllers/trashController.js"
import { requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/",requireSignIn, getTrashController);




export default router;
