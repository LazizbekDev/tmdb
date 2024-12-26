import mongoose from "mongoose";
// import Series from "./model/SeriesModel.js";

export const connect = async (URI) => {
    try {
        const res = await mongoose.connect(URI);
        console.log(`DB: ${res.connection.host}`);
    } catch (err) {
        console.log(err);
    }
}