import mongoose from "mongoose";

const accessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    userEmail: {
      type: String,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    teamspaces: [
      {
        teamspaceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "document",
        },
        access: {
          type: String,
        },
        isGuest: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("access", accessSchema);
