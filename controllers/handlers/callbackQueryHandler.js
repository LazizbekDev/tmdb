import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { getMovieById, sendUpdateMessage } from "../../utilities/updateFilm.js";
import { extractGenres } from "../../utilities/utilities.js";
import formatList, {
  generateHeader,
  generatePaginationButtons,
} from "../list/formatList.js";

export function handleCallbackQueries(bot) {
  bot.on("callback_query", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    try {
      if (callbackData.startsWith("request_")) {
        const query = callbackData.replace("request_", "");
        await ctx.answerCbQuery(
          `✅ Your request for "${query}" has been submitted successfully!`
        );
        const adminMessage = `
🎥 <b>New Movie/Series Request</b>
▪️ <b>Requested Item:</b> ${query}
▪️ <b>From User:</b> ${ctx.from.first_name} (@${
          ctx.from.username || "No username"
        })
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
          await ctx.answerCbQuery(
            "Sizda bu amalni bajarish uchun ruxsat yo‘q."
          );
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
          await ctx.answerCbQuery(
            `Foydalanuvchi (ID: ${userId}) hech qanday kontent ko‘rmagan.`
          );
          return;
        }

        const totalPages = Math.ceil(
          Math.max(moviesCount, seriesCount) / limit
        );
        const header =
          pageNum === 1
            ? `<b>Foydalanuvchi (ID: ${userId}) ko‘rgan kontent</b>\n` +
              `Filmlar: ${moviesCount} | Seriallar: ${seriesCount}\n\n`
            : "";
        const content = header + formatList(movies, series, pageNum, limit);
        const paginationButtons = generatePaginationButtons(
          pageNum,
          totalPages,
          `show_${userId}_`
        );

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
          Movie.find({})
            .sort({ _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
          Series.find({})
            .sort({ _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
          Movie.countDocuments({}),
          Series.countDocuments({}),
        ]);

        const totalPages = Math.ceil(
          Math.max(moviesCount, seriesCount) / limit
        );
        const header =
          page === 1 ? generateHeader(moviesCount, seriesCount) : "";
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
      } else if (callbackData.startsWith("reveal_teaser_")) {
        const movieId = callbackData.split("reveal_teaser_")[1];
        const movie =
          (await Movie.findById(movieId)) || (await Series.findById(movieId));

        if (!movie) {
          await ctx.answerCbQuery("Movie or series not found.");
          return;
        }

        const genres = extractGenres(movie.keywords)
          .map((g) => `#${g}`)
          .join(" ");
        const label =
          movie.__t === "Series" ? "🎬 Suggested Series" : "🎥 Suggested Movie";
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
      } else if (callbackData.startsWith("delete_")) {
        const movieId = callbackData.split("delete_")[1];
        const isAdmin = ctx.from.id === parseInt(process.env.ADMIN_ID);

        if (!isAdmin) {
          await ctx.answerCbQuery("You do not have permission to delete.", {
            show_alert: true,
          });
          return;
        }

        ctx.session.step = `awaitingDelete_${movieId}`;
        const movie = await Movie.findById(movieId);
        if (!movie) {
          await ctx.answerCbQuery("Movie not found.", { show_alert: true });
          return;
        }

        await ctx.answerCbQuery(`You are about to delete: ${movie.name}`);
        await ctx.reply(
          `Please enter "<code>sudo delete ${movie.name}</code>" to confirm deletion.\nTo cancel the process, type <code>CANCEL</code>`,
          {
            parse_mode: "HTML",
          }
        );
      } else if (callbackData.startsWith("update_")) {
        await ctx.answerCbQuery();
        const movieId = callbackData.split("update_")[1];
        const isAdmin = ctx.from.id === parseInt(process.env.ADMIN_ID);

        if (!isAdmin) {
          await ctx.answerCbQuery("You do not have permission to update.", {
            show_alert: true,
          });
          return;
        }

        // ctx.session.step = `updating_${movieId}`;
        ctx.session.updateFields = {};
        ctx.session.step = "name_input";

        // const updateMovie = await getMovieById(movieId);
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the movie name or enter a new name:",
          movieId,
          "name"
        );
      } else if (callbackData.startsWith("leave_name_")) {
        await ctx.answerCbQuery();
        const movieId = callbackData.split("leave_name_")[1];
        const updateMovie = await getMovieById(movieId);
        ctx.session.updateFields.name = updateMovie.name;
        ctx.session.step = "description_input";
        ctx.session.targetMovieId = movieId; // Store movieId for later use
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the description or enter a new description:",
          movieId,
          "description"
        );
      } else if (callbackData.startsWith("leave_description_")) {
        await ctx.answerCbQuery();
        const movieId = callbackData.split("leave_description_")[1];
        const updateMovie = await getMovieById(movieId);
        ctx.session.updateFields.description = updateMovie.caption; // Assuming caption is description
        ctx.session.step = "update_film";
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the film or send new Film:",
          movieId,
          "film"
        );
      } else if (callbackData.startsWith("leave_film_")) {
        await ctx.answerCbQuery();
        const movieId = callbackData.split("leave_film_")[1];
        const updateMovie = await getMovieById(movieId);
        ctx.session.updateFields.movieUrl = updateMovie.movieUrl;
        ctx.session.step = "update_teaser";
        ctx.session.targetMovieId = movieId;
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the Film or send new film to update",
          movieId,
          "teaser"
        );
      } else if (callbackData.startsWith("leave_teaser_")) {
        await ctx.answerCbQuery();
        const movieId = callbackData.split("leave_teaser_")[1];
        const updateMovie = await getMovieById(movieId);
        ctx.session.updateFields.teaser = updateMovie.teaser;
        ctx.session.step = "keywords_input";
        ctx.session.targetMovieId = movieId;
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the teaser or send new teaser video to update:",
          movieId,
          "keywords"
        );
      } else if (callbackData.startsWith("leave_keywords_")) {
        await ctx.answerCbQuery();
        const movieId = callbackData.split("leave_keywords_")[1];
        const updateMovie = await getMovieById(movieId);
        ctx.session.updateFields.keywords = updateMovie.keywords;
        delete ctx.session.step;
        await sendUpdateMessage(
          ctx,
          "Update complete! Press to save changes:",
          movieId,
          "save"
        );
      } else if (callbackData.startsWith("save_")) {
        await ctx.answerCbQuery();
        const movieId = callbackData.split("save_")[1];
        const updateMovie = await getMovieById(movieId);
        updateMovie.name = ctx.session.updateFields.name || updateMovie.name;
        updateMovie.caption =
          ctx.session.updateFields.description || updateMovie.caption;
        updateMovie.movieUrl =
          ctx.session.updateFields.videoFileId || updateMovie.movieUrl;
        updateMovie.fileType = ctx.session.updateFields.fileType || updateMovie.fileType;
        updateMovie.size = ctx.session.updateFields.movieSize || updateMovie.size;
        updateMovie.duration=ctx.session.updateFields.duration || updateMovie.duration;
        updateMovie.teaser = ctx.session.updateFields.teaser || updateMovie.teaser;
        updateMovie.keywords =
          ctx.session.updateFields.keywords || updateMovie.keywords;
        await updateMovie.save();
        await ctx.reply(`Movie "${updateMovie.name}" updated successfully!`, {
          parse_mode: "HTML",
          reply_markup: { remove_keyboard: true },
        });
        delete ctx.session.step;
        delete ctx.session.updateFields;
      } else if (callbackData.startsWith("save_later_")) {
        const movieId = callbackData.split("save_later_")[1];
        const movie = await Movie.findById(movieId);
        if (!movie) {
          await ctx.answerCbQuery("Movie not found.");
          return;
        }
        const userId = ctx.from.id;
        const user = await User.findOne({ telegramId: userId });
        if (!user) {
          await ctx.answerCbQuery("User not found.");
          return;
        }
        if (!user.savedMovies) {
          user.savedMovies = [];
        }
        if (!user.savedMovies.includes(movieId)) {
          user.savedMovies.push(movieId);
          await user.save();
          await ctx.answerCbQuery("Movie saved for later viewing.");
        } else {
          await ctx.answerCbQuery("This movie is already saved.");
        }
      }
    } catch (error) {
      console.error("Error handling callback query:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Callback query handling error");
    }
  });
}
