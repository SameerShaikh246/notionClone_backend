import documentsModel from "../models/documentsModel.js";
import pageModel from "../models/pageModel.js";
import cloudinary from "../utils/cloudinary.js";
import mongoose from "mongoose";

export const createDocumentController = async (req, res) => {
  try {
    const {
      title,
      adminId,
      isArchived,
      parentDocument,
      content,
      Icon,
      teamspaceId,
    } = req.body;

    if (!title || !adminId) {
      return res.status(400).json({
        success: false,
        message: "Title and adminId are required fields.",
      });
    }

    const document = await new documentsModel({
      title,
      adminId,
      isArchived,
      parentDocument,
      content,
      Icon,
      type: "document",
      teamspaceId,
    });
    const page = new pageModel({
      document: document._id,
    });

    await page.save();

    document.page = page._id;
    await document.save();

    res.status(200).send({
      success: true,
      message: "Document created successfully",
      data: document,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while creating the document",
    });
  }
};
export const getChildDocumentController = async (req, res) => {
  try {
    const { parentDocument } = req.params;
    const adminId = req.user.id;

    // console.log("adminId: ", adminId, parentDocument);
    if (!parentDocument) {
      res.status(400).send({
        success: false,
        message: "Parent Document ID not found.",
        data: doc,
      });
    }
    // const doc = await documentsModel.find({ adminId: adminId }).populate({
    //   path: "users",
    //   populate: {
    //     path: "adminId",
    //   },
    // });

    const doc = await documentsModel.find({
      adminId: adminId,
      parentDocument,
      isArchived: false,
      isPrivate: false,
    });
    for (let i = 0; i < doc.length; i++) {
      if (!doc[i]?.page) {
        const page = await new pageModel({
          document: doc[i]._id,
        }).save();

        let updatedDoc = await documentsModel.findByIdAndUpdate(
          doc[i]._id,
          {
            page: page._id,
          },
          {
            new: true,
          }
        );
        // console.log("page updatedDoc", page, updatedDoc);
      }
    }
    res.status(200).send({
      success: true,
      message: "Document list fetched successfully",
      data: doc,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while getting the document",
    });
  }
};

export const getDocumentController = async (req, res) => {
  try {
    const { parentDocument } = req.params;
    // const teampsace = await getTeamspace(parentDocument);
    // console.log("teampsaceteampsaceteampsace", teampsace);
    const adminId = req.user.id;

    // const doc = await documentsModel.find({ adminId: adminId }).populate({
    //   path: "users",
    //   populate: {
    //     path: "adminId",
    //   },
    // });

    if (!parentDocument) {
      return res.status(400).json({
        success: false,
        message: "Parent document ID is required.",
      });
    }
    const docs = await documentsModel.find({
      // adminId: adminId,
      parentDocument,
      isArchived: false,
      isPrivate: false,
    });

    // console.log("adminId: ", parentDocument, docs);

    res.status(200).send({
      success: true,
      message: "Document list fetched successfully",
      data: docs,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while getting the document",
    });
  }
};

async function deleteChildDocs(parentID) {
  const doc = await documentsModel.find({ parentDocument: parentID });
  if (doc.length > 0) {
    for (let i = 0; i < doc.length; i++) {
      await documentsModel.findByIdAndDelete(doc[i]._id);
      await pageModel.findByIdAndDelete(doc[i].page);
      await deleteChildDocs(doc[i]._id);
      // if (doc[i].cloudinary_id) {
      //   await cloudinary.uploader.destroy(doc[i].cloudinary_id);
      // }
    }
  }
}
export const deleteDocumentController = async (req, res) => {
  try {
    const { docId } = req.params;
    console.log("Document deleted id", docId);
    const document = await documentsModel.findById(docId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }
    if (!document.adminId.equals(req.user.id)) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }
    await deleteChildDocs(document._id); //Function to Delete all child documents before deleting the parent document and its children if any
    // if (document.cloudinary_id) {
    //   await cloudinary.uploader.destroy(document.cloudinary_id);
    // }
    await documentsModel.findByIdAndDelete(docId);
    await pageModel.findByIdAndDelete(document.page);
    // const docAsParent = await documentsModel.deleteMany({
    //   parentDocument: docId,
    // });

    res.status(200).send({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while deleting the document",
    });
  }
};

