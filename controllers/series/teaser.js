export default async function seriesTeaser (ctx, file) {
    ctx.session = {
        step: "awaitingSeriesFiles", // Change to awaiting series files
        seriesName: ctx.session.seriesName,
        seasonNumber: ctx.session.seasonNumber, // Convert season to number
        caption: ctx.session.caption,
        keywords: ctx.session.keywords,
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