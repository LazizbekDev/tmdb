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
    await Movies.syncIndexes();
    console.log("Movies yangilandi!");

    // Series larni yangilash
    await Series.syncIndexes();
    // Log current indexes
    // const indexes = await Movies.collection.getIndexes();
    // console.log("Current Indexes:", indexes);

    console.log(`DB connected to: ${res.connection.host}`);
  } catch (err) {
    console.error("Database connection error:", err);
  }
};
