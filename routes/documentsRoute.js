import express from "express";
import {
  createDocumentController,
  deleteDocumentController,
  getDocumentController,
  updateDocumentController,
  getChildDocumentController,
  archiveDocumentController,
  removeArchiveDocumentController,
  removeIconController,
  getDocumentSearchController,
  aggregateController,
  moveDocumentsController,
} from "../controllers/documentController.js";
import upload from "../middlewares/multerMiddleware.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

//Documents routes
router.post("/create", createDocumentController);
// get dcuments routes
router.get(
  "/getDocuments/:parentDocument",
  requireSignIn,
  getDocumentController
);
//get child documents by using parent document id
router.get(
  "/getChildDocuments/:parentDocument",
  requireSignIn,
  getChildDocumentController
);
//remove document
router.delete(
  "/delete-document/:docId",
  requireSignIn,
  deleteDocumentController
);
//update documents routes
router.put(
  "/update-document",
  upload.single("coverImage"),
  requireSignIn,
  updateDocumentController
);
router.put("/remove-icon", requireSignIn, removeIconController);

router.post("/archive-document/:id", requireSignIn, archiveDocumentController);

router.post(
  "/remove-archive-document/:id",
  requireSignIn,
  removeArchiveDocumentController
);
router.get("/document-search", requireSignIn, getDocumentSearchController);
router.post("/document-search", requireSignIn, () => {});

//move documents
router.put("/move/:id", requireSignIn, moveDocumentsController);

//aggregations testing
router.get("/test", requireSignIn, aggregateController);

export default router;
