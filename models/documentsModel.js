import mongoose from "mongoose";

const documentsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "page",
    },
    parentDocument: {
      type: String,
    },
    // teamspace: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "document",
    // },
    type: {
      type: String,
    },
    favorites: {
      type: Array,
    },
    teamspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "document",
    },
    content: {
      type: String,
    },
    description: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    icon: {
      type: String,
    },
    isPublished: {
      type: Boolean,
    },
    isPrivate:{
      type: Boolean,
      default: false,
    },
    cloudinary_id: {
      type: String,
    },
    defaultAccess: {
      type: String,
      enum: ["fullAccess", "canEdit", "canView"],
      default: "canView",
    },
    accessUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        email: {
          type: String,
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

export default mongoose.model("document", documentsSchema);
