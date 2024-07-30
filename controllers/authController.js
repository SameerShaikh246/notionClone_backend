import userModel from "../models/userModel.js";
import { comparePassword, hashPassword } from "../utils/utils.js";
import JWT from "jsonwebtoken";
import nodemailer from "nodemailer";
import cloudinary from "../utils/cloudinary.js";
import documentsModel from "../models/documentsModel.js";
import accessSchema from "../models/accessSchema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await userModel.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.body.refreshToken || req.cookies.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = JWT.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await userModel.findById(decodedToken?.id);
    // console.log("refresh token user", user);
    // console.log("incoming refresh token", incomingRefreshToken);
    // console.log("existing refresh token", user?.refreshToken);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      // throw new ApiError(401, "Refresh token is expired or used");
      return res.status(401).send({
        success: false,
        message: "Refresh token is expired or used",
      });
    }

    const options = {
      httpOnly: true,
      secure: true,
      path: "/",
    };

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id
    );

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .send({
        success: true,
        message: "Access token refreshed",
        user: {
          ...user.toObject(),
          details: user.details,
          accessToken,
        },
        accessToken,
        refreshToken,
      });

    // json(
    //   new ApiResponse(
    //     200,
    //     { accessToken, refreshToken: newRefreshToken },
    //     "Access token refreshed"
    //   )
    // );
  } catch (error) {
    return res.status(401).send({
      success: false,
      error: error.message,
      message: "Invalid refresh token",
    });
  }
});

export const registerController = async (req, res) => {
  // console.log(req.body);
  try {
    console.log("here....", req.body);
    const { name, email, password, phone, address, role, answer } = req.body;
    //validation
    if (!name || !email || !password) {
      return res.status(400).send({
        error: "Name, email, and password are required",
      });
    }
    if (!phone) {
      return res.send({
        error: "Phone number is required",
      });
    }

    //check user
    const existingUser = await userModel.findOne({ email });
    // existing user
    if (existingUser && existingUser.status === "Active") {
      return res.status(200).send({
        success: true,
        message: "User already exists",
      });
    }

    //register user
    const hashedPassword = await hashPassword(password);

    //save
    const user = await new userModel({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      role,
      answer,
      status: "Active",
    }).save();

    //if user already invited in the teamspace then add user id in that document

    //update the user id in the teamspace
    const filter = { type: "teamspace", "accessUsers.email": email };
    const update = {
      $set: {
        "accessUsers.$[elem].userId": user._id,
      },
    };
    const options = { arrayFilters: [{ "elem.email": email }] };

    const updateDocuments = await documentsModel.updateMany(
      filter,
      update,
      options
    );

    console.log("updateDocuments", updateDocuments);
    // Update the user ID in the access collection
    const accessCollection = await accessSchema.updateMany(
      { userEmail: email },
      { userId: user._id }
    );

    res.status(200).send({
      success: true,
      message: "User register successfully.",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while registering",
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Validation
    if (!email || !password) {
      return res.status(400).send({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Check if user exists and is active

    const user = await userModel.findOne({ email });
    if (!user || user.status === "Deactive") {
      return res.status(404).send({
        success: false,
        message: "Email is not registered or account is deactivated.",
      });
    }
    let passwordMatch = await comparePassword(password, user.password);

    if (!passwordMatch) {
      return res.status(401).send({
        success: false,
        message: "Invalid password.",
      });
    }

    //
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id
    );
    // user.refreshToken = refreshToken;
    // user.save();
    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .send({
        success: true,
        message: "Login successful.",
        user: {
          ...user.toObject(),
          details: user.details,
          accessToken,
        },
        accessToken,
        refreshToken,
      });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "An error occurred while logging in.",
      error,
    });
  }
};

export const loginControllerForGoogle = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized",
      });
    }
    const user = await userModel
      .findOne({ email: req.user.email })
      .select("-createdAt -updatedAt -__v -password");
    console.log("User after google login: ", user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id
    );
    const options = {
      httpOnly: true,
      secure: true,
    };

    // console.log("token: ", token, user);
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .send({
        success: true,
        message: "Login successful.",
        user: {
          ...user.toObject(),
          details: user.details,
          accessToken,
        },
        accessToken,
        refreshToken,
      });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "An error occurred while login",
      error,
    });
  }
};
export const logoutUser = asyncHandler(async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).send({
        message: "User id is required",
        success: false,
      });
    }
    await userModel.findByIdAndUpdate(
      id,
      {
        $unset: {
          refreshToken: 1, // this removes the field from document
        },
      },
      {
        new: true,
      }
    );

    const options = {
      httpOnly: true,
      secure: true,
      path: "/",
    };

    res
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .clearCookie("connect.sid", options);

    return res.status(200).send({
      message: "Logout successful.",
      success: true,
    });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(500).send({
      message: "An error occurred during logout",
      success: false,
    });
  }
});

export const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel
      .findOne({ email })
      .select("-createdAt -updatedAt -__v -password");
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }
    //token
    const token = await JWT.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      }
    );

    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_NODEMAILER,
        pass: process.env.PASS_NODEMAILER,
      },
    });

    var mailOptions = {
      from: process.env.EMAIL_NODEMAILER,
      to: email,
      subject: "Reset Password Link",
      // html: `<p>Click <a href="${process.env.RESET_PASSWORD_REDIRECT}/${user._id}/${token}">here</a> to reset your password</p>`,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="display:flex ;align-items: center;justify-content: space-around;">
    <img src="https://www.notion.so/images/favicon.ico" alt="Notion Logo" style="display: block; margin: 0 auto; width: 50px;">
    <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
    </div>
      <p style="color: #666;">Hello ${user.name},</p>
      <p style="color: #666;">You have requested to reset your password. Click the link below to reset your password:</p>
      <p style="text-align: center; margin-top: 20px;">
        <a href="${process.env.RESET_PASSWORD_REDIRECT}/${user._id}/${token}" style="background-color: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      </p>
      <p style="color: #666; margin-top: 20px;">If you did not request this, please ignore this email.</p>
    </div>
  `,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        return res.status(500).json({
          success: false,
          message: "An error occurred while sending the reset password link.",
          error: error.message,
        });
      } else {
        return res.status(200).json({
          success: true,
          message: "Reset password link sent to your email.",
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while processing the forgot password request.",
      error: error.message,
    });
  }
};

export const resetPasswordController = async (req, res) => {
  try {
    const { id, token } = req.params;
    const { password } = req.body;
    if (!id || !token || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request. Please provide user ID, token, and new password.",
      });
    }
    const { err, decoded } = await JWT.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token.",
        error: err,
      });
    }

    //register user
    const hashedPassword = await hashPassword(password);

    //save
    const user = await userModel.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true, select: "-createdAt -updatedAt -__v -password" }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    console.log("user details", user);

    return res.status(200).json({
      success: true,
      message: "User password reset successfully.",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while resetting the password.",
      error: error.message,
    });
  }
};
const isValidPassword = (password) => {
  return password && password.length >= 4;
};
export const changedPasswordController = async (req, res) => {
  try {
    const { password } = req.body;
    const { id } = req.user;
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Invalid password. Password must be at least 4 characters.",
      });
    }
    // Hash the password
    const hashedPassword = await hashPassword(password);
    // Update user password
    const user = await userModel.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true, select: "-createdAt -updatedAt -__v -password" }
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User password changed successfully.",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while changing the password.",
      error: error.message,
    });
  }
};
