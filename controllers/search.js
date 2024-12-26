import Movie from "../model/MovieModel.js";
import Series from "../model/SeriesModel.js";

export default async function search(ctx) {
    const query = ctx.inlineQuery.query;
    if (!query) return;

    try {
        const [movies, seriesList] = await Promise.all([
            Movie.find({
                $or: [
                    { name: { $regex: query, $options: "i" } },
                    { keywords: { $regex: query, $options: "i" } },
                ],
            }),
            Series.find({
                $or: [
                    { name: { $regex: query, $options: "i" } },
                    { keywords: { $regex: query, $options: "i" } },
                ],
            }),
        ]);

        const combinedResults = [
            ...movies.map((movie) => ({
                type: "article",
                id: `movie_${movie._id.toString()}`,
                title: `🎞 Movie: ${movie.name}`,
                input_message_content: {
                    message_text: `
🎞 <a href='https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}'><b>${
                        movie.name
                    }</b></a>

<i>${movie.caption}</i>

▪️Size: ${movie.size}
▪️Running time: ${movie.duration}

${movie.keywords.join(",")}
`,
                    parse_mode: "HTML",
                },
                description: `Movie: ${movie.name}`,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Search",
                                switch_inline_query_current_chat: "",
                            },
                        ],
                    ],
                },
            })),
            ...seriesList.map((series) => ({
                type: "article",
                id: `series_${series._id.toString()}`,
                title: `📺 Series: ${series.name}`,
                input_message_content: {
                    message_text: `
 📺 <a href='https://t.me/${process.env.BOT_USERNAME}?start=${series._id}'><b>${
                        series.name
                    }</b></a>

<i>${series.caption}</i>

${series.keywords.join(",")}
`,
                    parse_mode: "HTML",
                },
                description: `Series: ${series.name}`,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Search",
                                switch_inline_query_current_chat: "",
                            },
                        ],
                    ],
                },
            })),
        ];

        // If no results, add a "request movie" suggestion
        if (combinedResults.length === 0) {
            combinedResults.push({
                type: "article",
                id: `request_${query}`,
                title: `Request: ${query}`,
                input_message_content: {
                    message_text: `🎥 <b>${query}</b> not found.\nYou can request this movie or series!`,
                    parse_mode: "HTML",
                },
                description: `Click to request: ${query}`,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Send Request",
                                callback_data: `request_${query}`,
                            },
                        ],
                    ],
                },
            });
        }

        await ctx.answerInlineQuery(combinedResults);
    } catch (error) {
        console.error("Error handling search:", error);
        await ctx.answerInlineQuery([
            {
                type: "article",
                id: "error",
                title: "Error",
                input_message_content: {
                    message_text:
                        "❌ Something went wrong. Please try again later.",
                },
                description: "An error occurred while searching.",
            },
        ]);
    }
}
