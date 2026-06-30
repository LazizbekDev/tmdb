import MovieModel from "#model/MovieModel.js";
import SeriesModel from "#model/SeriesModel.js";
import User from "#model/User.js";
import { adminNotifier } from "#utilities/admin_notifier.js";
import { extractGenres } from "#utilities/utilities.js";

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
    const savedIds = user.savedMovies || [];

    // Barcha qiziqarli ID'larni yig'ish (accessed + saved)
    const allInterestIds = [...new Set([...accessedIds, ...savedIds])];

    // Faqat keywords maydonini olish uchun optimallashtirilgan so'rov
    const interestMovies = await MovieModel.find(
      { _id: { $in: allInterestIds } },
      { keywords: 1 }
    );

    const interestSeries = await SeriesModel.find(
      { _id: { $in: allInterestIds } },
      { keywords: 1 }
    );

    // Janrlar bo'yicha vaznli hisoblash
    const keywordCount = {};
    [...interestMovies, ...interestSeries].forEach(item => {
      const genres = extractGenres(item.keywords);
      genres.forEach(genre => {
        keywordCount[genre] = (keywordCount[genre] || 0) + 1;
      });
    });

    const sortedGenres = Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Eng muhim 5 ta janrni olish (ko'proq variant uchun)
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
          teaser: { $exists: true, $ne: "" } // Teaser borligini tekshirish
        })
          .sort({ views: -1 })
          .select("name caption keywords year rating teaser"); // teaser qo'shildi

        if (movie) {
          content = { type: "movie", data: movie };
          break;
        }

        // Seriallarni qidirish
        const series = await SeriesModel.findOne({
          _id: { $nin: [...suggestedIds, ...accessedIds] },
          keywords: { $elemMatch: { $regex: genreRegex } },
          teaser: { $exists: true, $ne: "" }
        })
          .sort({ views: -1 })
          .select("name caption keywords year rating teaser");

        if (series) {
          content = { type: "series", data: series };
          break;
        }

        attemptCount++;
      }
    }

    // Agar janr bo'yicha topilmasa, tasodifiy kontent (lekin teaser bilan)
    if (!content) {
      // Tasodifiy kontent tanlashda ham teaser borligini tekshiramiz
      const randomMovie = await MovieModel.findOne({
        _id: { $nin: [...suggestedIds, ...accessedIds] },
        teaser: { $exists: true, $ne: "" }
      }).sort({ views: -1 });

      if (randomMovie) {
        content = { type: "movie", data: randomMovie };
      } else {
        const randomSeries = await SeriesModel.findOne({
          _id: { $nin: [...suggestedIds, ...accessedIds] },
          teaser: { $exists: true, $ne: "" }
        }).sort({ views: -1 });

        if (randomSeries) {
          content = { type: "series", data: randomSeries };
        }
      }

      if (!content) {
        await bot.telegram.sendMessage(
          userId,
          "<b>😔 No new recommendations found.</b>\n\nTry exploring our /list to find something you like!",
          { parse_mode: "HTML" }
        );
        return;
      }
    }

    const item = content.data;
    const genres = extractGenres(item.keywords)
      .slice(0, 5)
      .map((g) => `#${g}`)
      .join(" ");

    const label = content.type === "series" ? "🎬 <b>Suggested Series</b>" : "🎥 <b>Suggested Movie</b>";
    const extraInfo = item.year ? ` (${item.year})` : "";
    const ratingInfo = item.rating ? ` ⭐ ${item.rating}/10` : "";

    const caption = `
${label}
🎬 <b>${item.name}${extraInfo}</b>
${ratingInfo}

${item.caption}

🎭 <b>Genres:</b> ${genres}

──────────────────
🍿 <i>Tap the button below to watch the full movie/series instantly!</i>`;

    // Teaserni birinchi bo'lib yuboramiz
    await bot.telegram.sendVideo(
      userId,
      item.teaser,
      {
        caption,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🍿 Watch Now",
                url: `https://t.me/${process.env.BOT_USERNAME}?start=${item._id}`,
              },
            ],
            [
              {
                text: "📌 Add to Watch List",
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