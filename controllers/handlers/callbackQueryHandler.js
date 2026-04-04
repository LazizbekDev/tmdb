import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import User from "../../model/User.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { getMovieById, sendUpdateMessage } from "../../utilities/updateFilm.js";
import { extractGenres, handlePagination, checkIsAdmin, findContentById, getWatchlistToggleButton } from "../../utilities/utilities.js";
import { generateHeader } from "../list/formatList.js";

export function handleCallbackQueries(bot) {
  bot.on("callback_query", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const messageId = ctx.callbackQuery.message.message_id;
    const chatId = ctx.callbackQuery.message.chat.id;

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
        await ctx.telegram.sendMessage(process.env.ADMIN_ID, adminMessage, { parse_mode: "HTML" });
      } else if (callbackData.startsWith("show_")) {
        const parts = callbackData.split("_");
        const userIdToQuery = parts[1];
        const pageNum = parseInt(parts[2]);

        if (!userIdToQuery || isNaN(pageNum)) {
          return ctx.answerCbQuery("Noto‘g‘ri so‘rov.");
        }

        if (!checkIsAdmin(ctx)) {
          return ctx.answerCbQuery("Sizda bu amalni bajarish uchun ruxsat yo‘q.", { show_alert: true });
        }

        const query = { accessedBy: userIdToQuery };
        const showHeader = (moviesCount, seriesCount) =>
          `<b>Foydalanuvchi (ID: ${userIdToQuery}) ko‘rgan kontent</b>\nFilmlar: ${moviesCount} | Seriallar: ${seriesCount}\n\n`;

        await handlePagination(ctx, bot, pageNum, Movie, Series, 10, query, `show_${userIdToQuery}_`, showHeader);

      } else if (callbackData.startsWith("page_")) {
        const pageNum = parseInt(callbackData.split("_")[1]);
        if (!isNaN(pageNum)) {
          await handlePagination(ctx, bot, pageNum, Movie, Series, 10, {}, "page_", generateHeader);
        } else {
          await ctx.answerCbQuery();
        }
      } else if (callbackData.startsWith("watch_list_")) {
        const pageNum = parseInt(callbackData.split("_")[2]);
        if (isNaN(pageNum)) {
           return ctx.answerCbQuery();
        }
        const user = await User.findOne({ telegramId: userId.toString() });
        if (!user || !user.savedMovies || user.savedMovies.length === 0) {
           return ctx.answerCbQuery("Sizda saqlangan kontent yo‘q.", { show_alert: true });
        }
        const query = { _id: { $in: user.savedMovies } };
        await handlePagination(ctx, bot, pageNum, Movie, Series, 10, query, "watch_list_", generateHeader);

      } else if (callbackData.startsWith("reveal_teaser_")) {
        const movieId = callbackData.split("reveal_teaser_")[1];
        const movie = await findContentById(Movie, Series, movieId);

        if (!movie) {
          return ctx.answerCbQuery("Movie or series not found.");
        }

        const genres = extractGenres(movie.keywords).map((g) => `#${g}`).join(" ");
        const label = movie.__t === "Series" ? "🎬 Suggested Series" : "🎥 Suggested Movie";
        const fullCaption = `${label}: <b>${movie.name}</b>\n\n${movie.caption}\n\n🎭 <b>Genres:</b> ${genres}`;

        await bot.telegram.editMessageMedia(
          ctx.from.id,
          messageId,
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
                [{ text: "🍿 Watch Now", url: `https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}` }],
                [{ text: "📌 add to Watch List", callback_data: `save_later_${movie._id}` }]
              ],
            },
          }
        );
        await ctx.answerCbQuery();
      } else if (callbackData.startsWith("delete_")) {
        const movieId = callbackData.split("delete_")[1];
        if (!checkIsAdmin(ctx)) {
          return ctx.answerCbQuery("You do not have permission to delete.", { show_alert: true });
        }

        ctx.session.step = `awaitingDelete_${movieId}`;
        const movie = await Movie.findById(movieId);
        if (!movie) {
          return ctx.answerCbQuery("Movie not found.", { show_alert: true });
        }

        await ctx.answerCbQuery(`You are about to delete: ${movie.name}`);
        await ctx.reply(
          `Please enter "<code>sudo delete ${movie.name}</code>" to confirm deletion.\nTo cancel the process, type <code>CANCEL</code>`,
          { parse_mode: "HTML" }
        );
      } else if (callbackData.startsWith("update_")) {
        await ctx.answerCbQuery();
        const movieId = callbackData.split("update_")[1];
        if (!checkIsAdmin(ctx)) {
          return ctx.answerCbQuery("You do not have permission to update.", { show_alert: true });
        }

        ctx.session.step = "name_input";
        ctx.session.targetMovieId = movieId;

        const updateMovie = await getMovieById(movieId);
        ctx.session.updateFields = {
           name: updateMovie.name,
           description: updateMovie.caption,
           movieUrl: updateMovie.movieUrl,
           teaser: updateMovie.teaser,
           keywords: updateMovie.keywords,
           fileType: updateMovie.fileType,
           size: updateMovie.size,
           duration: updateMovie.duration
        };

        await sendUpdateMessage(ctx, "Please choose an option for the movie name or enter a new name:", movieId, "name");
      } else if (callbackData.startsWith("leave_name_")) {
        await ctx.answerCbQuery();
        ctx.session.step = "description_input";
        await sendUpdateMessage(ctx, "Please choose an option for the description or enter a new description:", ctx.session.targetMovieId, "description");
      } else if (callbackData.startsWith("leave_description_")) {
        await ctx.answerCbQuery();
        ctx.session.step = "update_film";
        await sendUpdateMessage(ctx, "Please choose an option for the film or send new Film:", ctx.session.targetMovieId, "film");
      } else if (callbackData.startsWith("leave_film_")) {
        await ctx.answerCbQuery();
        ctx.session.step = "update_teaser";
        await sendUpdateMessage(ctx, "Please choose an option for the Film or send new film to update", ctx.session.targetMovieId, "teaser");
      } else if (callbackData.startsWith("leave_teaser_")) {
        await ctx.answerCbQuery();
        ctx.session.step = "keywords_input";
        await sendUpdateMessage(ctx, "Please choose an option for the teaser or send new teaser video to update:", ctx.session.targetMovieId, "keywords");
      } else if (callbackData.startsWith("leave_keywords_")) {
        await ctx.answerCbQuery();
        delete ctx.session.step;
        await sendUpdateMessage(ctx, "Update complete! Press to save changes:", ctx.session.targetMovieId, "save");
      } else if (callbackData.startsWith("save_later_")) {
        const movieId = callbackData.split("save_later_")[1];
        const movie = await findContentById(Movie, Series, movieId);
        if (!movie) {
          return ctx.answerCbQuery("Movie not found.");
        }

        const user = await User.findOne({ telegramId: userId });
        if (!user) {
          return ctx.answerCbQuery("User not found.");
        }

        user.savedMovies = user.savedMovies || [];
        if (!user.savedMovies.includes(movieId)) {
          user.savedMovies.push(movieId);
          await user.save();
          await ctx.answerCbQuery("Movie saved for later viewing.");
          await ctx.telegram.editMessageReplyMarkup(chatId, messageId, null, getWatchlistToggleButton(movieId, true));
        } else {
          await ctx.answerCbQuery("This movie is already saved.");
        }
      } else if (callbackData.startsWith("remove_later_")) {
        const movieId = callbackData.replace("remove_later_", "");
        const user = await User.findOne({ telegramId: userId });

        if (!user) {
          return ctx.answerCbQuery("User not found.");
        }

        if (user.savedMovies && user.savedMovies.includes(movieId)) {
          await User.updateOne({ telegramId: userId }, { $pull: { savedMovies: movieId } });
          await ctx.answerCbQuery("Removed from Watch List!");
          await ctx.telegram.editMessageReplyMarkup(chatId, messageId, null, getWatchlistToggleButton(movieId, false));
        } else {
          await ctx.answerCbQuery("This movie is not in your watchlist.");
        }
      } else if (callbackData.startsWith("save_")) {
        await ctx.answerCbQuery();
        const movieId = callbackData.split("save_")[1];
        const updateMovie = await getMovieById(movieId);
        const fields = ctx.session.updateFields || {};

        updateMovie.name = fields.name;
        updateMovie.caption = fields.description;
        updateMovie.movieUrl = fields.movieUrl || updateMovie.movieUrl;
        updateMovie.fileType = fields.fileType || updateMovie.fileType;
        updateMovie.size = fields.size || updateMovie.size;
        updateMovie.duration = fields.duration || updateMovie.duration;
        updateMovie.teaser = fields.teaser || updateMovie.teaser;
        updateMovie.keywords = fields.keywords || updateMovie.keywords;
        
        await updateMovie.save();
        await ctx.reply(`Movie "${updateMovie.name}" updated successfully!`, {
          parse_mode: "HTML",
          reply_markup: { remove_keyboard: true },
        });
        delete ctx.session.step;
        delete ctx.session.updateFields;
        delete ctx.session.targetMovieId;
      }
    } catch (error) {
      console.error("Error handling callback query:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Callback query handling error");
    }
  });
}
