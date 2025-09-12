export default async function info(ctx) {
  const [name, caption, keywords] = ctx.message.text
    .split("|")
    .map((text) => text.trim());

  if (!name || !caption || !keywords) {
    return ctx.reply(
      "Please make sure to send all required fields in the correct format:\n\nname | caption | keywords"
    );
  }

  // Avvalgi sessiondagi ma'lumotlarni saqlab qolamiz (agar mavjud bo‘lsa)
  const { videoFileId, fileType, movieSize, duration } = ctx.session;

  // Yangi session holatini yozish
  ctx.session.step = "awaitingTeaser";
  ctx.session.name = name;
  ctx.session.caption = caption;
  ctx.session.keywords = keywords;

  if (videoFileId) ctx.session.videoFileId = videoFileId;
  if (fileType) ctx.session.fileType = fileType;
  if (movieSize) ctx.session.movieSize = movieSize;
  if (duration) ctx.session.duration = duration;

  return await ctx.reply("Now send the teaser video");
}
