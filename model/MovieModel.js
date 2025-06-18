import mongoose from "mongoose";
import { cleanText } from "../utilities/utilities.js";

const movieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cleanedName: { type: String, required: true, index: true }, // Qo‘shilgan maydon
  keywords: [{ type: String }],
  cleanedKeywords: [{ type: String, index: true }], // Qo‘shilgan maydon
  caption: { type: String },
  teaser: { type: String },
  fileType: { type: String },
  size: { type: String },
  duration: { type: String },
  views: { type: Number, default: 0 },
  movieUrl: { type: String },
  filmpath: { type: String, required: false },
  teaserpath: { type: String, required: false },
  accessedBy: { type: [String], default: []}
});

movieSchema.index({ name: "text", keywords: "text" }); // Text search uchun
// Pre-save hook bilan tozalash
movieSchema.pre("save", function (next) {
  this.cleanedName = cleanText(this.name);
  this.cleanedKeywords = this.keywords.map(cleanText);
  next();
});

const Movie = mongoose.model("Movie", movieSchema);
export default Movie;
