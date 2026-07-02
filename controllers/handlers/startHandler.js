import Movie from "#model/MovieModel.js";
import Series from "#model/SeriesModel.js";
import User from "#model/User.js";
import AccessLog from "#model/AccessLog.js";
import { checkUserMembership, startMessage } from "#controllers/start.js";
import { startOnboarding } from "#controllers/handlers/onboardingHandler.js";
import { notifyAdminContentAccessed } from "#utilities/admin_notifier.js";
import { sendJoinWarning, generateInteractiveKeyboard, extractGenres } from "#utilities/utilities.js";
import { getOrCreateReaction, reactToMessage } from "#utilities/aiReaction.js";
import { getWeeklyTrendingItems } from "#utilities/trending.js";

async function sendUnlockMoment(ctx, content, user, isFirstAccess) {
  if (!isFirstAccess) {
    return null;
  }

  const reaction = await getOrCreateReaction(content, user);
  await reactToMessage(ctx, reaction.emoji);

  const feedbackText = `${reaction.intro}\n${reaction.body}`;
  if (ctx.update?.callback_query) {
    await ctx.answerCbQuery(feedbackText);
  } else {
    await ctx.reply(feedbackText, { parse_mode: "HTML" });
  }

  return reaction;
}

async function sendMovieDeepLink(ctx, movie, user, isMember, hasAccessedBefore, isAdmin) {
  const userId = ctx.message.from.id;
  const userIdStr = userId.toString();
  const shouldProtect = !isMember && !hasAccessedBefore;
  const isInWatchlist = user.savedMovies?.includes(movie._id.toString());
  const isFirstAccess = !hasAccessedBefore;

  if (isFirstAccess) {
    movie.accessedBy.push(userIdStr);
    movie.views += 1;
    await movie.save();
    user.accessedMovies.push(movie._id);
    await user.save();
    await AccessLog.create({ contentType: "Movie", userId: userIdStr, contentId: movie._id });
    await notifyAdminContentAccessed(ctx, ctx.message.from, movie, "Movie");
  }

  await sendUnlockMoment(ctx, movie, user, isFirstAccess);

  const keyboard = await generateInteractiveKeyboard(ctx, movie, isInWatchlist, isAdmin, isFirstAccess);

  const botUsername = ctx.botInfo.username;
  const targetTags = extractGenres(movie.keywords);
  let similarMovies = [];

  if (targetTags.length > 0) {
    const regexQueries = targetTags.map(tag => ({
      keywords: { $regex: '#' + tag, $options: 'i' }
    }));
    const candidates = await Movie.find({
      _id: { $ne: movie._id },
      $or: regexQueries
    }).select('_id name keywords views');

    const moviesWithOverlap = candidates.map(otherMovie => {
      const otherMovieTags = extractGenres(otherMovie.keywords);
      const intersection = targetTags.filter(tag => otherMovieTags.includes(tag));
      return {
        _id: otherMovie._id,
        name: otherMovie.name,
        views: otherMovie.views || 0,
        intersectionSize: intersection.length
      };
    });

    similarMovies = moviesWithOverlap
      .filter(m => m.intersectionSize > 0)
      .sort((a, b) => b.intersectionSize - a.intersectionSize || b.views - a.views)
      .slice(0, 3);
  }

  if (similarMovies.length < 3) {
    const extraMovies = await Movie.aggregate([
      { $match: { _id: { $ne: movie._id, $nin: similarMovies.map(m => m._id) } } },
      { $sample: { size: 3 - similarMovies.length } },
      { $project: { _id: 1, name: 1 } }
    ]);
    similarMovies.push(...extraMovies);
  }

  const excludeIds = [movie._id, ...similarMovies.map(m => m._id)];
  const trendingMovies = await getWeeklyTrendingItems({
    limit: 2,
    excludeIds,
    days: 7,
  });

  let newCaption = `🎬 <b>${movie.name.toUpperCase()}</b>\n\n`;

  if (similarMovies.length > 0) {
    newCaption += `<b>🔗 Similar Movies:</b>\n`;
    similarMovies.forEach((m, idx) => {
      newCaption += `${idx + 1}. <a href="https://t.me/${botUsername}?start=${m._id}">${m.name}</a>\n`;
    });
    newCaption += `\n`;
  }

  if (trendingMovies.length > 0) {
    newCaption += `<b>🔥 This Week's Picks:</b>\n`;
    trendingMovies.forEach((item, idx) => {
      newCaption += `${idx + 1}. <a href="https://t.me/${botUsername}?start=${item.data._id}">${item.data.name}</a>\n`;
    });
  }

  await ctx.replyWithVideo(movie.movieUrl, {
    caption: newCaption,
    parse_mode: "HTML",
    protect_content: shouldProtect,
    reply_markup: { inline_keyboard: keyboard },
  });

  if (!isMember && isFirstAccess) {
    user.accessCount++;
    await user.save();
    return sendJoinWarning(ctx);
  }
}

