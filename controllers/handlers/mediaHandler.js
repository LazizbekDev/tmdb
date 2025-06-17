import movie from "./../add_new/movie.js";
import teaser from "./../add_new/teaser.js";
import episodes from "./../series/episodes.js";
import addNewEpisode from "../series/seasons/add_new.js";
import seriesTeaser from "../series/teaser.js";

export async function handleVideoOrDocument(ctx, userState) {
  const userId = ctx.from.id;
  const file = ctx.message.video || ctx.message.document;

  if (ctx.message.document && !ctx.message.document.mime_type.startsWith("video/")) {
    return ctx.reply("Please send a valid video file (mp4, mkv, etc.).");
  }

  if (!userState[userId]) {
    return ctx.reply("Please start by using the /start command.");
  }

  try {
    switch (userState[userId].step) {
      case "awaitingSeriesFiles":
        await episodes(ctx, userState, userId, file);
        break;
      case "awaitingNewSeasonDetails":
        await addNewEpisode(ctx, userState, userId, file);
        break;
      case "awaitingVideo":
        await movie(ctx, userState, file);
        break;
      case "awaitingTeaser":
        await teaser(ctx, userState);
        break;
      case "awaitingSeriesTeaser":
        await seriesTeaser(ctx, userState, userId, file);
        break;
      default:
        await ctx.reply("Unknown step. Please start by using the /start command.");
    }
  } catch (error) {
    console.error("Error handling video or document:", error);
    await ctx.reply("An error occurred while processing your request.");
  }
}