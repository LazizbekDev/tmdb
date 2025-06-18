export default async function episodes(ctx, file) {
    // Ensure episodes array exists in session, initialize if not
    if (!ctx.session.episodes) {
        ctx.session.episodes = [];
        ctx.session.episodeNumber = 1; // Start with episode 1
    }

    const { episodeNumber } = ctx.session;

    // Add the episode to the user's episode list
    ctx.session.episodes.push({
        episodeNumber: episodeNumber, // Track episode number
        fileId: file.file_id, // Store the fileId
    });

    // Increment episode number for the next upload
    ctx.session.episodeNumber += 1;

    await ctx.reply(`Episode ${episodeNumber} added! Send the next episode or press 'Done'.`);
}