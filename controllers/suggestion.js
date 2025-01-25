import MovieModel from "../model/MovieModel.js";
import User from "../model/User.js";

export const suggestMovie = async (bot, userId) => {
    try {
        const user = await User.findOne({ telegramId: userId });

        if (!user) {
            console.log(`No suitable movie found for user ${userId}.`);
            return;
        }

        // Find a suitable movie (not already accessed by the user)
        const movie = await MovieModel.findOne({
            _id: { $nin: user.suggestedMovies },
        }).sort({ accessedBy: -1 });

        if (!movie) {
            console.log(`No suitable movie found for user ${userId}.`);
            return;
        }

        // Suggest the movie to the user
        await bot.telegram.sendMessage(
            userId,
            `🎥 Suggested Movie: ${movie.name}\n\n${movie.caption}`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Watch Now",
                                url: `https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}`,
                            },
                        ],
                    ],
                },
            }
        );

        // Update user's suggestedMovies list
        user.suggestedMovies.push(movie._id);
        await user.save();

        console.log(`Suggested movie "${movie.name}" to user ${userId}.`);
    } catch (error) {
        console.error(`Error suggesting movie to user ${userId}:`, error);
    }
};
