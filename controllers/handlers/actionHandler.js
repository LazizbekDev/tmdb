import Movie from "#model/MovieModel.js";
import Series from "#model/SeriesModel.js";
import User from "#model/User.js";
import { adminNotifier } from "#utilities/admin_notifier.js";
import { checkUserMembership } from "#controllers/start.js";
import add from "#controllers/add_new/main.js";
import caption from "#utilities/caption.js";
import { handlePagination, generateInteractiveKeyboard } from "#utilities/utilities.js";

export function handleActionButtons(bot) {
  bot.action("add", add);

  bot.action("ai_add_movie", async (ctx) => {
    await ctx.answerCbQuery("Adding a movie with AI.");
    await ctx.editMessageText("🤖 Please send the main video file (mp4, mkv, etc.) for the movie.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]]
      }
    });
    ctx.session.step = "ai_movie_video";
  });

  bot.action("manual_add_movie", async (ctx) => {
    await ctx.answerCbQuery("Adding a movie manually.");
    await ctx.editMessageText("✍️ Please send the Name of the movie.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]]
      }
    });
    ctx.session.step = "manual_movie_name";
  });

  bot.action("ai_add_series", async (ctx) => {
    await ctx.answerCbQuery("Adding a series with AI.");
    await ctx.editMessageText("🤖 Please send the Name of the series.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]]
      }
    });
    ctx.session.step = "ai_series_name";
  });

  bot.action("manual_add_series", async (ctx) => {
    await ctx.answerCbQuery("Adding a series manually.");
    await ctx.editMessageText("✍️ Please send the Name of the series.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel_add" }]]
      }
    });
    ctx.session.step = "manual_series_name";
  });

  bot.action("cancel_add", async (ctx) => {
    await ctx.answerCbQuery("Action cancelled.");
    delete ctx.session.step;
    delete ctx.session.movieData;
    delete ctx.session.seriesData;
    await ctx.editMessageText("❌ Action cancelled successfully.");
  });

  bot.action("skip_teaser_movie", async (ctx) => {
    // Teaser skipped for AI movie
    await ctx.answerCbQuery("Teaser skipped.");
    await ctx.editMessageText("Teaser skipped. Now, please send the Movie Name so AI can generate the details.");
    ctx.session.step = "ai_movie_name";
  });

  bot.action("skip_teaser_manual_movie", async (ctx) => {
    await ctx.answerCbQuery("Teaser skipped.");
    await ctx.editMessageText("Teaser skipped. Saving movie...");
    // Will implement save logic here or defer to textHandler
    // We will call a function to save the manual movie here
    import("#controllers/add_new/movieSave.js").then(m => m.saveManualMovie(ctx));
  });

  bot.action("skip_teaser_series", async (ctx) => {
    await ctx.answerCbQuery("Teaser skipped.");
    await ctx.editMessageText("Teaser skipped. Please send the video for Episode 1.");
    ctx.session.step = "ai_series_episodes";
  });

  bot.action("done_series", async (ctx) => {
    await ctx.answerCbQuery("Series episodes done.");
    await ctx.editMessageText("Saving series...");
    import("#controllers/series/saveSeries.js").then(m => m.default(ctx, ctx.session, ctx.from.id));
  });


  bot.action(/list_page_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await handlePagination(ctx, bot, page, Movie, Series, 10, {}, "list_page_");
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
    // Keep it just in case someone clicks an old button
    await ctx.answerCbQuery("Use the new menu.");
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

        await ctx.reply("🚀 <b>Verification Successful!</b>\n\nYou're now part of our community. Use the dashboard below to explore our library, request new content, or contact our support team.", {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 Search Movies & Series", switch_inline_query_current_chat: "" }],
              [
                {
                  text: isAdmin ? "➕ Add New Content" : "💬 Contact Support",
                  callback_data: isAdmin ? "add" : "feedback",
                },
              ],
              isAdmin ? [{ text: "👥 Manage Users", callback_data: "admin_user_list_0" }] : [],
              [
                {
                  text: "🎬 Request a Movie",
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

  bot.action(/admin_user_list_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    const { handleUserList } = await import("#utilities/userList.js");
    await handleUserList(ctx, bot, page);
  });

  bot.action(/chat_with_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    ctx.session.step = `chatting_with_${targetUserId}`;
    await ctx.answerCbQuery(`Chat started with ${targetUserId}`);
    await ctx.reply(`💬 <b>Chat Mode Enabled</b>\n\nAny message you send now will be forwarded to the user (ID: <code>${targetUserId}</code>).\n\nType <code>/endchat</code> to exit.`, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ End Chat", callback_data: "end_chat" }]]
      }
    });
  });

  bot.action("close_user_list", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
  });

  bot.action("end_chat", async (ctx) => {
    delete ctx.session.step;
    await ctx.answerCbQuery("Chat ended.");
    await ctx.reply("❌ Chat session closed.");
  });

  bot.action("feedback", async (ctx) => {
    try {
      ctx.session.step = "chatting_with_admin";
      await ctx.answerCbQuery("Support chat started.");
      await ctx.reply("💬 <b>Admin Support Chat</b>\n\nYou can now send messages directly to our admin team. We will get back to you as soon as possible!\n\nType <code>/endchat</code> to exit.", {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "❌ End Chat", callback_data: "end_chat" }]]
        }
      });
    } catch (error) {
      console.error("Error in feedback action:", error);
      await ctx.reply(
        "An error occurred while processing your feedback. Please try again."
      );
      await adminNotifier(bot, error, ctx, "Feedback action error");
    }
  });


  bot.action(/ser_(.+)_(.+)_(.+)/, async (ctx) => {
    try {
      const seriesId = ctx.match[1];
      const seasonNum = ctx.match[2];
      const episodeNum = ctx.match[3];

      const series = await Series.findById(seriesId);
      if (!series) {return ctx.answerCbQuery("Series not found.");}

      const season = series.series.find(s => s.seasonNumber === seasonNum);
      if (!season) {return ctx.answerCbQuery("Season not found.");}

      const episode = season.episodes.find(e => e.episodeNumber === episodeNum);
      if (!episode) {return ctx.answerCbQuery("Episode not found.");}

      await ctx.answerCbQuery(`Season ${seasonNum}, Episode ${episodeNum}`);

      const { generateSeriesKeyboard } = await import("#utilities/seriesNav.js");
      const keyboard = generateSeriesKeyboard(series._id, seasonNum, episodeNum, season.episodes.length);
      
      const userId = ctx.from.id;
      const isAdmin = userId === parseInt(process.env.ADMIN_ID) || ctx.from.username?.toLowerCase() === process.env.ADMIN?.toLowerCase();
      const user = await User.findOne({ telegramId: userId.toString() });
      const isInWatchlist = user?.savedMovies?.includes(series._id.toString());
      
      const interactiveKeyboard = await generateInteractiveKeyboard(ctx, series, isInWatchlist, isAdmin);
      const fullKeyboard = [...keyboard, ...interactiveKeyboard];

      await ctx.editMessageMedia({
        type: 'video',
        media: episode.fileId,
        caption: `<b>${series.name.toUpperCase()}</b>\n\nSeason ${seasonNum}, Episode ${episodeNum}\n\n<i>${series.caption || ""}</i>`,
        parse_mode: 'HTML'
      }, {
        reply_markup: { inline_keyboard: fullKeyboard }
      });

    } catch (error) {
      console.error("Error in series navigation:", error);
      await ctx.answerCbQuery("Error loading episode.");
    }
  });
}