async function sendSeriesDeepLink(ctx, series, user, isMember, hasAccessedBefore, isAdmin) {
  const userIdStr = ctx.message.from.id.toString();
  const isInWatchlist = user.savedMovies?.includes(series._id.toString());
  const isFirstAccess = !hasAccessedBefore;

  if (isFirstAccess) {
    series.accessedBy = series.accessedBy || [];
    series.accessedBy.push(userIdStr);
    series.views += 1;
    await series.save();
    await AccessLog.create({ contentType: "Series", userId: userIdStr, contentId: series._id });
    await notifyAdminContentAccessed(ctx, ctx.message.from, series, "Series");
  }

  await sendUnlockMoment(ctx, series, user, isFirstAccess);

  const sortedSeasons = series.series.sort((a, b) => parseInt(a.seasonNumber) - parseInt(b.seasonNumber));
  const firstSeason = sortedSeasons[0];
  if (!firstSeason || !firstSeason.episodes.length) {
    return ctx.reply("No episodes found for this series.");
  }

  const sortedEpisodes = firstSeason.episodes.sort((a, b) => parseInt(a.episodeNumber) - parseInt(b.episodeNumber));
  const firstEpisode = sortedEpisodes[0];

  const { generateSeriesKeyboard } = await import("#utilities/seriesNav.js");
  const keyboard = generateSeriesKeyboard(series._id, firstSeason.seasonNumber, firstEpisode.episodeNumber, firstSeason.episodes.length);

  const interactiveKeyboard = await generateInteractiveKeyboard(ctx, series, isInWatchlist, isAdmin, isFirstAccess);
  const fullKeyboard = [...keyboard, ...interactiveKeyboard];

  await ctx.replyWithVideo(firstEpisode.fileId, {
    caption: `<b>${series.name.toUpperCase()}</b>\n\nSeason ${firstSeason.seasonNumber}, Episode ${firstEpisode.episodeNumber}\n\n<i>${series.caption || ""}</i>`,
    parse_mode: "HTML",
    protect_content: !isMember,
    reply_markup: { inline_keyboard: fullKeyboard },
  });

  if (!isMember && isFirstAccess) {
    user.accessCount++;
    await user.save();
    return sendJoinWarning(ctx);
  }
}

export async function handleStart(ctx) {
  if (ctx.session) {
    delete ctx.session.step;
  }

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
        savedMovies: [],
      });
      await user.save();
    }

    if (!isMember && user.accessCount >= limit) {
      return ctx.reply(
        `🎭 <b>Membership Required</b>\n\nYou've reached your free limit for today. To unlock unlimited access to our entire library of movies and series, please join our official community channel below.\n\n✨ <i>Joining takes just a second and ensures you never miss a new release!</i>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 Join Official Channel", url: `https://t.me/${process.env.CHANNEL_USERNAME}` }],
              [{ text: "✅ I have joined", callback_data: "check_membership" }],
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
        return sendMovieDeepLink(ctx, movie, user, isMember, hasAccessedBefore, isAdmin);
      }

      const series = await Series.findById(payload);
      if (series) {
        const userIdStr = userId.toString();
        const hasAccessedBefore = series.accessedBy?.includes(userIdStr);
        return sendSeriesDeepLink(ctx, series, user, isMember, hasAccessedBefore, isAdmin);
      }

      return ctx.reply(
        "<b>⚠️ CONTENT NOT FOUND</b>\n\nSorry, the movie or series you are looking for doesn't exist or has been removed.\n\nTry searching for something else or explore our full library! 🍿",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 Search Again", switch_inline_query_current_chat: "" }],
              [{ text: "📜 Browse Movie List", callback_data: "page_1" }],
            ],
          },
        }
      );
    }

    if (!user.onboardingCompleted) {
      return startOnboarding(ctx, user);
    }

    startMessage(ctx);
  } catch (error) {
    console.error("❌ Error in handleStart:", error);
    return ctx.reply("⚠️ Something went wrong. Please try again later.");
  }
}
