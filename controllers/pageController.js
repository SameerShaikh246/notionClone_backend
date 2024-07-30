import documentsModel from "../models/documentsModel.js";
import pageModel from "../models/pageModel.js";
import { isAuthorized } from "../utils/utils.js";
import mongoose from "mongoose";
// const getAccess = async (pId) => {
//   let doc = await documentsModel.findOne({ parentDocument: pId });
//     console.log("teamspace document 1", doc);

//   if (doc.parentDocument || doc.type !== "teamspace") {
//     getAccess(doc.parentDocument);
//   } else {
//     console.log("teamspace document 2", doc);
//     return doc;
//   }
// };
// const checkPrivatePage = async (id) => {
//   console.log("checking private page for id:", id);
//   const doc = await documentsModel.findById(id);
//   // check if the doc is teamspace and not a parent document then return false
//   if (doc.type === "teamspace" && !doc.isPrivate) {
//     console.log("teamspace", id);
//     return false;
//   }
//   // check if it is private then retun true to throw error
//   if (doc.isPrivate) {
//     return true;
//   }
//   //if not private then check for parent document
//   if (doc.parentDocument) {
//     return checkPrivatePage(doc.parentDocument);
//   }
// };
// const checkArchivedPage = async (id) => {
//   console.log("Checking archived doc id:", id);
//   const doc = await documentsModel.findById(id);
//   //check if it the doc is teamspace and there is no parent document and not archived then return false
//   if (doc.type === "teamspace" && !doc.isArchived) {
//     return false;
//   }
//   //if doc is archived then return true to throw error
//   if (doc.isArchived) {
//     return true;
//   }
//   //if not archived then check for the parent document
//   if (doc.parentDocument) {
//     return checkArchivedDoc(doc.parentDocument);
//   }
// };
// export const getPageController = async (req, res, next) => {
//   const userId = req.user.id;
//   const documentId = req.params.documentId;
//   let isArchived = false;
//   if (!userId || !documentId) {
//     return res.status(400).send({
//       success: false,
//       message: "Token or documentId not found.",
//     });
//   }
//   try {
//     //check only admin of document and the member of it can acccess the document
//     const data = await documentsModel
//       .findById(documentId)
//       .select("-createdAt -updatedAt -__v ")
//       .populate("page", "-__v");
//     if (!data) {
//       return res.status(404).send({
//         success: false,
//         message: "Document not found.",
//       });
//     }
//     // console.log("stage 2", data);
//     // only admin and access users are allowed.
//     //checking for users access

//     if (!data.adminId.equals(userId) && !(await isAuthorized(data, userId))) {
//       return res.status(403).send({
//         success: false,
//         message: "Unauthorized document access.",
//       });
//     }
//     //in case of private page
//     if (data.isPrivate && !data.adminId.equals(userId)) {
//       return res.status(401).send({
//         success: false,
//         message: "Unauthorized access for private page.",
//       });
//     }
//     //check for parentDocument is private
//     if (!data.adminId.equals(userId) && data.parentDocument) {
//       const checkAccess = await checkPrivatePage(data.parentDocument);
//       if (checkAccess) {
//         return res.status(401).send({
//           success: false,
//           message: "Unauthorized access for private page.",
//         });
//       }
//     }

//     //check for is parent archived.
//     if (!data.isArchived) {
//       isArchived = await checkArchivedPage(data.parentDocument);
//     }

