import accessSchema from "../models/accessSchema.js";
import documentsModel from "../models/documentsModel.js";
import userModel from "../models/userModel.js";

export const updateSettingsController = async (req, res) => {
  try {
    const { id } = req.user;
    const { title, name, logo, theme } = req.body;
    console.log("updateSettingsController", title, name, logo, theme);
    if (!title && !name && !theme && !logo) {
      return res.status(404).send({
        success: false,
        message: "Please enter a valid data.",
      });
    }

    const user = await userModel
      .findByIdAndUpdate(
        { _id: req.user.id },
        {
          title: title,
          name: name,
          logo: logo,
          theme: theme,
        },
        {
          new: true,
        }
      )
      .select("-createdAt -updatedAt -__v -password");
    res.status(200).send({
      success: true,
      message: "User updated successfully.",
      data: user,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error while updating settings.",
    });
  }
};
