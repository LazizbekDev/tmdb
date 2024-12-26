import mongoose from "mongoose";

const movieSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    caption: {
        type: String,
        required: true,
    },
    movieUrl: {
        type: String,
        required: true,
    },
    keywords: {
        type: [String],
        required: true,
    },
    fileType: {
        type: String,
        required: true,
    },
    teaser: {
        type: String,
        required: true,
    },
    size: {
        type: String,
        required: true,
    },
    duration: {
        type: String,
        required: true,
    },
    views: {
        type: Number,
        default: 0,
    },
    accessedBy: {
        type: [String],
        required: true,
        unique: true,
    },
});

export default mongoose.model("Movie", movieSchema);
