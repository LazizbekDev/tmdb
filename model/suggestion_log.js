// models/SuggestionLog.js
import mongoose from "mongoose";

const SuggestionLogSchema = new mongoose.Schema({
    lastRun: {
        type: Date,
        required: true,
    },
});

export default mongoose.model("SuggestionLog", SuggestionLogSchema);
