import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { extractGenres } from "../../utilities/utilities.js";

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