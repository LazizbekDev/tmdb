import Series from "../../../model/SeriesModel.js";

export default async function addNewEpisode(ctx, file) {
    const { seriesId } = ctx.session;

    const series = await Series.findById(seriesId);

    if (!series) {
        console.log(seriesId);
        return ctx.reply("Series not found.");
    }

    // Add the episode to the new season in the session
    ctx.session.episodes = ctx.session.episodes || [];
    ctx.session.seasonNumber = ctx.session.seasonNumber || series.series.length + 1;
    const currentSeason = ctx.session.seasonNumber || series.series.length + 1;
    const episodeNumber = ctx.session.episodeNumber || 1;

    ctx.session.episodes.push({
        episodeNumber: episodeNumber,
        fileId: file.file_id,
    });

    // Increment episode number for the next upload
    ctx.session.episodeNumber = episodeNumber + 1;

    await ctx.reply(
        `Episode ${episodeNumber} added to season ${currentSeason}! Send the next episode or press 'Done'.`
    );
}