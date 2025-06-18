import mongoose from "mongoose";
// import Movies from "./model/MovieModel.js";
// import Series from "./model/SeriesModel.js";
// import { cleanText } from "./utilities/utilities.js";

export const connect = async (URI) => {
  try {
    const res = await mongoose.connect(URI);

    console.log(`DB connected to: ${res.connection.host}`);
    return res.connection;
  } catch (err) {
    console.error("Database connection error:", err);
  }
};
