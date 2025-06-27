import MovieModel from "../model/MovieModel.js";
import SeriesModel from "../model/SeriesModel.js";
import User from "../model/User.js";
import { adminNotifier } from "../utilities/admin_notifier.js";
import { extractGenres, getRandomContent } from "../utilities/utilities.js";

export const suggestMovie = async (bot, userId) => {
  try {
    let user = await User.findOne({ telegramId: userId });
    if (!user) return;
    
    // Agar foydalanuvchi inActive bo'lsa, tavsiya yuborilmaydi
    if (user.inActive) {
      console.log(`🚫 Foydalanuvchi ${userId} inActive holatda, tavsiya yuborilmaydi`);
      return;
    }

    const accessedIds = user.accessedMovies || [];
    const suggestedIds = user.suggestedMovies || [];

    const accessedMovies = await MovieModel.find({ _id: { $in: accessedIds } });

    const keywordCount = {};

    for (const movie of accessedMovies) {
      const genres = extractGenres(movie.keywords);
      for (const genre of genres) {
        keywordCount[genre] = (keywordCount[genre] || 0) + 1;
      }
    }

    const sortedGenres = Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    let content = null;

    if (sortedGenres.length) {
      const genreRegex = new RegExp(`#(${sortedGenres.join("|")})`, "i");

      const movie = await MovieModel.findOne({
        _id: { $nin: [...suggestedIds, ...accessedIds] },
        keywords: { $elemMatch: { $regex: genreRegex } },
      }).sort({ views: -1 });

      if (movie) content = { type: "movie", data: movie };

      if (!content) {
        const series = await SeriesModel.findOne({
          _id: { $nin: [...suggestedIds, ...accessedIds] },
          keywords: { $elemMatch: { $regex: genreRegex } },
        }).sort({ views: -1 });

        if (series) content = { type: "series", data: series };
      }
    }

    if (!content) {
      content = await getRandomContent([...suggestedIds, ...accessedIds]);
      if (!content) return;
    }

    const item = content.data;
    const genres = (
      sortedGenres.length ? sortedGenres : extractGenres(item.keywords)
    )
      .slice(0, 5)
      .map((g) => `#${g}`)
      .join(" ");
    const label =
      content.type === "series" ? "🎬 Suggested Series" : "🎥 Suggested Movie";
    
    await bot.telegram.sendMessage(
      userId,
      `${label}: <b>${item.name}</b>\n\n${item.caption}\n\n🎭 <b>Your type:</b> ${genres}`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "▶️ Show Teaser",
                callback_data: `reveal_teaser_${item._id}`,
              },
              {
                text: "🍿 Watch Now",
                url: `https://${process.env.BOT_USERNAME}?start=${item._id}`,
              },
            ],
          ],
        },
      }
    );

    user.suggestedMovies.push(item._id);
    await user.save();
  } catch (error) {
    await adminNotifier(bot, error, null, "suggestMovie");
    console.error("Error suggesting movie:", error);
    if (error.code === 403) { // Forbidden - bot blocklangan
      const user = await User.findOne({ telegramId: userId });
      if (user) {
        user.inActive = true;
        await user.save();
      }
    }
  }
};