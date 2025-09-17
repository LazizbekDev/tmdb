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
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";

export async function handleTextInput(ctx, bot) {
  const userId = ctx.from.id;
  const messageText = ctx.message.text;
  // const isAdmin = ctx.from.username?.toLowerCase() === process.env.ADMIN?.toLowerCase();
  const step = ctx.session?.step;

  try {
    console.log(`Step: ${step}, Message: ${messageText}`);
    switch (step) {
      case "awaitingSeriesForNewSeason":
        await findCurrentSeason(ctx, ctx.session, userId);
        break;
      case "awaitingSeriesDetails":
        await title(ctx, ctx.session, userId);
        break;
      case "awaitingDetails":
        await info(ctx, ctx.session);
        console.log("Details saved, awaiting teaser.");
        break;
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
        await ctx.telegram.sendMessage(
          process.env.ADMIN_ID,
          `👤from ${ctx.from.username
            ? "@" + ctx.from.username
            : `User ID: <code>${userId} - ${ctx.from?.first_name}</code>`
          }\n\n📝<i>${messageText}</i>\n\nℹ️ to reply: <code>/reply ${userId} Thanks for your feedback ☺️</code>`,
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
          ctx.session.targetMovieId,
          "description"
        );
        break;
      case "description_input":
        ctx.session.updateFields = ctx.session.updateFields || {};
        ctx.session.updateFields.description = messageText;
        ctx.session.step = "keywords_input";
        await sendUpdateMessage(
          ctx,
          "Please choose an option for the keywords or enter new keywords:",
          ctx.session.targetMovieId,
          "keywords"
        );
        break;
      case "keywords_input":
        ctx.session.updateFields = ctx.session.updateFields || {};
        ctx.session.updateFields.keywords = messageText;
        delete ctx.session.step;
        await sendUpdateMessage(
          ctx,
          "Update complete! Press to save changes:",
          ctx.session.targetMovieId,
          "save"
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

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

    const [movies, seriesList] = await Promise.all([
      Movie.find(query).select("name caption keywords").lean(),
      Series.find(query).select("name caption keywords").lean(),
    ]);

    // If direct matches are found → paginate results
    if (movies.length > 0 || seriesList.length > 0) {
      await handlePagination(ctx, bot, page, Movie, Series, limit, query);
      return;
    }

    // --- AI suggestion ---
    const allMovies = await Movie.find().select("name").lean();
    const allSeries = await Series.find().select("name").lean();
    const availableTitles = [...allMovies, ...allSeries].map(item => item.name);

    const prompt = `
User searched for: "${messageText}"

Here is the list of movies/series available in my database:
${availableTitles.join("\n")}

Task: pick the single closest match to the user’s input.  
If nothing is similar, return "NONE".
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        process.env.GEMINI_API,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!suggestion || suggestion === "NONE") {
      await ctx.reply("😔 Nothing found, and no similar titles exist in our database.");
      return;
    }

    // Check if suggested movie exists in DB
    const matchedMovie =
      (await Movie.findOne({ name: suggestion }).lean()) ||
      (await Series.findOne({ name: suggestion }).lean());

    if (matchedMovie) {
      await ctx.reply(
        `😔 No exact match found. But maybe you meant:  
👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${matchedMovie._id}"><b>${suggestion}</b></a>`,
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(`😔 No exact match found. But maybe you meant:  
👉 <b>${suggestion}</b>`, { parse_mode: "HTML" });
    }
  } catch (error) {
    console.error("🔍 Search error:", error);
    await ctx.reply("Something went wrong while searching. Try again later.");
    await adminNotifier(bot, error, ctx, "Search error");
  }
}