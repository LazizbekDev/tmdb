import { updateMovie, updateTeaser } from "#controllers/add_new/movie.js";
import { processVideoData } from "#utilities/videoFormatter.js";
import episodes from "#controllers/series/episodes.js";
import addNewEpisode from "#controllers/series/seasons/add_new.js";

export async function handleVideoOrDocument(ctx) {
  const file = ctx.message.video || ctx.message.document;
  const ctxData = ctx.session;

  if (
    ctx.message.document &&
    !ctx.message.document.mime_type.startsWith("video/")
  ) {
    return ctx.reply("Please send a valid video file (mp4, mkv, etc.).");
  }

  if (!ctxData || !ctxData.step) {
    return ctx.reply("Please start by using the /start command.");
  }

  try {
    // --- Chat Forwarding Logic ---
    if (ctxData.step && ctxData.step.startsWith("chatting_with_")) {
      const targetId = ctxData.step.replace("chatting_with_", "");
      try {
        if (targetId === "admin") {
          const userLink = `<a href='tg://user?id=${ctx.from.id}'>${ctx.from.first_name}</a>`;
          const usernameDisplay = ctx.from.username ? ` (@${ctx.from.username})` : "";
          await ctx.telegram.sendVideo(process.env.ADMIN_ID, file.file_id, {
            caption: `💬 <b>Media from</b> ${userLink}${usernameDisplay}`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "💬 Reply", callback_data: `chat_with_${ctx.from.id}` }]]
            }
          });
          return ctx.reply("✅ Your media has been sent to the admin.");
        } else {
          await ctx.telegram.sendVideo(targetId, file.file_id, {
            caption: `💬 <b>Admin sent you a media</b>`,
            parse_mode: "HTML"
          });
          return ctx.reply("✅ Media sent.");
        }
      } catch (err) {
        console.error("Chat media error:", err);
        return ctx.reply("❌ Failed to forward media.");
      }
    }

    switch (ctxData.step) {
      // --- AI Movie Flow ---
      case "ai_movie_video":
        ctx.session.movieData = processVideoData(file);
        ctx.session.step = "ai_movie_teaser";
        await ctx.reply("Video received. Please send the teaser video.", {
          reply_markup: {
            inline_keyboard: [[{ text: "⏭ Skip Teaser", callback_data: "skip_teaser_movie" }]]
          }
        });
        break;
      case "ai_movie_teaser":
        ctx.session.movieData.teaser = file.file_id;
        ctx.session.step = "ai_movie_name";
        await ctx.reply("Teaser received. Now, please send the Movie Name so AI can generate the details.");
        break;

      // --- Manual Movie Flow ---
      case "manual_movie_video":
        if (!ctx.session.movieData) {ctx.session.movieData = {};}
        Object.assign(ctx.session.movieData, processVideoData(file));
        ctx.session.step = "manual_movie_teaser";
        await ctx.reply("Video received. Please send the teaser video.", {
          reply_markup: {
            inline_keyboard: [[{ text: "⏭ Skip Teaser", callback_data: "skip_teaser_manual_movie" }]]
          }
        });
        break;
      case "manual_movie_teaser":
        ctx.session.movieData.teaser = file.file_id;
        await ctx.reply("Teaser received. Saving movie...");
        import("#controllers/add_new/movieSave.js").then(m => m.saveManualMovie(ctx));
        break;

      // --- AI Series Flow ---
      case "ai_series_teaser":
        if (!ctx.session.seriesData) {ctx.session.seriesData = {};}
        ctx.session.seriesData.teaser = file.file_id;
        ctx.session.step = "ai_series_episodes";
        await ctx.reply("Teaser received. Please send the video for Episode 1.");
        break;
      
      // --- Manual Series Flow ---
      case "manual_series_teaser":
        if (!ctx.session.seriesData) {ctx.session.seriesData = {};}
        ctx.session.seriesData.teaser = file.file_id;
        ctx.session.step = "manual_series_episodes";
        await ctx.reply("Teaser received. Please send the video for Episode 1.");
        break;

      case "ai_series_episodes":
      case "manual_series_episodes":
      case "awaitingSeriesFiles":
        await episodes(ctx, file);
        break;

      case "awaitingNewSeasonDetails":
        await addNewEpisode(ctx, file);
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
