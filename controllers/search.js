import Movie from "../model/MovieModel.js";
import Series from "../model/SeriesModel.js";
import { cleanText } from "../utilities/utilities.js";

export default async function search(ctx) {
    const query = ctx.inlineQuery.query;
    if (!query) return;
    const cleanedText = cleanText(query);
    try {
        const queryObj = {
            $or: [
                { cleanedName: { $regex: cleanedText, $options: "i" } },
                { cleanedKeywords: { $regex: cleanedText, $options: "i" } },
            ],
        };

        const [movies, seriesList] = await Promise.all([
            Movie.find(queryObj).lean(),
            Series.find(queryObj).lean(),
        ]);

        const mapItem = (item, typeName) => ({
            type: "video",
            id: `${typeName.toLowerCase()}_${item._id.toString()}`,
            title: `${typeName === "Movie" ? "🎞 Movie" : "📺 Series"}: ${item.name}`,
            description: item.caption,
            video_file_id: item.teaser,
            mime_type: "video/mp4",
            caption: `\n<b>${item.name}</b>\n\n<i>${item.caption}</i>\n`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Watch Now", url: `https://t.me/${process.env.BOT_USERNAME}?start=${item._id}` }],
                    [{ text: "Search", switch_inline_query_current_chat: "" }],
                ],
            },
        });

        const combinedResults = [
            ...movies.map(m => mapItem(m, "Movie")),
            ...seriesList.map(s => mapItem(s, "Series")),
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
