import Movie from "../model/MovieModel.js";
import Series from "../model/SeriesModel.js";
import User from "../model/User.js";
import formatList, {
    generateHeader,
    generatePaginationButtons,
} from "./list/formatList.js";
import search from "./search.js";
import {
    handleActionButtons,
    handleTextInput,
    handleVideoOrDocument,
} from "./handler.js";

const userState = {};

export default function actions(bot) {
    bot.command("list", async (ctx) => {
        const page = parseInt(ctx.match?.[1] || 1); // Get the page from the callback data, default to 1
        const limit = 10; // Show 10 movies/series per page

        // Fetch the movies and series from the database with pagination
        const movies = await Movie.find({})
            .sort({ _id: -1 })
            .skip((page - 1) * limit) // Skip the appropriate number of movies
            .limit(limit); // Limit the results to `limit`

        const series = await Series.find({})
            .sort({ _id: -1 })
            .skip((page - 1) * limit) // Skip the appropriate number of series
            .limit(limit); // Limit the results to `limit`

        // Get the total counts of movies and series for pagination calculations
        const moviesCount = await Movie.countDocuments({});
        const seriesCount = await Series.countDocuments({});

        // Calculate total number of pages for pagination (based on max of movies or series)
        const totalPages = Math.ceil(
            Math.max(moviesCount, seriesCount) / limit
        );

        // Generate the header for the first page
        let header = "";
        if (page === 1) {
            header = generateHeader(moviesCount, seriesCount); // Call your header generator function
        }

        // Format the movies and series list
        const content = header + formatList(movies, series, page, limit);

        // Generate pagination buttons
        const paginationButtons = generatePaginationButtons(page, totalPages);

        // Send the message with content and pagination buttons
        await ctx.reply(content, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: paginationButtons,
            },
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

    bot.on("callback_query", async (ctx) => {
        const callbackData = ctx.callbackQuery.data;

        // Check if the callback data matches the pattern
        if (callbackData.startsWith("request_")) {
            // Extract the query part from the callback data
            const query = callbackData.replace("request_", "");

            // Respond to the user
            await ctx.answerCbQuery(
                `✅ Your request for "${query}" has been submitted successfully!`
            ); // Acknowledge the callback query to Telegram
            // await ctx.reply(
            //     `✅ Your request for "${query}" has been submitted successfully!`
            // );

            // Optionally, send the request to an admin or log it
            const adminMessage = `
🎥 <b>New Movie/Series Request</b>
▪️ <b>Requested Item:</b> ${query}
▪️ <b>From User:</b> ${ctx.from.first_name} (@${ctx.from.username})
▪️ <b>User ID:</b> ${ctx.from.id}
`;
            await ctx.telegram.sendMessage(process.env.ADMIN_ID, adminMessage, {
                parse_mode: "HTML",
            });
        }
    });

    bot.on("my_chat_member", async (ctx) => {
        const status = ctx.update.my_chat_member.new_chat_member.status;
        const userId = ctx.update.my_chat_member.from.id;

        if (status === "kicked" || status === "left") {
            // User blocked or deleted the bot
            await User.findOneAndUpdate(
                { telegramId: userId },
                { $set: { leftTheBot: true } }
            );
            console.log(`User ${userId} has blocked or deleted the bot.`);
        }
    });
}
