import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    username: { type: String, required: false },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    replied: { type: Boolean, default: false },
});

const Feedback = mongoose.model("Feedback", FeedbackSchema);
export default Feedback;
