import MovieModel from "../model/MovieModel.js";
import User from "../model/User.js";

// Hashtaglardan toza genre'larni chiqarish
function extractGenres(keywords) {
  const tags = [];

  for (const kw of keywords || []) {
    const matches = kw.match(/#[^\s#]+/g); // #tag larni topadi
    if (matches) {
      for (const tag of matches) {
        const clean = tag.replace("#", "").trim();
        if (clean && !tags.includes(clean)) {
          tags.push(clean);
        }
      }
    }
  }

  return tags;
}

export const suggestMovie = async (bot, userId) => {
  try {
    const user = await User.findOne({ telegramId: userId });
    if (!user) return;

    const accessedIds = user.accessedMovies || [];
    const suggestedIds = user.suggestedMovies || [];

    const accessedMovies = await MovieModel.find({ _id: { $in: accessedIds } });

    // Keyword statistikasi
    const keywordCount = {};

    for (const movie of accessedMovies) {
      const genres = extractGenres(movie.keywords);
      for (const genre of genres) {
        keywordCount[genre] = (keywordCount[genre] || 0) + 1;
      }
    }

    // Eng ko‘p uchragan taglar bo‘yicha saralash
    const sortedGenres = Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    if (sortedGenres.length === 0) return;
    console.log("Sorted Genres:", sortedGenres);

    // Tavsiya qilinmagan, ko‘rilmagan, lekin shu taglardan birortasi bor filmlarni topamiz
    const movie = await MovieModel.findOne({
      _id: { $nin: [...suggestedIds, ...accessedIds] },
      keywords: {
        $elemMatch: {
          $regex: new RegExp(`#(${sortedGenres.join("|")})`, "i"),
        },
      },
    }).sort({ views: -1 });

    if (!movie) return;

    // Yuborish
    await bot.telegram.sendMessage(
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
