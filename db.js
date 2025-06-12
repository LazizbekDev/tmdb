import mongoose from "mongoose";
import Movies from "./model/MovieModel.js";
import Series from "./model/SeriesModel.js";
import { cleanText } from "./utilities/utilities.js";

export const connect = async (URI) => {
  try {
    const res = await mongoose.connect(URI);

    // // Update documents to set accessedBy as an empty array if it exists
    // await Movies.updateMany(
    //     { accessedBy: { $exists: true } }, // Find documents where accessedBy is set
    //     { $set: { accessedBy: [] } }      // Set accessedBy to an empty array
    // );
    // const movies = await Movies.find();
    // for (const movie of movies) {
    //   movie.cleanedName = cleanText(movie.name);
    //   movie.cleanedKeywords = movie.keywords.map(cleanText);
    //   await movie.save();
    // }
    // console.log("Movies yangilandi!");

    // Series larni yangilash
    // const series = await Series.find();
    // for (const seriesDoc of series) {
    //   seriesDoc.cleanedName = cleanText(seriesDoc.name);
    //   seriesDoc.cleanedKeywords = seriesDoc.keywords.map(cleanText);
    //   await seriesDoc.save();
    // }
    // console.log("Series yangilandi!");

    // Log current indexes
    // const indexes = await Movies.collection.getIndexes();
    // console.log("Current Indexes:", indexes);

    console.log(`DB connected to: ${res.connection.host}`);
  } catch (err) {
    console.error("Database connection error:", err);
  }
};
