import mongoose from "mongoose";
import Series from "./model/SeriesModel.js";

export const connect = async (URI) => {
    try {
        const res = await mongoose.connect(URI);
        await Series.updateMany(
            { accessedBy: { $exists: false } }, // Check if 'accessedBy' doesn't exist
            { $set: { accessedBy: [] } }       // Add 'accessedBy' with an empty array
        );
        console.log("Initialized 'accessedBy' field for movies without it.");

        await Series.updateMany(
            { views: { $exists: false } },     // Check if 'views' doesn't exists
            { $set: { views: 0 } }            // Add 'views' with a default value of 0
        );
        console.log("Initialized 'views' field for movies without it.");
        console.log(`DB: ${res.connection.host}`);
    } catch (err) {
        console.log(err);
    }
}