import movie, { updateMovie, updateTeaser } from "./../add_new/movie.js";
import teaser from "./../add_new/teaser.js";
import episodes from "./../series/episodes.js";
import addNewEpisode from "../series/seasons/add_new.js";
import seriesTeaser from "../series/teaser.js";

export async function handleVideoOrDocument(ctx) {
  const file = ctx.message.video || ctx.message.document;
  const ctxData = ctx.session;

  if (
    ctx.message.document &&
    !ctx.message.document.mime_type.startsWith("video/")
  ) {
    return ctx.reply("Please send a valid video file (mp4, mkv, etc.).");
  }

  if (!ctxData && !ctxData.step) {
    return ctx.reply("Please start by using the /start command.");
  }

  try {
    switch (ctxData.step) {
      case "awaitingSeriesFiles":
        await episodes(ctx, file);
        break;
      case "awaitingNewSeasonDetails":
        await addNewEpisode(ctx, file);
        break;
      case "awaitingVideo":
        await movie(ctx, file);
        break;
      case "awaitingTeaser":
        await teaser(ctx);
        break;
      case "awaitingSeriesTeaser":
        await seriesTeaser(ctx, file);
        break;
      case "update_film":
        await updateMovie(ctx, file);
        break;
      case "update_teaser":
        await updateTeaser(ctx);
        break;
      default:
        await ctx.reply(
          "Unknown step. Please start by using the /start command."
        );
    }
  } catch (error) {
    console.error("Error handling video or document:", error);
    await ctx.reply("An error occurred while processing your request.");
  }
}
