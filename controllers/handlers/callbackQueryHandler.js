import Movie from "#model/MovieModel.js";
import Series from "#model/SeriesModel.js";
import User from "#model/User.js";
import { adminNotifier } from "#utilities/admin_notifier.js";
import { getContentById, sendUpdateMessage } from "#utilities/updateFilm.js";
import { handlePagination, checkIsAdmin, findContentById, getWatchlistToggleButton, generateInteractiveKeyboard } from "#utilities/utilities.js";
import { getTrendingContent } from "#utilities/trending.js";
import { generateHeader } from "#controllers/list/formatList.js";
import { handleOnboardingCallback, isOnboardingCallback } from "#controllers/handlers/onboardingHandler.js";

export function handleCallbackQueries(bot) {
  bot.on("callback_query", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const messageId = ctx.callbackQuery.message.message_id;
    const chatId = ctx.callbackQuery.message.chat.id;

    try {
      if (isOnboardingCallback(callbackData)) {
        const handled = await handleOnboardingCallback(ctx, callbackData);
        if (handled !== false) {
          return;
        }
      } else if (callbackData.startsWith("reaction_liked_")) {
        const contentId = callbackData.replace("reaction_liked_", "");
        const content = await findContentById(Movie, Series, contentId);
        if (!content) {
          return ctx.answerCbQuery("Content not found.");
        }

        const isAdmin = checkIsAdmin(ctx);
        const user = await User.findOne({ telegramId: userId.toString() });
        const isInWatchlist = user?.savedMovies?.includes(contentId);
        const keyboard = await generateInteractiveKeyboard(ctx, content, isInWatchlist, isAdmin, true, "liked");

        await ctx.answerCbQuery("👍 Liked!", { show_alert: true });
        await ctx.telegram.editMessageReplyMarkup(chatId, messageId, null, { inline_keyboard: keyboard });
      } else if (callbackData.startsWith("reaction_not_me_")) {
        const contentId = callbackData.replace("reaction_not_me_", "");
        const content = await findContentById(Movie, Series, contentId);
        if (!content) {
          return ctx.answerCbQuery("Content not found.");
        }

        await User.updateOne(
          { telegramId: userId.toString() },
          {
            $addToSet: { rejectedMovies: contentId },
            $pull: { savedMovies: contentId },
          }
        );

        const isAdmin = checkIsAdmin(ctx);
        const user = await User.findOne({ telegramId: userId.toString() });
        const isInWatchlist = user?.savedMovies?.includes(contentId);
        const keyboard = await generateInteractiveKeyboard(ctx, content, isInWatchlist, isAdmin, true, "not_me");

        await ctx.answerCbQuery("👎 Not for me", { show_alert: true });
        await ctx.telegram.editMessageReplyMarkup(chatId, messageId, null, { inline_keyboard: keyboard });
      } else if (callbackData === "trending_list") {
        const trending = await getTrendingContent(5, 7);
        if (trending.length === 0) {
          return ctx.answerCbQuery("No trending content found for this week.", { show_alert: true });
        }

        let message = "<b>🔥 TRENDING THIS WEEK</b>\n\n";
        const keyboard = [];

        trending.forEach((item, index) => {
          const icon = item.type === "movie" ? "🎥" : "🎬";
          message += `${index + 1}. ${icon} <b>${item.data.name}</b> (${item.count} views)\n`;
          keyboard.push([{ text: `${icon} Watch ${item.data.name}`, url: `https://t.me/${process.env.BOT_USERNAME}?start=${item.data._id}` }]);
        });

        message += "\n<i>Check out what everyone is watching! 🍿</i>";

        await ctx.reply(message, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: keyboard }
        });
        return ctx.answerCbQuery();
      } else if (callbackData.startsWith("request_")) {
        const query = callbackData.replace("request_", "");
        await ctx.answerCbQuery(`✅ Your request for "${query}" has been submitted successfully!`);
        const userLink = `<a href='tg://user?id=${ctx.from.id}'>${ctx.from.first_name}</a>`;
        const usernameDisplay = ctx.from.username ? ` (@${ctx.from.username})` : "";
        const adminMessage = `
🎥 <b>New Movie/Series Request</b>
▪️ <b>Requested Item:</b> ${query}
▪️ <b>From User:</b> ${userLink}${usernameDisplay}
▪️ <b>User ID:</b> <code>${ctx.from.id}</code>
        `;
        await ctx.telegram.sendMessage(process.env.ADMIN_ID, adminMessage, { parse_mode: "HTML" });
      } else if (callbackData.startsWith("show_")) {
        // Format: show_<userId>_<page>_<sort>
        const parts = callbackData.split("_");
        const userIdToQuery = parts[1];
        const pageNum = parseInt(parts[2]);
        const sortType = parts[3] || "new";

        if (!userIdToQuery || isNaN(pageNum)) {
          return ctx.answerCbQuery("Noto'g'ri so'rov.");
        }

        if (!checkIsAdmin(ctx)) {
          return ctx.answerCbQuery("Sizda bu amalni bajarish uchun ruxsat yo'q.", { show_alert: true });
        }

        const query = { accessedBy: userIdToQuery };
        const showHeader = (moviesCount, seriesCount) =>
          `<b>Foydalanuvchi (ID: ${userIdToQuery}) ko'rgan kontent</b>\nFilmlar: ${moviesCount} | Seriallar: ${seriesCount}\n\n`;

        await handlePagination(ctx, bot, pageNum, Movie, Series, 10, query, `show_${userIdToQuery}_`, showHeader, sortType);

      } else if (callbackData.startsWith("page_")) {
        // Format: page_<page>_<sort>
        const parts = callbackData.split("_");
        const pageNum = parseInt(parts[1]);
        const sortType = parts[2] || "new";
        if (!isNaN(pageNum)) {
          await handlePagination(ctx, bot, pageNum, Movie, Series, 10, {}, "page_", generateHeader, sortType);
        } else {
          await ctx.answerCbQuery();
        }
      } else if (callbackData.startsWith("watch_list_")) {
        // Format: watch_list_<page>_<sort>
        const parts = callbackData.split("_");
        const pageNum = parseInt(parts[2]);
        const sortType = parts[3] || "new";
        if (isNaN(pageNum)) {
           return ctx.answerCbQuery();
        }
        const user = await User.findOne({ telegramId: userId.toString() });
        if (!user || !user.savedMovies || user.savedMovies.length === 0) {
           return ctx.answerCbQuery("Sizda saqlangan kontent yo'q.", { show_alert: true });
        }
        const query = { _id: { $in: user.savedMovies } };
        await handlePagination(ctx, bot, pageNum, Movie, Series, 10, query, "watch_list_", generateHeader, sortType);

      } else if (callbackData.startsWith("delete_")) {
        const contentId = callbackData.split("delete_")[1];
        if (!checkIsAdmin(ctx)) {
          return ctx.answerCbQuery("You do not have permission to delete.", { show_alert: true });
        }

        let content = await Movie.findById(contentId);
        if (!content) {
          content = await Series.findById(contentId);
        }

        if (!content) {
          return ctx.answerCbQuery("Content not found.", { show_alert: true });
        }

        ctx.session.step = `awaitingDelete_${contentId}`;
        await ctx.answerCbQuery(`You are about to delete: ${content.name}`);
        await ctx.reply(
          `Please enter "<code>sudo delete ${content.name}</code>" to confirm deletion.\nTo cancel the process, type <code>CANCEL</code>`,
          { parse_mode: "HTML" }
        );
      } else if (callbackData.startsWith("update_")) {
        await ctx.answerCbQuery();
        const contentId = callbackData.split("update_")[1];
        if (!checkIsAdmin(ctx)) {
          return ctx.answerCbQuery("You do not have permission to update.", { show_alert: true });
        }

        const content = await getContentById(contentId);
        const isSeries = content instanceof Series;

        ctx.session.step = "name_input";
        ctx.session.targetContentId = contentId;
        ctx.session.isSeriesUpdate = isSeries;

        ctx.session.updateFields = {
           name: content.name,
           description: content.caption,
           movieUrl: isSeries ? null : content.movieUrl,
           teaser: content.teaser,
           keywords: content.keywords,
           fileType: content.fileType,
           size: content.size,
           duration: content.duration
        };

        await sendUpdateMessage(ctx, "Please choose an option for the name or enter a new name:", contentId, "name", isSeries);
      } else if (callbackData.startsWith("leave_name_")) {
        await ctx.answerCbQuery();
        ctx.session.step = "description_input";
        await sendUpdateMessage(ctx, "Please choose an option for the description or enter a new description:", ctx.session.targetContentId, "description", ctx.session.isSeriesUpdate);
      } else if (callbackData.startsWith("leave_description_")) {
        await ctx.answerCbQuery();
        if (ctx.session.isSeriesUpdate) {
           // Skip direct film update for series (it's complex to update all episodes at once)
           ctx.session.step = "update_teaser";
           await sendUpdateMessage(ctx, "Please choose an option for the teaser or send new teaser video to update:", ctx.session.targetContentId, "teaser", true);
        } else {
           ctx.session.step = "update_film";
           await sendUpdateMessage(ctx, "Please choose an option for the film or send new Film:", ctx.session.targetContentId, "film", false);
        }
      } else if (callbackData.startsWith("leave_film_")) {
        await ctx.answerCbQuery();
        ctx.session.step = "update_teaser";
        await sendUpdateMessage(ctx, "Please choose an option for the teaser or send new teaser video to update:", ctx.session.targetContentId, "teaser", ctx.session.isSeriesUpdate);
      } else if (callbackData.startsWith("leave_teaser_")) {
        await ctx.answerCbQuery();
        ctx.session.step = "keywords_input";
        await sendUpdateMessage(ctx, "Please choose an option for the keywords or send new keywords to update:", ctx.session.targetContentId, "keywords", ctx.session.isSeriesUpdate);
      } else if (callbackData.startsWith("leave_keywords_")) {
        await ctx.answerCbQuery();
        delete ctx.session.step;
        await sendUpdateMessage(ctx, "Update complete! Press to save changes:", ctx.session.targetContentId, "save", ctx.session.isSeriesUpdate);
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
        const contentId = callbackData.split("save_")[1];
        const content = await getContentById(contentId);
        const fields = ctx.session.updateFields || {};

        content.name = fields.name;
        content.caption = fields.description;
        content.teaser = fields.teaser || content.teaser;
        content.keywords = fields.keywords || content.keywords;

        if (!(content instanceof Series)) {
          content.movieUrl = fields.movieUrl || content.movieUrl;
          content.fileType = fields.fileType || content.fileType;
          content.size = fields.size || content.size;
          content.duration = fields.duration || content.duration;
        }
        
        await content.save();
        await ctx.reply(`${content instanceof Series ? "Series" : "Movie"} "${content.name}" updated successfully!`, {
          parse_mode: "HTML",
          reply_markup: { remove_keyboard: true },
        });
        delete ctx.session.step;
        delete ctx.session.updateFields;
        delete ctx.session.targetContentId;
        delete ctx.session.isSeriesUpdate;
      }
    } catch (error) {
      console.error("Error handling callback query:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Callback query handling error");
    }
  });
}

