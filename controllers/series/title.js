export default async function title(ctx, userState, userId) {
    const [name, season, caption, keywords] = ctx.message.text
        .split("|")
        .map((s) => s.trim());

    // Store series information and initialize episode number
    userState[userId] = {
        step: "awaitingSeriesTeaser", // Change to awaiting series files
        seriesName: name,
        seasonNumber: parseInt(season), // Convert season to number
        caption: caption,
        keywords: keywords?.split(","),
        episodes: [], // Array to store episodes
        episodeNumber: 1, // Start from the first episode
    };

    await ctx.reply("Now send the teaser of the series");
}