export const updateDocumentController = async (req, res) => {
  try {
    const { title, _id: id, icon, isCoverImage } = req.body;
    // if (!title) {
    //   return res.status(404).send({
    //     message: "Document title not found",
    //   });
    // }
    console.log("updateDocumentController", req.file, req.body);
    if (!id) {
      return res.status(404).send({
        message: "Document id not found",
      });
    }

    if (req.file && isCoverImage) {
      // Delete image from cloudinary
      const doc = await documentsModel.findById(id);
      if (doc.cloudinary_id) {
        await cloudinary.uploader.destroy(doc.cloudinary_id);
      }
      const result = await cloudinary.uploader.upload(req.file.path);
      const updatedDoc = await documentsModel.findByIdAndUpdate(
        id,
        {
          coverImage: result.url,
          cloudinary_id: result.public_id,
        },
        {
          new: true,
        }
      );
      return res.status(200).send({
        success: true,
        message: "Document updated successfully",
        data: updatedDoc,
      });
    }

    if (!title && !icon) {
      return res.status(404).send({
        success: false,
        message: "Document details not found.",
      });
    }

    if (title && !icon) {
      const doc = await documentsModel.findByIdAndUpdate(
        id,
        {
          title: title,
        },
        {
          new: true,
        }
      );
      return res.status(200).send({
        success: true,
        message: "Document title updated successfully",
        data: doc,
      });
    } else if (title && icon) {
      // Delete image from cloudinary
      // const doc = await documentsModel.findById(id);
      // if (doc.cloudinary_id) {
      //   await cloudinary.uploader.destroy(doc.cloudinary_id);
      // }
      // const result = await cloudinary.uploader.upload(req.file.path);
      const updatedDoc = await documentsModel.findByIdAndUpdate(
        id,
        {
          title: title,
          icon: icon,
        },
        {
          new: true,
        }
      );

      return res.status(200).send({
        success: true,
        message: "Document updated successfully",
        data: updatedDoc,
      });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while updating the document",
    });
  }
};

export const removeIconController = async (req, res) => {
  try {
    const { _id: id, icon } = req.body;

    if (!id) {
      return res.status(404).send({
        message: "Document id not found",
      });
    }

    const updatedDoc = await documentsModel.findByIdAndUpdate(
      id,
      {
        icon: null,
      },
      {
        new: true,
      }
    );

    return res.status(200).send({
      success: true,
      message: "Icon removed successfully",
      data: updatedDoc,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while removing the document icon",
    });
  }
};

export const archiveDocumentController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(404).send({
        success: false,
        message: "Document id not found",
      });
    }

    const document = await documentsModel.findById(id);

    if (!document.adminId.equals(req.user.id)) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }
    // await recursiveArchive(document._id);
    document.isArchived = true;
    document.save();
    res.status(200).send({
      success: true,
      message: "Document archived successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while archiving the document",
    });
  }
};

// export const removeArchiveDocumentController = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(404).send({
//         success: false,
//         message: "Document id not found",
//       });
//     }

//     const document = await documentsModel.findById(id);

//     if (document.adminId !== req.user.id) {
//       return res.status(401).send({
//         success: false,
//         message: "Unauthorized access",
//       });
//     }
//     await recursiveRemoveArchive(document._id);
//     document.isArchived = false;
//     document.save();
//     res.status(200).send({
//       success: true,
//       message: "Document archived successfully",
//     });
//   } catch (error) {
//     res.status(500).send({
//       success: false,
//       message: "An error occurred while archiving the document",
//     });
//   }
// };

export const removeArchiveDocumentController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(404).send({
        success: false,
        message: "Document id not found",
      });
    }
    const document = await documentsModel.findById(id);
    if (!document.adminId.equals(req.user.id)) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }
    document.isArchived = false;
    document.save();
    res.status(200).send({
      success: true,
      message: "Removed archive document successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while removing archive document",
    });
  }
};

export const updateDocument = async (req, res) => {
  const document = await documentsModel.find();
  for (let index = 0; index < document.length; index++) {
    const doc = await documentsModel.findByIdAndUpdate(
      document[index]._id,
      {
        isArchived: false,
      },
      {
        new: true,
      }
    );
  }
  // document.isArchived = false;
  // document.save();
  res.status(200).send({
    data: document,
  });
};

