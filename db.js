import mongoose from "mongoose";

export const connect = async (URI) => {
  try {
    const res = await mongoose.connect(URI);

    console.log(`DB connected to: ${res.connection.host}`);
    return res.connection;
  } catch (err) {
    console.error("Database connection error:", err);
  }
};
