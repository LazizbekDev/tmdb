import UserSubmission from "../../model/FilmRequest.js";
import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { cleanText, handlePagination } from "../../utilities/utilities.js";
import toAdmin from "../feedback/toAdmin.js";
import title from "../series/title.js";
import findCurrentSeason from "../series/seasons/find_current.js";
import saveSeries from "../series/saveSeries.js";
import saveNewSeason from "../series/seasons/saveSeason.js";
import info from "../add_new/info.js";
import { sendUpdateMessage } from "../../utilities/updateFilm.js";

export async function handleTextInput(ctx, bot) {
  const userId = ctx.from.id;
  const messageText = ctx.message.text;
  const ctxData = ctx.session;

  // Sessiya tekshiruvi
  if (!ctxData || !ctxData.step) {
    return await searchAndReply(ctx, messageText, bot);
  }

  try {
    switch (ctxData.step) {
      case "awaitingSeriesForNewSeason":
        await findCurrentSeason(ctx, ctxData, userId);
        break;
      case "awaitingSeriesDetails":
        await title(ctx, ctxData, userId);
        break;
      case "awaitingDetails":
        await info(ctx, ctxData);
        break;
      case "awaitingFeedback":
        await toAdmin(ctx);
        break;
      case "awaitingSeriesFiles":
        if (messageText === "Done") {
          await saveSeries(ctx, ctxData, userId);
        }
        break;
      case "awaitingNewSeasonDetails":
        if (messageText === "Done") {
          await saveNewSeason(ctx, ctxData, userId);
        }
        break;
      case "awaitingRequestName":
        await UserSubmission.create({
          userId,
          name: ctx.from.first_name,
          request: messageText,
          timestamp: new Date(),
        });
        await ctx.telegram.sendMessage(
          process.env.ADMIN_ID,
          `👤from ${
            ctx.from.username
              ? "@" + ctx.from.username
              : `User ID: <code>${userId} - ${ctx.from?.first_name}</code>`
          }\n\n📝<i>${messageText}</i>\n\nℹ️ to reply: <code>/reply ${userId} Thanks for your feedback ☺️</code>`,
          { parse_mode: "HTML" }
        );
        await ctx.reply("Thank you! Your request has been submitted.");
        break;
      case "name_input":
        if (!ctxData.updateFields) ctxData.updateFields = {};
        ctxData.updateFields.name = messageText;
        ctxData.step = "description_input";
        const movieId = ctxData.targetMovieId;
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the description or enter a new description:",
          movieId,
          "description"
        );
        break;
      case "description_input":
        if (!ctxData.updateFields) ctxData.updateFields = {};
        ctxData.updateFields.description = messageText;
        ctxData.step = "keywords_input";
        const movieIdDesc = ctxData.targetMovieId;
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the keywords or enter new keywords:",
          movieIdDesc,
          "keywords"
        );
        break;
      case "keywords_input":
        if (!ctxData.updateFields) ctxData.updateFields = {};
        ctxData.updateFields.keywords = messageText;
        delete ctxData.step;
        const movieIdKey = ctxData.targetMovieId;
        await sendUpdateMessage(
          ctx,
          "Update complete! Press to save changes:",
          movieIdKey,
          "save"
        );
        break;
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
    ctx.session.query = cleanedText; // Sessiyaga saqlash

    // Qidiruv so'rovini log qilish

    // Qidiruv so'rovi
    const query = {
      $or: [
        { cleanedName: { $regex: cleanedText, $options: "i" } },
        { cleanedKeywords: { $regex: cleanedText, $options: "i" } },
      ],
    };


    const [movies, seriesList] = await Promise.all([
      Movie.find(query).select("name caption keywords").lean(),
      Series.find(query).select("name caption keywords").lean(),
    ]);

    // Agar hech narsa topilmasa
    if (movies.length === 0 && seriesList.length === 0) {
      await ctx.reply("😔 There's no films found!");
      return;
    }

    // handlePagination funksiyasidan foydalanish
    await handlePagination(ctx, bot, page, Movie, Series, limit, query);
  } catch (error) {
    console.error("🔍 Search error:", error);
    await ctx.reply("Something went wrong while searching. Try again later.");
    await adminNotifier(bot, error, ctx, "Search error");
  }
}