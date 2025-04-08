import MovieModel from "../model/MovieModel.js";
import User from "../model/User.js";

export const suggestMovie = async (bot, userId) => {
    try {
        const user = await User.findOne({ telegramId: userId });
        if (!user) return;

        const movie = await MovieModel.findOne({
            _id: { $nin: user.suggestedMovies },
        }).sort({ accessedBy: -1 });

        if (!movie) return;

        const message = await bot.telegram.sendMessage(
            userId,
            `🎥 <b>Suggested Movie:</b> ${movie.name}\n\n${movie.caption}`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "▶️ Show Teaser",
                                callback_data: `show_teaser_${movie._id}`,
                            },
                            {
                                text: "🍿 Watch Movie",
                                url: `https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}`,
                            },
                        ],
                    ],
                },
            }
        );

        user.suggestedMovies.push(movie._id);
        await user.save();

    } catch (error) {
        console.error("Error suggesting movie:", error);
    }
};
