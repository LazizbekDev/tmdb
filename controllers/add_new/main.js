export default async function add(ctx) {
    const isAdmin = ctx.from.username?.toLowerCase() === process.env.ADMIN?.toLowerCase();
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
                        { text: "🤖 Add Movie (AI)", callback_data: "ai_add_movie" },
                        { text: "✍️ Add Movie (Manual)", callback_data: "manual_add_movie" },
                    ],
                    [
                        { text: "🤖 Add Series (AI)", callback_data: "ai_add_series" },
                        { text: "✍️ Add Series (Manual)", callback_data: "manual_add_series" },
                    ],
                    [
                        { text: "➕ New season", callback_data: "add_season" },
                    ],
                    [
                        { text: "❌ Cancel", callback_data: "cancel_add" },
                    ],
                ],
            },
        }
    );
}