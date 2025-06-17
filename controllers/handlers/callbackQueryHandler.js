import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { extractGenres } from "../../utilities/utilities.js";
import formatList, { generateHeader, generatePaginationButtons } from "../list/formatList.js";

export function handleCallbackQueries(bot) {
  bot.on("callback_query", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    try {
      if (callbackData.startsWith("request_")) {
        const query = callbackData.replace("request_", "");
        await ctx.answerCbQuery(`✅ Your request for "${query}" has been submitted successfully!`);
        const adminMessage = `
🎥 <b>New Movie/Series Request</b>
▪️ <b>Requested Item:</b> ${query}
▪️ <b>From User:</b> ${ctx.from.first_name} (@${ctx.from.username || "No username"})
▪️ <b>User ID:</b> ${ctx.from.id}
        `;
        await ctx.telegram.sendMessage(process.env.ADMIN_ID, adminMessage, {
          parse_mode: "HTML",
        });
      } else if (callbackData.startsWith("show_")) {
        // Handle /show pagination (e.g., show_1622899126_page_2)
        const [, userId, , page] = callbackData.split("_");
        const userIdNum = parseInt(userId);
        const pageNum = parseInt(page);

        if (isNaN(userIdNum) || isNaN(pageNum)) {
          await ctx.answerCbQuery("Noto‘g‘ri so‘rov.");
          return;
        }

        if (ctx.from.id !== parseInt(process.env.ADMIN_ID)) {
          await ctx.answerCbQuery("Sizda bu amalni bajarish uchun ruxsat yo‘q.");
          return;
        }

        const limit = 10;
        const [movies, series, moviesCount, seriesCount] = await Promise.all([
          Movie.find({ accessedBy: userId })
            .sort({ _id: -1 })
            .skip((pageNum - 1) * limit)
            .limit(limit),
          Series.find({ accessedBy: userId })
            .sort({ _id: -1 })
            .skip((pageNum - 1) * limit)
            .limit(limit),
          Movie.countDocuments({ accessedBy: userId }),
          Series.countDocuments({ accessedBy: userId }),
        ]);

        if (moviesCount === 0 && seriesCount === 0) {
          await ctx.answerCbQuery(`Foydalanuvchi (ID: ${userId}) hech qanday kontent ko‘rmagan.`);
          return;
        }

        const totalPages = Math.ceil(Math.max(moviesCount, seriesCount) / limit);
        const header =
          pageNum === 1
            ? `<b>Foydalanuvchi (ID: ${userId}) ko‘rgan kontent</b>\n` +
              `Filmlar: ${moviesCount} | Seriallar: ${seriesCount}\n\n`
            : "";
        const content = header + formatList(movies, series, pageNum, limit);
        const paginationButtons = generatePaginationButtons(pageNum, totalPages, `show_${userId}_`);

        await ctx.telegram.editMessageText(
          ctx.chat.id,
          ctx.callbackQuery.message.message_id,
          undefined,
          content || "No content available for this page.",
          {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: paginationButtons },
          }
        );

        await ctx.answerCbQuery();
      } else if (callbackData.startsWith("page_")) {
        // Handle /list pagination
        const page = parseInt(callbackData.split("_")[1]);
        const limit = 10;

        const [movies, series, moviesCount, seriesCount] = await Promise.all([
          Movie.find({}).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit),
          Series.find({}).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit),
          Movie.countDocuments({}),
          Series.countDocuments({}),
        ]);

        const totalPages = Math.ceil(Math.max(moviesCount, seriesCount) / limit);
        const header = page === 1 ? generateHeader(moviesCount, seriesCount) : "";
        const content = header + formatList(movies, series, page, limit);
        const paginationButtons = generatePaginationButtons(page, totalPages);

        await ctx.telegram.editMessageText(
          ctx.chat.id,
          ctx.callbackQuery.message.message_id,
          undefined,
          content || "No content available for this page.",
          {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: paginationButtons },
          }
        );

        await ctx.answerCbQuery();
      } else if (callbackData.startsWith("show_teaser_")) {
        const movieId = callbackData.split("show_teaser_")[1];
        const movie = (await Movie.findById(movieId)) || (await Series.findById(movieId));

        if (!movie) {
          await ctx.answerCbQuery("Movie or series not found.");
          return;
        }

        const genres = extractGenres(movie.keywords).map((g) => `#${g}`).join(" ");
        const label = movie.__t === "Series" ? "🎬 Suggested Series" : "🎥 Suggested Movie";
        const fullCaption = `${label}: <b>${movie.name}</b>\n\n${movie.caption}\n\n🎭 <b>Genres:</b> ${genres}`;

        await bot.telegram.editMessageMedia(
          ctx.from.id,
          ctx.callbackQuery.message.message_id,
          undefined,
          {
            type: "video",
            media: movie.teaser,
            caption: fullCaption,
            parse_mode: "HTML",
          },
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🍿 Watch Now",
                    url: `https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}`,
                  },
                ],
              ],
            },
          }
        );

        await ctx.answerCbQuery();
      }
    } catch (error) {
      console.error("Error handling callback query:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Callback query handling error");
    }
  });
}