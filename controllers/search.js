import Movie from "#model/MovieModel.js";
import Series from "#model/SeriesModel.js";
import { cleanText } from "#utilities/utilities.js";
import { getAiSuggestions } from "#utilities/aiSearch.js";

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

        let [movies, seriesList] = await Promise.all([
            Movie.find(queryObj).lean(),
            Series.find(queryObj).lean(),
        ]);

        // If no results, try AI suggestions
        if (movies.length === 0 && seriesList.length === 0) {
            const aiData = await getAiSuggestions(query);
            if (aiData && (aiData.titles.length > 0 || aiData.genres.length > 0)) {
                // 1. Try searching by AI-suggested titles
                const aiTitleQuery = {
                    $or: aiData.titles.map(k => ({
                        cleanedName: { $regex: cleanText(k), $options: "i" }
                    }))
                };
                
                const [aiMovies, aiSeries] = await Promise.all([
                    Movie.find(aiTitleQuery).lean(),
                    Series.find(aiTitleQuery).lean(),
                ]);
                
                if (aiMovies.length > 0 || aiSeries.length > 0) {
                    movies = aiMovies;
                    seriesList = aiSeries;
                } else if (aiData.genres.length > 0) {
                    // 2. Fallback to genre-based search
                    const genreRegex = new RegExp(aiData.genres.join("|"), "i");
                    const aiGenreQuery = {
                        cleanedKeywords: { $regex: genreRegex }
                    };
                    
                    const [genreMovies, genreSeries] = await Promise.all([
                        Movie.find(aiGenreQuery).limit(10).lean(),
                        Series.find(aiGenreQuery).limit(10).lean(),
                    ]);
                    
                    movies = genreMovies;
                    seriesList = genreSeries;
                }
            }
        }

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

        // If still no results, add a "request movie" suggestion
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
