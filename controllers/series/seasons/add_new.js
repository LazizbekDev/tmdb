import Series from "../../../model/SeriesModel.js";

export default async function addNewEpisode(ctx, userState, userId, file) {
    const { seriesId } = userState[userId];

    const series = await Series.findById(seriesId);

    if (!series) {
        console.log(seriesId);
        return ctx.reply("Series not found.");
    }

    // Add the episode to the new season in the user state
    userState[userId].episodes = userState[userId].episodes || [];
    userState[userId].seasonNumber = userState[userId].seasonNumber || series.series.length + 1;
    const currentSeason =
        userState[userId].seasonNumber || series.series.length + 1;
    const episodeNumber = userState[userId].episodeNumber || 1;

    userState[userId].episodes.push({
        episodeNumber: episodeNumber,
        fileId: file.file_id,
    });
    // Increment episode number for the next upload
    userState[userId].episodeNumber = episodeNumber + 1;

    await ctx.reply(
        `Episode ${episodeNumber} added to season ${currentSeason}! Send the next episode or press 'Done'.`
    );
}
