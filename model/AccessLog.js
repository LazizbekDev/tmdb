import mongoose from "mongoose";

const accessLogSchema = new mongoose.Schema({
  contentType: { type: String, enum: ["Movie", "Series"] },
  userId: String,
  contentId: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("AccessLog", accessLogSchema);
