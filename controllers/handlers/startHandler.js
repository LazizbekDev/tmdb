import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import User from "../../model/User.js";
import AccessLog from "../../model/AccessLog.js";
import { checkUserMembership, startMessage } from "../start.js";
import caption from "../../utilities/caption.js";
import { notifyAdminContentAccessed } from "../../utilities/admin_notifier.js";
import { sendJoinWarning, generateInteractiveKeyboard } from "../../utilities/utilities.js";

export async function handleStart(ctx) {
  const userId = ctx.message.from.id;
  const payload = ctx.startPayload;
  const userFirstName = ctx.message.from.first_name;
  const userUsername = ctx.message.from.username || "";
  const limit = parseInt(process.env.LIMIT) || 2;
  const isAdmin = 
    ctx.message.from?.username?.toLowerCase() === process.env.ADMIN?.toLowerCase() || 
    userId === parseInt(process.env.ADMIN_ID);

  try {
    const isMember = await checkUserMembership(userId);

    let user = await User.findOne({ telegramId: userId });
    if (!user) {
      user = new User({
        telegramId: userId,
        firstName: userFirstName,
        username: userUsername,
        accessCount: 0,
        inActive: false,
        createdAt: new Date(),
        watchlist: [],
      });
      await user.save();
    }

    if (!isMember && user.accessCount >= limit) {
      return ctx.reply(
        `🎬 You can only get a movie after joining our channel. You’ve reached your free access limit.\n\nPlease join the <a href='https://t.me/${process.env.CHANNEL_USERNAME}'>channel</a> to continue enjoying the bot!`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Join Now", url: `https://t.me/${process.env.CHANNEL_USERNAME}` }],
              [{ text: "Check Membership", callback_data: "check_membership" }],
            ],
          },
        }
      );
    }

    if (payload) {
      const movie = await Movie.findById(payload);
      if (movie) {
        const userIdStr = userId.toString();
        const hasAccessedBefore = movie.accessedBy.includes(userIdStr);
        const shouldProtect = !isMember && !hasAccessedBefore;
        const isInWatchlist = user.savedMovies?.includes(movie._id.toString());

        if (!hasAccessedBefore) {
           movie.accessedBy.push(userIdStr);
           movie.views += 1;
           await movie.save();
           user.accessedMovies.push(movie._id);
           await user.save();
           await AccessLog.create({ contentType: "Movie", userId: userIdStr, contentId: movie._id });
           await notifyAdminContentAccessed(ctx, ctx.message.from, movie, "Movie");
        }

        const keyboard = await generateInteractiveKeyboard(ctx, movie, isInWatchlist, isAdmin);

        await ctx.replyWithVideo(movie.movieUrl, {
          caption: caption(movie, false),
          parse_mode: "HTML",
          protect_content: shouldProtect,
          reply_markup: { inline_keyboard: keyboard },
        });

        if (!isMember && !hasAccessedBefore) {
          user.accessCount++;
          await user.save();
          return sendJoinWarning(ctx);
        }
        return;
      }

      const series = await Series.findById(payload);
      if (series) {
        const userIdStr = userId.toString();
        const hasAccessedBefore = series.accessedBy?.includes(userIdStr);
        const isInWatchlist = user.savedMovies?.includes(series._id.toString());

        if (!hasAccessedBefore) {
          series.accessedBy = series.accessedBy || [];
          series.accessedBy.push(userIdStr);
          series.views += 1;
          await series.save();
          await AccessLog.create({ contentType: "Series", userId: userIdStr, contentId: series._id });
          await notifyAdminContentAccessed(ctx, ctx.message.from, series, "Series");
        }

        let totalEpisodes = 0;
        const sortedSeasons = series.series.sort((a, b) => a.seasonNumber - b.seasonNumber);
        
        for (const season of sortedSeasons) {
          totalEpisodes += season.episodes.length;
          const sortedEpisodes = season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
          
          for (const episode of sortedEpisodes) {
            await ctx.replyWithVideo(episode.fileId, {
              caption: `<b>${series.name.toUpperCase()}</b>\nSeason ${season.seasonNumber}, Episode ${episode.episodeNumber}`,
              parse_mode: "HTML",
              protect_content: !isMember,
            });
          }
        }

        const keyboard = await generateInteractiveKeyboard(ctx, series, isInWatchlist, isAdmin);
        
        await ctx.reply(
          `🎬 <b>${series.name}</b>\n📚 Season: <b>${series.series[0]?.seasonNumber || 1}</b>\n🎞 Total Episodes: <b>${totalEpisodes}</b>\n\nUse /list to explore more or hit the button below to search.`,
          {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: keyboard },
          }
        );

        if (!isMember && !hasAccessedBefore) {
          user.accessCount++;
          await user.save();
          return sendJoinWarning(ctx);
        }
        return;
      }

      return ctx.reply(
        "Sorry, the movie or series you are looking for does not exist.\nClick /list to see the table of content",
        {
          reply_markup: {
            inline_keyboard: [[{ text: "Search", switch_inline_query_current_chat: "" }]],
          },
        }
      );
    }

    startMessage(ctx);
  } catch (error) {
    console.error("❌ Error in handleStart:", error);
    return ctx.reply("⚠️ Something went wrong. Please try again later.");
  }
}