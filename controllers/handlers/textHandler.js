import UserSubmission from "#model/FilmRequest.js";
import Movie from "#model/MovieModel.js";
import Series from "#model/SeriesModel.js";
import { adminNotifier } from "#utilities/admin_notifier.js";
import { cleanText, handlePagination } from "#utilities/utilities.js";
import toAdmin from "#controllers/feedback/toAdmin.js";
import title from "#controllers/series/title.js";
import findCurrentSeason from "#controllers/series/seasons/find_current.js";
import saveSeries from "#controllers/series/saveSeries.js";
import saveNewSeason from "#controllers/series/seasons/saveSeason.js";
import info from "#controllers/add_new/info.js";
import { sendUpdateMessage } from "#utilities/updateFilm.js";
import { getAiSuggestions, generateMediaInfoWithAI } from "#utilities/aiSearch.js";

export async function handleTextInput(ctx, bot) {
  const userId = ctx.from.id;
  const messageText = ctx.message.text;
  // const isAdmin = ctx.from.username?.toLowerCase() === process.env.ADMIN?.toLowerCase();
  const step = ctx.session?.step;

  try {
    console.log(`Step: ${step}, Message: ${messageText}`);
    
    if (messageText === "/endchat") {
      delete ctx.session.step;
      return ctx.reply("❌ Chat session closed.");
    }

    if (messageText.startsWith("/reply ")) {
      const parts = messageText.split(" ");
      if (parts.length < 3) return ctx.reply("Usage: /reply USER_ID message");
      const targetId = parts[1];
      const replyMsg = parts.slice(2).join(" ");
      try {
        await bot.telegram.sendMessage(targetId, `💬 <b>Admin Message:</b>\n\n${replyMsg}`, { parse_mode: "HTML" });
        return ctx.reply(`✅ Message sent to user ${targetId}`);
      } catch (err) {
        return ctx.reply(`❌ Failed to send message: ${err.message}`);
      }
    }

    if (step && step.startsWith("chatting_with_")) {
      const targetId = step.replace("chatting_with_", "");
      try {
        if (targetId === "admin") {
          const userLink = `<a href='tg://user?id=${userId}'>${ctx.from.first_name}</a>`;
          const usernameDisplay = ctx.from.username ? ` (@${ctx.from.username})` : "";
          await bot.telegram.sendMessage(process.env.ADMIN_ID, `💬 <b>Message from</b> ${userLink}${usernameDisplay}:\n\n${messageText}`, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "💬 Reply", callback_data: `chat_with_${userId}` }]]
            }
          });
          return ctx.reply("✅ Your message has been sent to the admin.");
        } else {
          await bot.telegram.sendMessage(targetId, `💬 <b>Admin Message:</b>\n\n${messageText}`, { parse_mode: "HTML" });
          return ctx.reply("✅ Message sent.");
        }
      } catch (err) {
        console.error("Chat error:", err);
        return ctx.reply("❌ Failed to send message. The user might have blocked the bot.");
      }
    }

    if (step && step.startsWith("awaitingDelete_")) {
      const movieId = step.split("_")[1];
      if (messageText === "CANCEL") {
        delete ctx.session.step;
        return ctx.reply("Deletion cancelled.", { reply_markup: { remove_keyboard: true } });
      }

      let item = await Movie.findById(movieId);
      let isMovie = true;
      if (!item) {
        item = await Series.findById(movieId);
        isMovie = false;
      }

      if (!item) {
        delete ctx.session.step;
        return ctx.reply("Content not found.", { reply_markup: { remove_keyboard: true } });
      }

      if (messageText === `sudo delete ${item.name}`) {
         if (isMovie) {
           await Movie.findByIdAndDelete(movieId);
         } else {
           await Series.findByIdAndDelete(movieId);
         }
         delete ctx.session.step;
         return ctx.reply(`"<b>${item.name}</b>" has been successfully deleted.`, { parse_mode: "HTML", reply_markup: { remove_keyboard: true } });
      } else {
         return ctx.reply(`Incorrect confirmation text.\nPlease enter "<code>sudo delete ${item.name}</code>" to confirm or type <code>CANCEL</code> to abort.`, { parse_mode: "HTML" });
      }
    }

    switch (step) {
      // --- AI Movie Flow ---
      case "ai_movie_name":
        await ctx.reply("Generating movie details with AI... Please wait ⏳");
        const aiInfo = await generateMediaInfoWithAI(messageText, false);
        if (!aiInfo) {
          return ctx.reply("Failed to generate AI info. Please try again or use manual add.");
        }
        ctx.session.movieData.name = aiInfo.name;
        ctx.session.movieData.caption = aiInfo.caption;
        ctx.session.movieData.keywords = aiInfo.keywords;
        
        await ctx.reply(`AI generated details:\n\nName: ${aiInfo.name}\nCaption: ${aiInfo.caption}\nKeywords: ${aiInfo.keywords.join(", ")}\n\nSaving movie...`);
        import("#controllers/add_new/movieSave.js").then(m => m.saveAiMovie(ctx));
        break;

      // --- Manual Movie Flow ---
      case "manual_movie_name":
        if (!ctx.session.movieData) ctx.session.movieData = {};
        ctx.session.movieData.name = messageText;
        ctx.session.step = "manual_movie_caption";
        await ctx.reply("Name received. Please send the description/caption.", {
          reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]] }
        });
        break;
      case "manual_movie_caption":
        ctx.session.movieData.caption = messageText;
        ctx.session.step = "manual_movie_keywords";
        await ctx.reply("Caption received. Please send the keywords (comma separated).", {
          reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]] }
        });
        break;
      case "manual_movie_keywords":
        ctx.session.movieData.keywords = messageText.split(",").map(k => k.trim());
        ctx.session.step = "manual_movie_video";
        await ctx.reply("Keywords received. Please send the main video file.", {
          reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]] }
        });
        break;

      // --- AI Series Flow ---
      case "ai_series_name":
        await ctx.reply("Generating series details with AI... Please wait ⏳");
        const aiSeriesInfo = await generateMediaInfoWithAI(messageText, true);
        if (!aiSeriesInfo) {
          return ctx.reply("Failed to generate AI info. Please try again or use manual add.");
        }
        if (!ctx.session.seriesData) ctx.session.seriesData = {};
        ctx.session.seriesData.name = aiSeriesInfo.name;
        ctx.session.seriesData.caption = aiSeriesInfo.caption;
        ctx.session.seriesData.keywords = aiSeriesInfo.keywords;
        ctx.session.step = "ai_series_season";
        await ctx.reply(`AI generated details:\n\nName: ${aiSeriesInfo.name}\nCaption: ${aiSeriesInfo.caption}\nKeywords: ${aiSeriesInfo.keywords.join(", ")}\n\nPlease send the season number (e.g. 1).`, {
          reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]] }
        });
        break;
      case "ai_series_season":
        ctx.session.seriesData.seasonNumber = parseInt(messageText);
        ctx.session.step = "ai_series_teaser";
        await ctx.reply("Season number received. Please send the teaser video.", {
          reply_markup: {
            inline_keyboard: [[{ text: "⏭ Skip Teaser", callback_data: "skip_teaser_series" }], [{ text: "❌ Cancel", callback_data: "cancel_add" }]]
          }
        });
        break;

      // --- Manual Series Flow ---
      case "manual_series_name":
        if (!ctx.session.seriesData) ctx.session.seriesData = {};
        ctx.session.seriesData.name = messageText;
        ctx.session.step = "manual_series_season";
        await ctx.reply("Name received. Please send the season number (e.g. 1).", {
          reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]] }
        });
        break;
      case "manual_series_season":
        ctx.session.seriesData.seasonNumber = parseInt(messageText);
        ctx.session.step = "manual_series_caption";
        await ctx.reply("Season number received. Please send the description/caption.", {
          reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]] }
        });
        break;
      case "manual_series_caption":
        ctx.session.seriesData.caption = messageText;
        ctx.session.step = "manual_series_keywords";
        await ctx.reply("Caption received. Please send the keywords (comma separated).", {
          reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]] }
        });
        break;
      case "manual_series_keywords":
        ctx.session.seriesData.keywords = messageText.split(",").map(k => k.trim());
        ctx.session.step = "manual_series_teaser";
        await ctx.reply("Keywords received. Please send the teaser video.", {
          reply_markup: {
            inline_keyboard: [[{ text: "⏭ Skip Teaser", callback_data: "skip_teaser_series" }], [{ text: "❌ Cancel", callback_data: "cancel_add" }]]
          }
        });
        break;

      // Old flows preserved
      case "awaitingSeriesForNewSeason":
      case "awaitingFeedback":
        await toAdmin(ctx);
        break;
      case "awaitingSeriesFiles":
        if (messageText === "Done") {
          await saveSeries(ctx, ctx.session, userId);
        }
        break;
      case "awaitingNewSeasonDetails":
        if (messageText === "Done") {
          await saveNewSeason(ctx, ctx.session, userId);
        }
        break;
      case "awaitingRequestName":
        await UserSubmission.create({
          userId,
          name: ctx.from.first_name,
          request: messageText,
          timestamp: new Date(),
        });
        const userLink = `<a href='tg://user?id=${userId}'>${ctx.from.first_name}</a>`;
        const usernameDisplay = ctx.from.username ? ` (@${ctx.from.username})` : "";
        await ctx.telegram.sendMessage(
          process.env.ADMIN_ID,
          `👤 <b>Feedback from:</b> ${userLink}${usernameDisplay}\n\n📝 <i>${messageText}</i>\n\nℹ️ to reply: <code>/reply ${userId} Thanks for your feedback ☺️</code>`,
          { parse_mode: "HTML" }
        );
        await ctx.reply("Thank you! Your request has been submitted.");
        break;
      case "name_input":
        ctx.session.updateFields = ctx.session.updateFields || {};
        ctx.session.updateFields.name = messageText;
        ctx.session.step = "description_input";
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the description or enter a new description:",
          ctx.session.targetContentId,
          "description",
          ctx.session.isSeriesUpdate
        );
        break;
      case "description_input":
        ctx.session.updateFields = ctx.session.updateFields || {};
        ctx.session.updateFields.description = messageText;
        ctx.session.step = "keywords_input";
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the keywords or enter new keywords:",
          ctx.session.targetContentId,
          "keywords",
          ctx.session.isSeriesUpdate
        );
        break;
      case "keywords_input":
        ctx.session.updateFields = ctx.session.updateFields || {};
        ctx.session.updateFields.keywords = messageText;
        delete ctx.session.step;
        await sendUpdateMessage(
          ctx,
          "Update complete! Press to save changes:",
          ctx.session.targetContentId,
          "save",
          ctx.session.isSeriesUpdate
        );
        break;
      default:
        await searchAndReply(ctx, messageText, bot);
    }
  } catch (error) {
    console.error("🚨 Error handling text input:", error);
    await ctx.reply("Oops! Something went wrong while processing your input.");
    await adminNotifier(bot, error, ctx, "Text input handling error");
  }
}

