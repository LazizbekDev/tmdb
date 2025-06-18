import Series from "../../../model/SeriesModel.js";

export default async function saveNewSeason(ctx) {
  const { seriesId, seasonNumber, episodes } = ctx.session;

  // Check if necessary data is present
  if (!seriesId || !seasonNumber || !Array.isArray(episodes)) {
    return ctx.reply("Incomplete session data. Please start over.");
  }

  // Find the series and add the new season
  const series = await Series.findById(seriesId);

  if (!series) {
    return ctx.reply("Series not found.");
  }

  series.series.push({
    seasonNumber,
    episodes,
  });

  await series.save();

  // Clear the session
  delete ctx.session;

  await ctx.reply(`Season ${seasonNumber} saved successfully!`, {
    reply_markup: {
      remove_keyboard: true,
    },
  });
}
