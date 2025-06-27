import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true,
    },
    accessCount: {
        type: Number,
        default: 0, // Tracks how many movies they have accessed
    },
    lastAccessed: {
        type: Date,
        default: Date.now, // Optionally track when they last accessed a movie
    },
    suggestedMovies: {
        type: [String],
        default: [], // IDs of movies suggested to this user
    },
    accessedMovies: {
        type: [String],
        default: [], // IDs of movies the user has accessed
    },
    isSubscribed: {
        type: Boolean,
        default: false, // Track whether they've joined the channel or not
    },
    leftTheBot: {
        type: Boolean,
        default: false,
    },
    inActive: { type: Boolean, default: false },
    savedMovies: {
        type: [String],
        default: [], // IDs of movies the user has saved
    },
});

const User = mongoose.model("User", userSchema);

export default User;
