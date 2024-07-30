import documentsModel from "../models/documentsModel.js";
import pageModel from "../models/pageModel.js";
import userModel from "../models/userModel.js";
import cloudinary from "../utils/cloudinary.js";

export const getUserController = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = await userModel
      .findById(id)
      .select("-createdAt -updatedAt -__v -password");
    if (!user) {
      return res
        .status(200)
        .send({ success: true, message: "User not found." });
    }
    res.status(200).send({
      success: true,
      message: "User successfully fetched.",
      user,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while getting the user details.",
    });
  }
};
export const getUserDetailsController = async (req, res, next) => {
  try {
    const { id } = req.user;
    const user = await userModel
      .findById(id)
      .select("-createdAt -updatedAt -__v -password");
    console.log("useruser", user);
    if (!user) {
      return res
        .status(200)
        .send({ success: true, message: "User not found." });
    }
    res.status(200).send({
      success: true,
      message: "User successfully fetched.",
      data: user,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while getting the user details.",
    });
  }
};
export const updateUserController = async (req, res) => {
  try {
    console.log("data", req.user);
    const image = req?.file?.path;
    const { title, name, logo, theme } = req.body;
    const user = await userModel
      .findById(req.user.id)
      .select("-createdAt -updatedAt -__v -password");

    if (image) {
      if (user.cloudinary_id) {
        // Delete image from cloudinary
        await cloudinary.uploader.destroy(user.cloudinary_id);
      }
      // Upload image to cloudinary
      await cloudinary.uploader.upload(image, async (err, result) => {
        console.log("error", err);
        console.log("result", result);
        const user = await userModel
          .findByIdAndUpdate(
            { _id: req.user.id },
            {
              image: `${result?.url}`,
              cloudinary_id: result?.public_id,
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
      });
    } else {
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
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while updating user.",
      error,
    });
  }
};

export const deleteUserProfileController = async (req, res) => {
  try {
    const { id } = req.user;

    //clear all data from DB
    //delete teamspace, documents and pages

    const allDocuments = await documentsModel.find({ userId: id }); // nested child documents save with the teamspace id as parentDocument

    //delete nested child documents and cover images
    if (allDocuments.length) {
      for (const doc of allDocuments) {
        if (doc?.cloudinary_id) {
          await cloudinary.uploader.destroy(doc?.cloudinary_id);
        }
        await documentsModel.findByIdAndDelete(doc._id);
        let page = await pageModel.find({ document: doc._id });
        if (page.length >= 1) await pageModel.findByIdAndDelete(page[0]._id);
      }
    }
    let user = await userModel.findByIdAndDelete(id);
    // res.redirect("http://localhost:5173/login");
    // let user = await userModel
    //   .findByIdAndUpdate(
    //     id,
    //     {
    //       status: "Deactive",
    //     },
    //     {
    //       new: true,
    //     }
    //   )
    //   .select("-createdAt -updatedAt -__v -password");
    res.status(200).send({
      success: true,
      message: "User deleted successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while deleting user profile.",
      error,
    });
  }
};
