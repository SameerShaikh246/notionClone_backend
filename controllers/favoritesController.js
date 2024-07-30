import accessSchema from "../models/accessSchema.js";
import documentsModel from "../models/documentsModel.js";
import { isAuthorized } from "../utils/utils.js";

export const getFavoriteDocumentsController = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).send({
        success: false,
        message: "User ID is missing in the request",
      });
    }
    const id = req.user.id;

    const documents = await documentsModel
      .find({
        favorites: { $in: [id] },
      })
      .select("-__v");

    res.status(200).send({
      success: true,
      message: "favorite documents fetched successfully",
      data: documents,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while fetching the favorite document",
    });
  }
};
// export const getTeamspace = async (parentId) => {
//   try {
//     const doc = await documentsModel.findById(parentId);

//     if (doc.type !== "teamspace" || doc?.parentDocument) {
//       return getTeamspace(doc.parentDocument);
//     }
//     return doc;
//   } catch (error) {
//     console.log(error);
//   }
// };

// const isAuthorized = async (doc, userId) => {
//   if (doc.adminId.equals(userId)) {
//     return true;
//   }

//   const teamspace = await getTeamspace(doc.parentDocument);
//   return teamspace.accessUsers.some((user) => user.userId.equals(userId));
// };

export const addFavoriteDocumentsController = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).send({
        success: false,
        message: "Document ID is missing.",
      });
    }

    const doc = await documentsModel.findById(id);
    if (!doc) {
      return res.status(404).send({
        success: false,
        message: "Document not found.",
      });
    }
    if (doc.type === "teamspace") {
      return res.status(400).send({
        success: false,
        message: "Teamspace cannot be added to favorite documents.",
      });
    }

    if (doc.favorites.includes(userId)) {
      return res.status(400).send({
        success: false,
        message: "Document is already added in the favorite list.",
      });
    }
    // check in access collection
    //need to check if admin id and user id same them no need for auth check
    if (!doc.adminId.equals(userId)) {
      let access = await isAuthorized(doc, userId);
      if (!access) {
        return res.status(403).send({
          success: false,
          message: "Unauthorized document access.",
        });
      }
    }

    //query to add userId in the favorites array of the docment
    const updatedDoc = await documentsModel.findByIdAndUpdate(id, {
      $push: { favorites: userId },
    });
    res.status(200).send({
      success: true,
      message: "Document added to the favorites list.",
      data: updatedDoc,
    });
  } catch (error) {
    console.error("Error adding document to favorites:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while adding the document to favorites.",
    });
  }
};

export const deleteFavoriteDocumentsController = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    if (!id) {
      return res.status(400).send({
        success: false,
        message: "Document ID is missing.",
      });
    }
    const doc = await documentsModel.findById(id);
    if (!doc) {
      return res.status(404).send({
        success: false,
        message: "Document not found.",
      });
    }
    if (!doc.favorites.includes(userId)) {
      return res.status(400).send({
        success: false,
        message: "Document is not in the favorite list.",
      });
    }

    //query to remove userId in the favorites array of the docment
    const updatedDoc = await documentsModel.findByIdAndUpdate(id, {
      $pull: { favorites: userId },
    });
    res.status(200).send({
      success: true,
      message: "Document removed from the favorites list.",
      data: updatedDoc,
    });
  } catch (error) {
    console.error("Error removing document from favorites:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while removing the document from favorites.",
    });
  }
};