export const getDocumentSearchController = async (req, res) => {
  try {
    const { id } = req.user;

    if (!id) {
      return res.status(404).send({
        success: false,
        message: "User id not found",
      });
    }

    const document = await documentsModel.find({
      adminId: id,
      type: { $ne: "teamspace" },
      isPrivate: false,
    });

    const teamspace = await documentsModel.find({
      adminId: id,
      type: "teamspace",
      isPrivate: false,
    });

    // if (document.adminId !== req.user.id) {
    //   return res.status(401).send({
    //     success: false,
    //     message: "Unauthorized access",
    //   });
    // }
    res.status(200).send({
      success: true,
      message: "All document list fetched successfully",
      data: { document, teamspace },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while removing archive document",
    });
  }
};

const changeTeamspaceId = async (parentDocument, teamspaceId) => {
  // console.log("parentDocument", parentDocument);
  const childDocs = await documentsModel.find({
    parentDocument: parentDocument,
  });
  await documentsModel.updateMany(
    {
      parentDocument: parentDocument,
    },
    { $set: { teamspaceId: teamspaceId } }
  );
  if (childDocs.length > 0) {
    for (const doc of childDocs) {
      await changeTeamspaceId(doc._id, teamspaceId);
      // console.log("Documents of childDocs", childDocs, doc);
    }
  }
};

//here admin can move the document from one teamspace to another teamspace
export const moveDocumentsController = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const parentDocument = req.body.parentDocument;
    const teamspaceId = req.body.teamspaceId;

    if (!id) {
      return res.status(400).send({
        success: false,
        message: "Document ID is missing.",
      });
    }
    if (!parentDocument) {
      return res.status(400).send({
        success: false,
        message: "Teamspace ID is missing.",
      });
    }

    const doc = await documentsModel.findById(id);
    if (!doc) {
      return res.status(404).send({
        success: false,
        message: "Document not found.",
      });
    }
    console.log(
      "userIduserIduserIduserIduserIduserId",
      userId,
      doc.adminId,
      parentDocument
    );
    if (!doc.adminId.equals(userId)) {
      return res.status(403).send({
        success: false,
        message: "Unauthorized to move the document to teamspace.",
      });
    }

    //to change the documents location we need to change tha parentDocument ID of the main document and if the teamspace is changed then we need to change teamspaceId in main document and all nested documents as well.
    //check if teamspace is changed or not
    if (!doc.teamspaceId.equals(teamspaceId)) {
      await changeTeamspaceId(id, teamspaceId);
    }
    doc.parentDocument = parentDocument;
    doc.teamspaceId = teamspaceId;
    await doc.save();
    res.status(200).send({
      success: true,
      message: "Document moved from favorites to teamspace successfully.",
    });
  } catch (error) {
    console.error("Error moving document to teamspace:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while moving the document to teamspace.",
    });
  }
};

export const aggregateController = async (req, res) => {
  try {
    const id = req.user.id;
    // const data = await documentsModel.aggregate([
    //   {
    //     $match: { type: "teamspace" }, // Add $match stage to filter documents with type "teampsace"
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "adminId",
    //       foreignField: "_id",
    //       as: "admin",
    //     },
    //   },
    //   {
    //     $project: {
    //       "admin.password": 0, // Exclude the password field from the populated admin
    //       "admin.cloudinary_id": 0,
    //       "admin.answer": 0,
    //       "admin.accessUsers": 0,
    //     },
    //   },
    //   {
    //     // $group: { _id: "$adminId", documents: { $push: "$title" } },
    //     $group: {
    //       _id: "$adminId",
    //       documents: { $push: "$$ROOT" },
    //       number_of_documents: { $sum: 1 },
    //     },
    //   },
    //   { $sort: { number_of_documents: -1 } },
    //   { $limit: 2 },
    // ]);

    const data = await documentsModel.aggregate([
      {
        $match: { type: "teamspace", adminId: new mongoose.Types.ObjectId(id) },
      },
      { $unwind: "$accessUsers" },
      {
        // $group: { _id: "$adminId", documents: { $push: "$title" } },
        $group: {
          _id: "$adminId",
          documents: { $push: "$$ROOT" },
          number_of_documents: { $sum: 1 },
        },
      },
      { $sort: { number_of_documents: -1 } },
    ]);

    res.status(200).send({
      success: true,
      message: "All document list fetched successfully",
      data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while aggregate testing",
    });
  }
};
