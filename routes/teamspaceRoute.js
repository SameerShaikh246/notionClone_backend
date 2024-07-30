import express from "express";
import {
  createTeamspaceController,
  deleteTeamspaceController,
  getTeamspaceController,
  updateTeamspaceController,
  archiveTeamspaceController,
  membersController,
  guestController,
  getSharedDocuments,
  leaveTeamspaceController,
  defaultTeamspaceAccessController,
  listOfMembersController,
  listOfGuestsController,
  updateAccessController,
  getSingleTeamspaceWithMembersController,
} from "../controllers/teamspaceController.js";
import upload from "../middlewares/multerMiddleware.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import { removeArchiveDocumentController } from "../controllers/documentController.js";

//router object
const router = express.Router();

//routing

//route to create teamspace
router.post("/", upload.single("icon"), createTeamspaceController);
//route to get teamspace list and the shared teamspace list
router.get("/", requireSignIn, getTeamspaceController);

router.delete("/:id", requireSignIn, deleteTeamspaceController);
router.post("/archive/:id", requireSignIn, archiveTeamspaceController);
router.post(
  "/remove-archive/:id",
  requireSignIn,
  removeArchiveDocumentController
);
//update documents routes
router.put(
  "/:id",
  upload.single("icon"),
  requireSignIn,
  updateTeamspaceController
);

//Member access and share the document and teamspace
router.post("/members/:docId", requireSignIn, membersController);
//route for inviting the guest ato the teamspace
router.post("/guest/:docId", requireSignIn, guestController);

router.get("/shared-list", requireSignIn, getSharedDocuments);
router.post("/leave-teamspace/:docId", requireSignIn, leaveTeamspaceController);
router.post(
  "/default-access/",
  requireSignIn,
  defaultTeamspaceAccessController
);
//get members list with shared teamspaces
router.get("/members-list", requireSignIn, listOfMembersController);
//get teamspace and the access members
router.get(
  "/members/:id",
  requireSignIn,
  getSingleTeamspaceWithMembersController
);
router.get("/guests-list", requireSignIn, listOfGuestsController);

//update the user role

//update guest access
router.post("/update-access/:docId", requireSignIn, updateAccessController);

export default router;
