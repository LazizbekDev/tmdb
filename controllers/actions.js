import Movie from "../model/MovieModel.js";
import Series from "../model/SeriesModel.js";
import formatList from "./list/formatList.js";
import search from "./search.js";
import { handleActionButtons, handleTextInput, handleVideoOrDocument } from "./handler.js";

const userState = {};

export default function actions(bot) {
    bot.command("list", async (ctx) => {
        const movies = await Movie.find({});
        const series = await Series.find({});
        const content = formatList(movies, series);
        await ctx.reply(content, { parse_mode: "HTML" });
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
