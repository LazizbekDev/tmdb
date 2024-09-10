import Series from "../../../model/SeriesModel.js";

export default async function saveNewSeason(ctx, userState, userId) {
    const seriesId = userState[userId].seriesId;
    const seasonNumber = userState[userId].seasonNumber;
    const episodes = userState[userId].episodes;

    // Find the series and add the new season
    const series = await Series.findById(seriesId);

    if (!series) {
        return ctx.reply("Series not found.");
    }

    series.series.push({
        seasonNumber: seasonNumber,
        episodes: episodes,
    });

    await series.save();

    // Clear the user state
    delete userState[userId];

    await ctx.reply(`Season ${seasonNumber} saved successfully!`, {
        reply_markup: {
            remove_keyboard: true, // Remove the keyboard after done
        },
    });
}
