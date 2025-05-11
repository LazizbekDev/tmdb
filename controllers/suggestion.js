import MovieModel from "../model/MovieModel.js";
import SeriesModel from "../model/SeriesModel.js";
import User from "../model/User.js";
import { adminNotifier } from "../utilities/admin_notifier.js";
import { extractGenres, getRandomContent } from "../utilities/utilities.js";

export const suggestMovie = async (bot, userId) => {
  try {
    const user = await User.findOne({ telegramId: userId });
    if (!user) return;

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

      // Agar film topilmasa, serialdan izlaymiz
      if (!content) {
        const series = await SeriesModel.findOne({
          _id: { $nin: [...suggestedIds, ...accessedIds] },
          keywords: { $elemMatch: { $regex: genreRegex } },
        }).sort({ views: -1 });

        if (series) content = { type: "series", data: series };
      }
    }

    // Agar content topilmasa (yangi user yoki tag topilmadi) — random fallback
    if (!content) {
      content = await getRandomContent([...suggestedIds, ...accessedIds]);
      if (!content) return; // umuman content yo‘q bo‘lsa
    }

    const item = content.data;
    const genres = (
      sortedGenres.length ? sortedGenres : extractGenres(item.keywords)
    )
      .slice(0, 5) // faqat eng ko‘p 5 tasini
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
                callback_data: `show_teaser_${item._id}`,
              },
              {
                text: "🍿 Watch Now",
                url: `https://t.me/${process.env.BOT_USERNAME}?start=${item._id}`,
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
  }
};
