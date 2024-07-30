import mongoose from "mongoose";

const pageSchema = new mongoose.Schema({
  content: {
    type: String,
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "document",
    required: true,
  },
});

export default mongoose.model("page", pageSchema);
