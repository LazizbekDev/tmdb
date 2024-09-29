import Movie from "../model/MovieModel.js";
import Series from "../model/SeriesModel.js";
import formatList, { generateHeader, generatePaginationButtons } from "./list/formatList.js";
import search from "./search.js";
import { handleActionButtons, handleTextInput, handleVideoOrDocument } from "./handler.js";

const userState = {};

export default function actions(bot) {
    bot.command("list", async (ctx) => {
        const page = 1; // Start at the first page by default
        const limit = 10; // Show 10 movies/series per page
        const movies = await Movie.find({}).limit(limit).skip((page - 1) * limit);
        const series = await Series.find({}).limit(limit).skip((page - 1) * limit);
    
        const moviesCount = await Movie.countDocuments({});
        const seriesCount = await Series.countDocuments({});
        const totalPages = Math.ceil((moviesCount + seriesCount) / limit);
    
        // Show total count header only on the first page
        let header = "";
        if (page === 1) {
            header = generateHeader(moviesCount, seriesCount);
        }
    
        const content = header + formatList(movies, series, page, limit);
        const paginationButtons = generatePaginationButtons(page, totalPages);

        await ctx.reply(content, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: paginationButtons
            }
        });
    });
    
    bot.on("inline_query", search);

    handleActionButtons(bot, userState);

    // Handle video and document messages
    bot.on(["video", "document"], async (ctx) => {
        if (ctx.message.via_bot) return;
        await handleVideoOrDocument(ctx, userState);
    });

    bot.on("text", async (ctx) => {
        if (ctx.message.via_bot) return;
        await handleTextInput(ctx, userState);
    });
}
