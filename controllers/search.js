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
🎞 "<b>${movie.name}</b>"

▪️Size: ${movie.size}
▪️Running time: ${movie.duration}
▪️Keywords: ${movie.keywords.join(", ")}

🔗 <a href='https://t.me/${process.env.BOT_USERNAME}?start=${
                    movie._id
                }'>Get Movie</a>
`,
                parse_mode: "HTML",
            },
            description: `Movie: ${movie.name}`,
        })),
        ...seriesList.map((series) => ({
            type: "article",
            id: `series_${series._id.toString()}`,
            title: `📺 Series: ${series.name}`,
            input_message_content: {
                message_text: `
📺 "<b>${series.name}</b>"

▪️Keywords: ${series.keywords.join(", ")}

🔗 <a href='https://t.me/${process.env.BOT_USERNAME}?start=${
                    series._id
                }'>Get Series</a>
`,
                parse_mode: "HTML",
            },
            description: `Series: ${series.name}`,
        })),
    ];

    await ctx.answerInlineQuery(combinedResults);
};
