import documentsModel from "../models/documentsModel.js";

export const getTrashController = async (req, res) => {
  try {
    const { id } = req.user;
    if (!id) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }

    const data = await documentsModel.find({
      adminId: id,
      isArchived: true,
    });

    return res.status(200).send({
      success: true,
      message: "The list of archived documents",
      data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while getting the trash list.",
    });
  }
};
