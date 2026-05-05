import { sendUpdateMessage } from "#utilities/updateFilm.js";

export default async function movie(ctx, file) {
  if (!file) {
    return ctx.reply("Please send a valid video file.");
  }

  const fileType = file.mime_type;

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} bytes`;
    else if (size < 1048576) return `${(size / 1024).toFixed(2)} KB`;
    else if (size < 1073741824) return `${(size / 1048576).toFixed(2)} MB`;
    else return `${(size / 1073741824).toFixed(2)} GB`;
  };
}

export const updateMovie = async (ctx, file) => {
  if (!file) {
    return ctx.reply("Please send a valid video file.");
  }

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} bytes`;
    else if (size < 1048576) return `${(size / 1024).toFixed(2)} KB`;
    else if (size < 1073741824) return `${(size / 1048576).toFixed(2)} MB`;
    else return `${(size / 1073741824).toFixed(2)} GB`;
  };

  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const paddedHours = hours.toString().padStart(2, "0");
    const paddedMinutes = minutes.toString().padStart(2, "0");
    const paddedSeconds = secs.toString().padStart(2, "0");

    return `${paddedHours}h ${paddedMinutes}m ${paddedSeconds}s`;
  }

  ctx.session.updateFields.movieUrl = file.file_id;
  ctx.session.updateFields.fileType = file.mime_type;
  ctx.session.updateFields.size = formatFileSize(file.file_size);
  ctx.session.updateFields.duration = formatDuration(file.duration);

  ctx.session.step = "update_teaser";
  await sendUpdateMessage(
    ctx,
    "Film received. Please choose an option for the teaser video update:",
    ctx.session.targetContentId,
    "teaser",
    ctx.session.isSeriesUpdate
  );
};

export const updateTeaser = async (ctx) => {
  const teaser = ctx.message.video;
  ctx.session.updateFields.teaser = teaser.file_id;

  ctx.session.step = "keywords_input";
  await sendUpdateMessage(
    ctx,
    "Teaser received. Please choose an option for the keywords update:",
    ctx.session.targetContentId,
    "keywords",
    ctx.session.isSeriesUpdate
  );
};

