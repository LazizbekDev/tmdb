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
});
export default mongoose.model("Series", SeriesSchema);
