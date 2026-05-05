export default async function episodes(ctx, file) {
    if (!ctx.session.seriesData) {
        ctx.session.seriesData = {};
    }
    // Ensure episodes array exists in session, initialize if not
    if (!ctx.session.seriesData.episodes) {
        ctx.session.seriesData.episodes = [];
        ctx.session.seriesData.episodeNumber = 1; // Start with episode 1
    }

    const { episodeNumber } = ctx.session.seriesData;

    // Add the episode to the user's episode list
    ctx.session.seriesData.episodes.push({
        episodeNumber: episodeNumber, // Track episode number
        fileId: file.file_id, // Store the fileId
    });

    // Increment episode number for the next upload
    ctx.session.seriesData.episodeNumber += 1;

    await ctx.reply(`Episode ${episodeNumber} added! Send the next episode or press the Done button.`, {
        reply_markup: {
            inline_keyboard: [[{ text: "✅ Done", callback_data: "done_series" }]]
        }
    });
}