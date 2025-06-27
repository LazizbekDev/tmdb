import MovieModel from "../model/MovieModel.js";
import SeriesModel from "../model/SeriesModel.js";
import User from "../model/User.js";
import { adminNotifier } from "../utilities/admin_notifier.js";
import { extractGenres, getRandomContent } from "../utilities/utilities.js";

export const suggestMovie = async (bot, userId) => {
  try {
    // Foydalanuvchini topish
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      console.log(`🚫 Foydalanuvchi ${userId} topilmadi`);
      return;
    }

    // inActive foydalanuvchilarga tavsiya yuborilmaydi
    if (user.inActive) {
      console.log(`🚫 Foydalanuvchi ${userId} inActive holatda, tavsiya yuborilmaydi`);
      return;
    }

    const accessedIds = user.accessedMovies || [];
    const suggestedIds = user.suggestedMovies || [];

    // Faqat keywords maydonini olish uchun optimallashtirilgan so'rov
    const accessedMovies = await MovieModel.find(
      { _id: { $in: accessedIds } },
      { keywords: 1 }
    );

    // Janrlar bo'yicha vaznli hisoblash
    const keywordCount = {};
    for (const movie of accessedMovies) {
      const genres = extractGenres(movie.keywords);
      for (const genre of genres) {
        keywordCount[genre] = (keywordCount[genre] || 0) + 1;
      }
    }

    const sortedGenres = Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Eng muhim 3 ta janrni olish
      .map(([genre]) => genre);

    let content = null;
    let attemptCount = 0;
    const maxAttempts = 5; // Maksimal sinovlar soni

    // Janrlar bo'yicha tavsiya qidirish
    if (sortedGenres.length) {
      const genreRegex = new RegExp(`#(${sortedGenres.join("|")})`, "i");

      while (!content && attemptCount < maxAttempts) {
        // Filmlarni qidirish
        const movie = await MovieModel.findOne({
          _id: { $nin: [...suggestedIds, ...accessedIds] },
          keywords: { $elemMatch: { $regex: genreRegex } },
        })
          .sort({ views: -1 })
          .select("name caption keywords year rating"); // Qo'shimcha maydonlar

        if (movie) {
          content = { type: "movie", data: movie };
          break;
        }

        // Seriallarni qidirish
        const series = await SeriesModel.findOne({
          _id: { $nin: [...suggestedIds, ...accessedIds] },
          keywords: { $elemMatch: { $regex: genreRegex } },
        })
          .sort({ views: -1 })
          .select("name caption keywords year rating");

        if (series) {
          content = { type: "series", data: series };
          break;
        }

        attemptCount++;
      }
    }

    // Agar janr bo'yicha topilmasa, tasodifiy kontent
    if (!content) {
      content = await getRandomContent([...suggestedIds, ...accessedIds]);
      if (!content) {
        await bot.telegram.sendMessage(
          userId,
          "😔 Hozircha siz uchun yangi tavsiya topa olmadik. Keyinroq qayta urinib ko‘ring!",
          { parse_mode: "HTML" }
        );
        return;
      }
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
    
    // Qo'shimcha ma'lumotlar (yil va reyting)
    const extraInfo = item.year ? ` (${item.year})` : "";
    const ratingInfo = item.rating ? ` ⭐ ${item.rating}/10` : "";

    await bot.telegram.sendMessage(
      userId,
      `${label}: <b>${item.name}${extraInfo}</b>${ratingInfo}\n\n${item.caption}\n\n🎭 <b>Your type:</b> ${genres}`,
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
                url: `https://t.me/${process.env.BOT_USERNAME}?start=${item._id}`,
              },
            ],
            [
              {
                text: "📌 Keyinroq ko‘rish",
                callback_data: `save_later_${item._id}`,
              },
            ],
          ],
        },
      }
    );

    // Tavsiya qilingan kontentni saqlash
    user.suggestedMovies.push(item._id);
    await user.save();
  } catch (error) {
    await adminNotifier(bot, error, null, "suggestMovie");
    console.error("Error suggesting movie:", error);

    // Telegram API xatolarini boshqarish
    if (error.code === 403) {
      const user = await User.findOne({ telegramId: userId });
      if (user) {
        user.inActive = true;
        await user.save();
        console.log(`🚫 Foydalanuvchi ${userId} inActive holatga o‘tkazildi (403 xatosi)`);
      }
    } else if (error.code === 429) {
      console.log(`⚠️ Telegram API flood control xatosi, keyinroq qayta urinib ko‘ring`);
    }
  }
};