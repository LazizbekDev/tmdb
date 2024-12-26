import mongoose from "mongoose";

const SeriesSchema = new mongoose.Schema({
    name: String,
    caption: String,
    keywords: [String],
    teaser: String,
    series: [
        {
            seasonNumber: String,
            episodes: [
                {
                    episodeNumber: String,
                    fileId: String,
                },
            ],
        },
    ],
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
export default mongoose.model("Series", SeriesSchema);
