import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    image: String,
    logo: String,
    title: {
      type: String,
      default: "Notion App",
    },
    password: String,
    phone: String,
    address: String,
    answer: {
      type: String,
      default: "Please enter your answer",
    },
    role: {
      type: [String],
      enum: ["User", "Admin"],
      default: ["User"],
    },
    googleId: String,
    cloudinary_id: String,
    status: {
      type: String,
      default: "Active",
    },
    theme: {
      type: String,
      default: "system",
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
// Create a virtual field 'details' that combines 'name', 'email', and 'phone'
userSchema.virtual("details").get(function () {
  return `${this.name} 
    ,${this.email ? this.email : ""},
    ${this.phone ? this.phone : ""} 
  `;
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export default mongoose.model("users", userSchema);
