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
import MovieModel from "../model/MovieModel.js";
import { adminNotifier } from "../utilities/admin_notifier.js";

const userState = {};

export default function actions(bot) {
    bot.command("list", async (ctx) => {
        try {
            const page = parseInt(ctx.match?.[1] || 1); // Get the page from the callback data, default to 1
            const limit = 10; // Show 10 movies/series per page

            const movies = await Movie.find({})
                .sort({ _id: -1 })
                .skip((page - 1) * limit) // Skip the appropriate number of movies
                .limit(limit); // Limit the results to `limit`

            const series = await Series.find({})
                .sort({ _id: -1 })
                .skip((page - 1) * limit) // Skip the appropriate number of series
                .limit(limit); // Limit the results to `limit`

            const moviesCount = await Movie.countDocuments({});
            const seriesCount = await Series.countDocuments({});

            const totalPages = Math.ceil(
                Math.max(moviesCount, seriesCount) / limit
            );

            let header = "";
            if (page === 1) {
                header = generateHeader(moviesCount, seriesCount); // Call your header generator function
            }

            const content = header + formatList(movies, series, page, limit);

            const paginationButtons = generatePaginationButtons(
                page,
                totalPages
            );

            await ctx.reply(content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: paginationButtons,
                },
            });
        } catch (error) {
            console.error("Error in /list command:", error);
            await ctx.reply("An error occurred while processing your request.");
            await adminNotifier(bot, error, ctx, "List command error");
        }
    });

    bot.command("/suggest", async (ctx) => {
        try {
            await suggestMovie(bot, ctx.from.id);
        } catch (error) {
            console.error("Error in /suggest command:", error);
            await ctx.reply("An error occurred while processing your request.");
            await adminNotifier(bot, error, ctx, "Suggest command error");
        }
    });

    bot.on("inline_query", search);

    handleActionButtons(bot, userState);

    // Handle video and document messages
    bot.on(["video", "document"], async (ctx) => {
        try {
            if (ctx.message.via_bot) return;
            await handleVideoOrDocument(ctx, userState);
        } catch (error) {
            console.error("Error handling video or document:", error);
            await ctx.reply("An error occurred while processing your request.");
            await adminNotifier(
                bot,
                error,
                ctx,
                "Video/Document handling error"
            );
        }
    });

    bot.on("text", async (ctx) => {
        try {
            if (ctx.message.via_bot) return;
            await handleTextInput(ctx, userState);
        } catch (error) {
            console.error("Error handling text input:", error);
            await ctx.reply("An error occurred while processing your request.");
            await adminNotifier(bot, error, ctx, "Text input handling error");
        }
    });

    bot.on("callback_query", async (ctx) => {
        const callbackData = ctx.callbackQuery.data;

        try {
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
                await ctx.telegram.sendMessage(
                    process.env.ADMIN_ID,
                    adminMessage,
                    {
                        parse_mode: "HTML",
                    }
                );
            } else if (callbackData.startsWith("show_teaser_")) {
                const movieId = callbackData.split("show_teaser_")[1];
                const movie = await MovieModel.findById(movieId);
                if (!movie) return;

                await bot.telegram.editMessageMedia(
                    ctx.from.id,
                    ctx.callbackQuery.message.message_id,
                    undefined,
                    {
                        type: "video",
                        media: movie.teaser,
                        caption: `🎞 <b>${movie.name}</b>\n\n${
                            movie.teaserCaption || "Here's the teaser!"
                        }`,
                        parse_mode: "HTML",
                    },
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "🍿 Watch Movie",
                                        url: `https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}`,
                                    },
                                ],
                            ],
                        },
                    }
                );
                await ctx.answerCbQuery();
            }
        } catch (error) {
            console.error("Error handling callback query:", error);
            await ctx.reply("An error occurred while processing your request.");
            await adminNotifier(
                bot,
                error,
                ctx,
                "Callback query handling error"
            );
        }
    });

    bot.on("my_chat_member", async (ctx) => {
        try {
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
        } catch (error) {
            console.error("Error in my_chat_member handler:", error);
            await ctx.reply("An error occurred while processing your request.");
            await adminNotifier(bot, error, ctx, "my_chat_member error");
        }
    });
}
