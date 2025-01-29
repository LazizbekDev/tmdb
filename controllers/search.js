import Movie from "../model/MovieModel.js";
import Series from "../model/SeriesModel.js";

export default async function search(ctx) {
    const query = ctx.inlineQuery.query;
    if (!query) return;

    try {
        const getThumbnailUrl = async (thumbFileId) => {
            const response = await fetch(
                `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${thumbFileId}`
            );
            const data = await response.json();
            if (data.ok) {
                return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${data.result.file_path}`;
            }
            return "https://example.com/default_thumbnail.jpg"; // Fallback thumbnail
        };

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
                type: "video",
                id: `movie_${movie._id.toString()}`,
                title: `🎞 Movie: ${movie.name}`,
                description: movie.caption,
                video_file_id: movie.teaser,
                mime_type: "video/mp4",
                caption: `
<b>${movie.name}</b>

<i>${movie.caption}</i>
`,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Watch Now",
                                url: `https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}`,
                            },
                        ],
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
                type: "video",
                id: `series_${series._id.toString()}`,
                title: `📺 Series: ${series.name}`,
                description: series.caption, // Appears in inline search results
                video_file_id: series.teaser, // Assuming 'teaser' stores the trailer's file ID
                mime_type: "video/mp4",
                caption: `
<b>${series.name}</b>

<i>${series.caption}</i>
`,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Watch Now",
                                url: `https://t.me/${process.env.BOT_USERNAME}?start=${series._id}`,
                            },
                        ],
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
