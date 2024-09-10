export default async function episodes(ctx, userState, userId, file) {
    const { episodeNumber } = userState[userId];

    // Add the episode to the user's episode list
    userState[userId].episodes.push({
        episodeNumber: episodeNumber, // Track episode number
        fileId: file.file_id, // Store the fileId
    });

    // Increment episode number for the next upload
    userState[userId].episodeNumber += 1;

    await ctx.reply(
        `Episode ${episodeNumber} added! Send the next episode or press 'Done'.`
    );
}
