import Movie from "../model/MovieModel.js";
import Series from "../model/SeriesModel.js";

export default async function search(ctx) {
    const query = ctx.inlineQuery.query;
    if (!query) return;

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
🎞 <a href='https://t.me/${process.env.BOT_USERNAME}?start=${
    movie._id
}'><b>${movie.name}</b></a>

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
            }
        })),
        ...seriesList.map((series) => ({
            type: "article",
            id: `series_${series._id.toString()}`,
            title: `📺 Series: ${series.name}`,
            input_message_content: {
                message_text: `
 📺 <a href='https://t.me/${process.env.BOT_USERNAME}?start=${
    series._id
}'><b>${series.name}</b></a>

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
            }
        })),
    ];

    await ctx.answerInlineQuery(combinedResults);
};
