export default async function add(ctx) {
    const isAdmin = ctx.from.username.toLowerCase() === process.env.ADMIN;
    if (!isAdmin) {
        return ctx.reply("You are not authorized to add media files.");
    }

    // Edit the message to ask if the user wants to add a movie or a series
    await ctx.editMessageText(
        "You're going to add media. Would you like to add a movie or a series?",
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Movie", callback_data: "add_movie" },
                        { text: "Series", callback_data: "add_series" },
                    ],
                    [
                        {
                            text: "New season",
                            callback_data: "add_season",
                        },
                    ],
                ],
            },
        }
    );
}