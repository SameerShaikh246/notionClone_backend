import accessSchema from "../models/accessSchema.js";
import documentsModel from "../models/documentsModel.js";

const updateChildDocuments = async (id, status = true) => {
  const childDocs = await documentsModel.find({ parentDocument: id });
  await documentsModel.updateMany(
    {
      parentDocument: id,
    },
    { $set: { isPrivate: status } }
  );

  // Recursively update child documents
  if (childDocs.length > 0) {
    for (const doc of childDocs) {
      await updateChildDocuments(doc._id);
    }
  }
};

export const addPrivateDocumentsController = async (req, res) => {
  try {
    const adminId = req.user.id;
    const docId = req.params.id;
    const document = await documentsModel.findById(docId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }
    if (!document.adminId.equals(adminId)) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }

    // update child documents isPrivate:true
    if (!document.isPrivate) {
      // await updateChildDocuments(docId);
      document.isPrivate = true;
      await document.save();
    }

    res.status(200).send({
      success: true,
      message: "Document added to private successfully",
    });
  } catch (error) {
    console.error("Error adding documents to private:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while adding documents to private.",
    });
  }
};

export const removePrivateDocumentsController = async (req, res) => {
  try {
    const adminId = req.user.id;
    const docId = req.params.id;
    const document = await documentsModel.findById(docId);

    console.log("docId: " + docId, document);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (!document.adminId.equals(adminId)) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (!document.isPrivate) {
      return res.status(204).send({
        success: true,
        message: "Document is not private.",
      });
    }

    // If the document is private, update its status
    document.isPrivate = false;
    await document.save();
    // Update child documents if needed
    // await updateChildDocuments(docId, false);
    // Pass false to remove private status

    res.status(200).send({
      success: true,
      message: "Document removed from private successfully",
    });
  } catch (error) {
    console.error("Error removing document from private:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while removing document from private.",
    });
  }
};

export const getPrivateDocumentsController = async (req, res) => {
  try {
    const adminId = req.user.id;

    const privateDocuments = await documentsModel.find({
      adminId,
      isPrivate: true,
      isArchived: false,
    });

    res.status(200).send({
      success: true,
      data: privateDocuments,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while getting private document list.",
    });
  }
};
