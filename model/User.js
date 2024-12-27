import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
        unique: true,
    },
    accessCount: {
        type: Number,
        default: 0,  // Tracks how many movies they have accessed
    },
    lastAccessed: {
        type: Date,
        default: Date.now,  // Optionally track when they last accessed a movie
    },
    isSubscribed: {
        type: Boolean,
        default: false,  // Track whether they've joined the channel or not
    },
    leftTheBot: {
        type: Boolean,
        default: false,
    }
});

const User = mongoose.model('User', userSchema);

export default User;