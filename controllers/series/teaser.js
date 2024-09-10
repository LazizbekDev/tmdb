export default async function seriesTeaser (ctx, userState, userId, file) {
    userState[userId] = {
        step: "awaitingSeriesFiles", // Change to awaiting series files
        seriesName: userState[userId].seriesName,
        seasonNumber: userState[userId].seasonNumber, // Convert season to number
        caption: userState[userId].caption,
        keywords: userState[userId].keywords,
        teaser: file.file_id,
        episodes: [], // Array to store episodes
        episodeNumber: 1, // Start from the first episode
    };

    await  ctx.reply(
        "Now send the series episodes one by one. Press 'Done' when finished.",
        {
            reply_markup: {
                keyboard: [[{ text: "Done" }]],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        }
    );
};