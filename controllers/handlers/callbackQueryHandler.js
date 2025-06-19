import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
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
        const movieId = callbackData.split("update_")[1];
        const isAdmin = ctx.from.id === parseInt(process.env.ADMIN_ID);

        if (!isAdmin) {
          await ctx.answerCbQuery("You do not have permission to update.", {
            show_alert: true,
          });
          return;
        }

        ctx.session.step = `updating_${movieId}`;
        ctx.session.updateFields = {};
        // ctx.session.updateStep = "name_input";

        const updateMovie = await Movie.findById(movieId);
        if (!updateMovie) {
          await ctx.answerCbQuery("Movie not found.", { show_alert: true });
          delete ctx.session.step;
          return;
        }

        await ctx.reply("Please choose an option for the movie name:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Leave current name",
                  callback_data: `leave_name_${movieId}`,
                },
              ],
              [
                {
                  text: "Enter new name",
                  callback_data: `enter_name_${movieId}`,
                },
              ],
            ],
          },
        });
      } else if (callbackData.startsWith("leave_name_")) {
        const movieId = callbackData.split("leave_name_")[1];
        const updateMovie = await Movie.findById(movieId);
        if (!updateMovie) {
          await ctx.answerCbQuery("Movie not found.", { show_alert: true });
          delete ctx.session.step;
          return;
        }

        ctx.session.updateFields.name = updateMovie.name;
        ctx.session.step = "description_input";

        await ctx.reply("Please choose an option for the description:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Leave current description",
                  callback_data: `leave_description_${movieId}`,
                },
              ],
              [
                {
                  text: "Enter new description",
                  callback_data: `enter_description_${movieId}`,
                },
              ],
            ],
          },
        });
      } else if (callbackData.startsWith("enter_name_")) {
        const movieId = callbackData.split("enter_name_")[1];
        ctx.session.step = "name_input";
        ctx.session.targetMovieId = movieId;
        await ctx.reply("Please enter the new movie name:");
      } else if (callbackData.startsWith("leave_description_")) {
        const movieId = callbackData.split("leave_description_")[1];
        const updateMovie = await Movie.findById(movieId);
        if (!updateMovie) {
          await ctx.answerCbQuery("Movie not found.", { show_alert: true });
          delete ctx.session.step;
          return;
        }

        ctx.session.updateFields.description = updateMovie.caption; // Assuming caption is description
        ctx.session.step = "keywords_input";

        await ctx.reply("Please choose an option for the keywords:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Leave current keywords",
                  callback_data: `leave_keywords_${movieId}`,
                },
              ],
              [
                {
                  text: "Enter new keywords",
                  callback_data: `enter_keywords_${movieId}`,
                },
              ],
            ],
          },
        });
      } else if (callbackData.startsWith("enter_description_")) {
        const movieId = callbackData.split("enter_description_")[1];
        ctx.session.updateStep = "description_input";
        ctx.session.targetMovieId = movieId;
        await ctx.reply("Please enter the new description:");
      } else if (callbackData.startsWith("leave_keywords_")) {
        const movieId = callbackData.split("leave_keywords_")[1];
        const updateMovie = await Movie.findById(movieId);
        if (!updateMovie) {
          await ctx.answerCbQuery("Movie not found.", { show_alert: true });
          delete ctx.session.step;
          return;
        }

        ctx.session.updateFields.keywords = updateMovie.keywords;
        delete ctx.session.updateStep;

        await ctx.reply("Update complete! Press to save changes:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Save film", callback_data: `save_${movieId}` }],
            ],
          },
        });
      } else if (callbackData.startsWith("enter_keywords_")) {
        const movieId = callbackData.split("enter_keywords_")[1];
        ctx.session.updateStep = "keywords_input";
        ctx.session.targetMovieId = movieId;
        await ctx.reply("Please enter the new keywords:");
      } else if (callbackData.startsWith("save_")) {
        const movieId = callbackData.split("save_")[1];
        const updateMovie = await Movie.findById(movieId);
        if (!updateMovie || !ctx.session.updateFields) {
          await ctx.answerCbQuery("Movie not found or update data missing.", {
            show_alert: true,
          });
          delete ctx.session.step;
          return;
        }

        // Save film function
        updateMovie.name = ctx.session.updateFields.name || updateMovie.name;
        updateMovie.caption =
          ctx.session.updateFields.description || updateMovie.caption;
        updateMovie.keywords =
          ctx.session.updateFields.keywords || updateMovie.keywords;
        await updateMovie.save();
        await ctx.reply(`Movie "${updateMovie.name}" updated successfully!`, {
          parse_mode: "HTML",
          reply_markup: { remove_keyboard: true },
        });
        delete ctx.session.step;
        delete ctx.session.updateFields;
        delete ctx.session.targetMovieId;
      } else if (
        ctx.session.updateStep === "name_input" &&
        ctx.session.targetMovieId
      ) {
        const movieId = ctx.session.targetMovieId;
        ctx.session.updateFields.name = messageText;
        ctx.session.updateStep = "description";
        await ctx.reply("Please choose an option for the description:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Leave current description",
                  callback_data: `leave_description_${movieId}`,
                },
              ],
              [
                {
                  text: "Enter new description",
                  callback_data: `enter_description_${movieId}`,
                },
              ],
            ],
          },
        });
      } else if (
        ctx.session.updateStep === "description_input" &&
        ctx.session.targetMovieId
      ) {
        const movieId = ctx.session.targetMovieId;
        ctx.session.updateFields.description = messageText;
        ctx.session.updateStep = "keywords";
        await ctx.reply("Please choose an option for the keywords:", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Leave current keywords",
                  callback_data: `leave_keywords_${movieId}`,
                },
              ],
              [
                {
                  text: "Enter new keywords",
                  callback_data: `enter_keywords_${movieId}`,
                },
              ],
            ],
          },
        });
      } else if (
        ctx.session.updateStep === "keywords_input" &&
        ctx.session.targetMovieId
      ) {
        const movieId = ctx.session.targetMovieId;
        ctx.session.updateFields.keywords = messageText;
        delete ctx.session.updateStep;
        await ctx.reply("Update complete! Press to save changes:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Save film", callback_data: `save_${movieId}` }],
            ],
          },
        });
      }
    } catch (error) {
      console.error("Error handling callback query:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Callback query handling error");
    }
  });
}
