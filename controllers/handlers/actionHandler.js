import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import User from "../../model/User.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { checkUserMembership } from "../start.js";
import formatList, { generatePaginationButtons } from "../list/formatList.js";
import add from "./../add_new/main.js";
// import info from "../add_new/info.js";

export function handleActionButtons(bot, userState) {
  bot.action("add", add);

  bot.action("add_movie", async (ctx) => {
    await ctx.answerCbQuery("Adding a movie.");
    await ctx.reply("Please send the video file (mp4, mkv, etc.).");
    userState[ctx.from.id] = { step: "awaitingVideo" };
  });

  bot.action(/list_page_(\d+)/, async (ctx) => {
    try {
      const page = parseInt(ctx.match[1], 10);
      const limit = 10;

      const [movies, series, totalMoviesCount, totalSeriesCount] = await Promise.all([
        Movie.find({}).sort({ _id: -1 }).limit(limit).skip((page - 1) * limit),
        Series.find({}).sort({ _id: -1 }).limit(limit).skip((page - 1) * limit),
        Movie.countDocuments({}),
        Series.countDocuments({}),
      ]);

      const totalPages = Math.ceil(Math.max(totalMoviesCount, totalSeriesCount) / limit);
      const content = formatList(movies, series, page, limit);
      const paginationButtons = generatePaginationButtons(page, totalPages);

      await ctx.editMessageText(content, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: paginationButtons },
      });
    } catch (error) {
      console.error("Error in pagination:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Pagination error");
    }
  });

  bot.action("send_movie_request", async (ctx) => {
    try {
      await ctx.answerCbQuery("We will post it to channel");
      await ctx.reply("Send name of the film name that you want to watch");
      userState[ctx.from.id] = { step: "awaitingRequestName" };
    } catch (error) {
      console.error("Error in send_movie_request action:", error);
      await ctx.reply("An error occurred while processing your request. Please try again.");
      await adminNotifier(bot, error, ctx, "Send movie request error");
    }
  });

  bot.action("add_series", async (ctx) => {
    await ctx.answerCbQuery("Adding a series.");
    await ctx.reply("Please enter the series details: name | season number | caption | keywords");
    userState[ctx.from.id] = { step: "awaitingSeriesDetails" };
  });

  bot.action("add_season", async (ctx) => {
    await ctx.reply("Please provide the series name for which you want to add a new season.");
    userState[ctx.from.id] = { step: "awaitingSeriesForNewSeason" };
  });

  bot.action("check_membership", async (ctx) => {
    try {
      const userId = ctx.from.id;
      const isAdmin = ctx.message?.from?.username?.toLowerCase() === process.env.ADMIN?.toLowerCase();
      const isMember = await checkUserMembership(userId);
      if (isMember) {
        await User.findOneAndUpdate(
          { telegramId: userId },
          { $set: { isSubscribed: true } },
          { new: true }
        );
        await ctx.editMessageText("You are now verified! Use the buttons below:", {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Search", switch_inline_query_current_chat: "" }],
              [{ text: isAdmin ? "Add new" : "Send feedback", callback_data: isAdmin ? "add" : "feedback" }],
              [{ text: "🎬 Send Movie Request", callback_data: "send_movie_request" }],
            ],
          },
        });
      } else {
        await ctx.answerCbQuery("Please join the channel and try again!", { show_alert: true });
      }
    } catch (error) {
      console.error("Error checking membership:", error);
      await ctx.reply("An error occurred while checking your membership status. Please try again.");
      await adminNotifier(bot, error, ctx, "Membership check error");
    }
  });

  bot.action("feedback", async (ctx) => {
    try {
      userState[ctx.from.id] = { step: "awaitingFeedback" };
      await ctx.answerCbQuery("You can send your feedback to admin");
      await ctx.reply("Please send your feedback.");
    } catch (error) {
      console.error("Error in feedback action:", error);
      await ctx.reply("An error occurred while processing your feedback. Please try again.");
      await adminNotifier(bot, error, ctx, "Feedback action error");
    }
  });
}