import mongoose from "mongoose";
import User from "./model/User.js";

export const connect = async (URI) => {
    try {
        const res = await mongoose.connect(URI);
        await User.updateMany(
            { leftTheBot: { $exists: false } }, // Target users where the 'leftTheBot' field doesn't exist
            { $set: { leftTheBot: false } } // Set the 'leftTheBot' field to false
        );

        console.log(`DB: ${res.connection.host}`);
    } catch (err) {
        console.log(err);
    }
};