//     if (!data?.page) {
//       const page = await new pageModel({
//         document: data._id,
//       }).save();
//       data.page = page._id;
//       data.save();
//     }
//     return res.status(200).send({
//       success: true,
//       message: "page fetched successfully",
//       data: { ...data.toObject(), isArchived },
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({
//       success: false,
//       message: "An error occurred while fetching the page.",
//     });
//   }
// };
const checkDocumentStatus = async (id, checkArchived = false) => {
  const doc = await documentsModel.findById(id);
  // console.log("Checking status", doc._id);
  if (checkArchived) {
    if (doc.type === "teamspace" && !doc.isArchived) {
      return false;
    }

    if (doc.isArchived) {
      return true;
    }
  } else {
    if (doc.type === "teamspace" && !doc.isPrivate) {
      return false;
    }
    if (doc.isPrivate) {
      return true;
    }
  }

  if (doc.parentDocument) {
    return checkDocumentStatus(doc.parentDocument, checkArchived);
  }

  return false;
};

export const getPageController = async (req, res) => {
  const userId = req.user.id;
  const documentId = req.params.documentId;
  let isArchived = false;
  if (!userId || !documentId) {
    return res.status(400).send({
      success: false,
      message: "Token or documentId not found.",
    });
  }

  try {
    // const data = await documentsModel.aggregate([
    //   { $match: { _id: new mongoose.Types.ObjectId(documentId) } },
    //   {
    //     $lookup: {
    //       from: "page",
    //       localField: "page",
    //       foreignField: "_id",
    //       as: "page",
    //     },
    //   },
    // ]);

    // if (data.length === 0) {
    //   return res.status(404).send({
    //     success: false,
    //     message: "Document not found.",
    //   });
    // }
    // const document = await data[0];

    const document = await documentsModel.findById(documentId).populate("page");

    if (!document) {
      return res.status(404).send({
        success: false,
        message: "Document not found.",
      });
    }

    //first check the member is authorized to the teamspace
    if (
      !document.adminId.equals(userId) &&
      !(await isAuthorized(document, userId))
    ) {
      return res.status(403).send({
        success: false,
        message: "Unauthorized document access.",
      });
    }
    //check for members access for current page for both private and archived documents
    if (document.isPrivate && !document.adminId.equals(userId)) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access for private page.",
      });
    }
    if (!document.adminId.equals(userId) && document.isArchived) {
      return res.status(403).send({
        success: false,
        message: "Unauthorized access for archived page.",
      });
    }

    //not teamspace then only need to check the parent docs.
    if (document.type !== "teamspace") {
      if (!document.adminId.equals(userId) && !document.isPrivate) {
        const isPrivate = await checkDocumentStatus(document.parentDocument);
        console.log("isPrivateisPrivate", isPrivate);
        if (isPrivate) {
          return res.status(401).send({
            success: false,
            message: "Unauthorized access for private page.",
          });
        }
      }
      if (document.isArchived) {
        isArchived = true;
      } else {
        isArchived = await checkDocumentStatus(document.parentDocument, true);
      }
    } else {
      //if teamspace then set the value of isArchived
      isArchived = document.isArchived;
    }

    if (!document.page) {
      const page = await new pageModel({ document: document._id }).save();
      document.page = page._id;
      await documentsModel.findByIdAndUpdate(document._id, { page: page._id });
    }
    if (isArchived && !document.adminId.equals(userId)) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access for archived page.",
      });
    }
    return res.status(200).send({
      success: true,
      message: "Page fetched successfully.",
      data: { ...document.toObject(), isArchived },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while fetching the page.",
    });
  }
};

export const getPageContentController = async (req, res, next) => {
  const adminId = req.user.id;
  const documentId = req.params.documentId;
  try {
    if (!adminId || !documentId) {
      return res.status(400).send({
        success: false,
        message: "token or documentId not found.",
      });
    }
    const data = await pageModel.findOne({
      document: documentId,
    });
    res.status(200).send({
      success: true,
      message: "page fetched successfully.",
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while fetching the page.",
    });
  }
};
export const updatePageController = async (req, res) => {
  try {
    const id = req.params.pageId;
    // console.log("page content", req.body.content);
    const content = await pageModel.findByIdAndUpdate(
      id,
      {
        content: req.body.content,
      },
      {
        new: true,
      }
    );
    res.status(200).send({
      success: true,
      message: "page updated successfully.",
      data: content,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while updating the page content.",
    });
  }
};