async function searchAndReply(ctx, messageText, bot) {
  try {
    const page = 1;
    const limit = 10;
    const cleanedText = cleanText(messageText);
    ctx.session.query = cleanedText;

    const query = {
      $or: [
        { cleanedName: { $regex: cleanedText, $options: "i" } },
        { cleanedKeywords: { $regex: cleanedText, $options: "i" } },
      ],
    };

    let [movies, seriesList] = await Promise.all([
      Movie.find(query).select("name caption keywords").lean(),
      Series.find(query).select("name caption keywords").lean(),
    ]);

    // If direct matches are found → paginate results
    if (movies.length > 0 || seriesList.length > 0) {
      await handlePagination(ctx, bot, page, Movie, Series, limit, query);
      return;
    }

    // No direct matches, try AI suggestions
    await ctx.reply("🔍 Searching with AI for better results...");
    const aiData = await getAiSuggestions(messageText);

    if (aiData && (aiData.titles.length > 0 || aiData.genres.length > 0)) {
      // 1. First try searching by titles suggested by AI
      const aiTitleQuery = {
        $or: aiData.titles.map(k => ({
          cleanedName: { $regex: cleanText(k), $options: "i" }
        }))
      };

      const [aiMovies, aiSeries] = await Promise.all([
        Movie.find(aiTitleQuery).select("name caption keywords").lean(),
        Series.find(aiTitleQuery).select("name caption keywords").lean(),
      ]);

      if (aiMovies.length > 0 || aiSeries.length > 0) {
        await ctx.reply(`✨ We don't have exactly what you're looking for, but you might like these:`);
        await handlePagination(ctx, bot, page, Movie, Series, limit, aiTitleQuery);
        return;
      }

      // 2. If no title matches, try searching by genres suggested by AI
      if (aiData.genres.length > 0) {
        const genreRegex = new RegExp(aiData.genres.join("|"), "i");
        const aiGenreQuery = {
          cleanedKeywords: { $regex: genreRegex }
        };

        const [genreMovies, genreSeries] = await Promise.all([
          Movie.find(aiGenreQuery).select("name caption keywords").limit(10).lean(),
          Series.find(aiGenreQuery).select("name caption keywords").limit(10).lean(),
        ]);

        if (genreMovies.length > 0 || genreSeries.length > 0) {
          await ctx.reply(`🎬 We couldn't find that specific movie, but here are some similar ones in the same genres:`);
          await handlePagination(ctx, bot, page, Movie, Series, limit, aiGenreQuery);
          return;
        }
      }
    }

    await ctx.reply("😔 Nothing found even with AI. You can use /list to browse or send a request!");

  } catch (error) {
    console.error("🔍 Search error:", error);
    await ctx.reply("Something went wrong while searching. Try again later.");
    await adminNotifier(bot, error, ctx, "Search error");
  }
}