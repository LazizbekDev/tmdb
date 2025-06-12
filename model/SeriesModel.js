import mongoose from "mongoose";
import { cleanText } from "../utilities/utilities.js";

const SeriesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cleanedName: { type: String, required: true, index: true }, // Qo‘shilgan tozalangan nom
  caption: String,
  keywords: [String],
  cleanedKeywords: [{ type: String, index: true }], // Qo‘shilgan tozalangan kalit so‘zlar
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
  },
});

// Pre-save hook bilan tozalash
SeriesSchema.pre("save", function (next) {
  this.cleanedName = cleanText(this.name);
  this.cleanedKeywords = this.keywords.map(cleanText);
  next();
});


export default mongoose.model("Series", SeriesSchema);