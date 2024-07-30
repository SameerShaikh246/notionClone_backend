import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { ApiError } from "../utils/ApiError.js";

// protected routes

export const requireSignIn = async (req, res, next) => {
  try {
    const token = req.header("Authorization") || req.cookies?.accessToken;
    // console.log(token);
    if (!token) {
      throw new ApiError(401, "Unauthorized request or invalid token.");
    }
    const decode = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // console.log("useruser decode 1", decode, req.cookies?.accessToken);
    req.user = decode;

    next();
  } catch (error) {
    // console.log("requireSignIn error : ", error);
    res
      .status(401)
      .send({ success: false, message: "Token Expired", error: error });
  }
};

// export const requireSignInLogout = async (req, res, next) => {
//   try {
//     const token = req.header("Authorization") || req.cookies?.accessToken;

//     if (!token) {
//       throw new ApiError(401, "Unauthorized request or invalid token.");
//     }

//     let decodedToken;
//     try {
//       decodedToken = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET);
//     } catch (error) {
//       if (error.name === "TokenExpiredError") {
//         // Token has expired, try to extract user ID from the payload
//         console.log("error", error?.expiredAt);
//         if (error?.data?._id) {
//           req.user = { id: error.data._id }; // Set the user ID in the request object
//           return next();
//         } else {
//           throw new ApiError(401, "Expired token without user ID");
//         }
//       } else {
//         throw error;
//       }
//     }

//     if (!decodedToken._id) {
//       throw new ApiError(401, "Invalid token format. User ID not found.");
//     }

//     req.user = decodedToken; // Set the user ID in the request object

//     next();
//   } catch (error) {
//     res.status(401).send({
//       success: false,
//       message: "Token Expired or Invalid",
//       error: error,
//     });
//   }
// };

// admin access

export const requireAdmin = async (req, res, next) => {
  try {
    const decode = JWT.verify(
      req.headers.authorization,
      process.env.ACCESS_TOKEN_SECRET
    );
    req.user = decode;
    const user = await userModel.findById(decode.id);
    if (user?.role !== "admin") {
      return res
        .status(401)
        .send({ success: false, message: "Unautorized access." });
      // return  res.status(200).send({ ok: false });
    } else {
      next();
    }
  } catch (error) {
    res.status(401).send({
      success: false,
      error,
      message: "Error in admin middelware",
    });
  }
};

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};
