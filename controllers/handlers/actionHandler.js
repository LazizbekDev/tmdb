import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import User from "../../model/User.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { checkUserMembership } from "../start.js";
import add from "./../add_new/main.js";
import caption from "../../utilities/caption.js";
import { handlePagination } from "../../utilities/utilities.js";
// import info from "../add_new/info.js";

export function handleActionButtons(bot) {
  bot.action("add", add);

  bot.action("add_movie", async (ctx) => {
    await ctx.answerCbQuery("Adding a movie.");
    await ctx.reply("Please send the video file (mp4, mkv, etc.).");
    ctx.session.step = "awaitingVideo";
  });

  bot.action(/list_page_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await handlePagination(ctx, bot, page, Movie, Series, 5, {}, "list_page_");
  });

  bot.action(/search_list_(\d+)/, async (ctx) => {
    try {
      await ctx.answerCbQuery("Searching...");
      const page = parseInt(ctx.match[1], 10); // 10 asosida parse qilish (5 noto‘g‘ri edi)
      const cleanedText = ctx.session.query;

      if (!cleanedText) {
        console.log("🚫 Sessiyada qidiruv so‘zi topilmadi");
        await ctx.reply(
          "Search term not found in session. Please try again."
        );
        return;
      }

      // console.log(`🔍 Search list page: ${cleanedText}`);

      const query = {
        $or: [
          { cleanedName: { $regex: cleanedText, $options: "i" } },
          { cleanedKeywords: { $regex: cleanedText, $options: "i" } },
        ],
      };

      await handlePagination(
        ctx,
        bot,
        page,
        Movie,
        Series,
        10,
        query,
        "search_list_"
      );
    } catch (error) {
      console.error("🔍 Search list error:", error);
      await ctx.reply("Something went wrong while processing your search.");
      await adminNotifier(bot, error, ctx, "Search list error");
    }
  });

  bot.action("send_movie_request", async (ctx) => {
    try {
      await ctx.answerCbQuery("We will post it to channel");
      await ctx.reply("Send name of the film name that you want to watch");
      ctx.session.step = "awaitingRequestName";
    } catch (error) {
      console.error("Error in send_movie_request action:", error);
      await ctx.reply(
        "An error occurred while processing your request. Please try again."
      );
      await adminNotifier(bot, error, ctx, "Send movie request error");
    }
  });

  bot.action("add_series", async (ctx) => {
    await ctx.answerCbQuery("Adding a series.");
    await ctx.reply(
      "Please enter the series details: name | season number | caption | keywords"
    );
    ctx.session.step = "awaitingSeriesDetails";
  });

  bot.action("add_season", async (ctx) => {
    await ctx.reply(
      "Please provide the series name for which you want to add a new season."
    );
    ctx.session.step = "awaitingSeriesForNewSeason";
  });

  bot.action("check_membership", async (ctx) => {
    try {
      const userId = ctx.from.id;
      const isAdmin =
        ctx.message?.from?.username?.toLowerCase() ===
        process.env.ADMIN?.toLowerCase();
      const isMember = await checkUserMembership(userId);

      if (isMember) {
        const user = await User.findOneAndUpdate(
          { telegramId: userId },
          { $set: { isSubscribed: true } },
          { new: true }
        );

        await ctx.editMessageText(
          "✅ You are now verified! Resending your previous movies...",
          {
            parse_mode: "HTML",
          }
        );

        if (user?.accessedMovies?.length) {
          for (const movieId of user.accessedMovies) {
            const movie = await Movie.findById(movieId);
            if (movie) {
              await ctx.replyWithVideo(movie.movieUrl, {
                caption: caption(movie, false),
                parse_mode: "HTML",
                protect_content: false,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "Search", switch_inline_query_current_chat: "" }],
                  ],
                },
              });
              await new Promise((r) => setTimeout(r, 1000)); // spamdan saqlanish uchun delay
            }
          }
        }

        await ctx.reply("Use the buttons below:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Search", switch_inline_query_current_chat: "" }],
              [
                {
                  text: isAdmin ? "Add new" : "Send feedback",
                  callback_data: isAdmin ? "add" : "feedback",
                },
              ],
              [
                {
                  text: "🎬 Send Movie Request",
                  callback_data: "send_movie_request",
                },
              ],
            ],
          },
        });
      } else {
        await ctx.answerCbQuery("Please join the channel and try again!", {
          show_alert: true,
        });
      }
    } catch (error) {
      console.error("Error checking membership:", error);
      await ctx.reply(
        "An error occurred while checking your membership status. Please try again."
      );
      await adminNotifier(bot, error, ctx, "Membership check error");
    }
  });

  bot.action("feedback", async (ctx) => {
    try {
      ctx.session.step = "awaitingFeedback";
      await ctx.answerCbQuery("You can send your feedback to admin");
      await ctx.reply("Please send your feedback.");
    } catch (error) {
      console.error("Error in feedback action:", error);
      await ctx.reply(
        "An error occurred while processing your feedback. Please try again."
      );
      await adminNotifier(bot, error, ctx, "Feedback action error");
    }
  });
}
