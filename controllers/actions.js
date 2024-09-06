import { Markup } from "telegraf";
import Movie from "../model/MovieModel.js";
import info from "./add_new/info.js";
import movie from "./add_new/movie.js";
import teaser from "./add_new/teaser.js";
import { checkUserMembership } from "./start.js";
import toAdmin from "./feedback/toAdmin.js";
const userState = {};

export default function Actions(bot) {
    bot.on("inline_query", async (ctx) => {
        const query = ctx.inlineQuery.query;
        if (!query) return;

        const movies = await Movie.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { keywords: { $regex: query, $options: "i" } },
            ],
        });

        console.log(movies);

        const results = movies.map((movie) => {
            return {
                type: "article",
                id: movie._id.toString(),
                title: movie.name,
                input_message_content: {
                    message_text: `
🎞 ️"<b>${movie.name}</b>"

▪️Size: ${movie.size}
▪️Running time: ${movie.duration}
▪️Keywords: ${movie.keywords.join(", ")}

🔗 <a href='https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}'>Get Movie</a>
`,
                    parse_mode: "HTML",
                },
                description: `Download link for ${movie.name}`,
            };
        });

        await ctx.answerInlineQuery(results);
    });

    bot.action("add", async (ctx) => {
        const isAdmin = ctx.from.username.toLowerCase() === process.env.ADMIN;
        if (!isAdmin) {
            return ctx.reply("You are not authorized to add media files.");
        }
        await ctx.answerCbQuery("send movie");
        await ctx.reply("Please send the video file (mp4, mvm, etc.).");

        const userId = ctx.from.id;

        userState[userId] = {
            step: "awaitingVideo",
        };
    });

    bot.on("video", async (ctx) => {
        if (ctx.message.via_bot) return;
        const userId = ctx.from.id;
        const file = ctx.message.video;

        if (userState[userId] && userState[userId].step === "awaitingVideo") {
            await movie(ctx, userState, file);
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingTeaser"
        ) {
            await teaser(ctx, userState);
        } else {
            await ctx.reply("Please start by using the /start command.");
        }
    });

    bot.on("text", async (ctx) => {
        if (ctx.message.via_bot) return;
        const userId = ctx.from.id;

        if (userState[userId] && userState[userId].step === "awaitingDetails") {
            await info(ctx, userState);
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingFeedback"
        ) {
            await toAdmin(ctx);
        }
    });

    // Handle 'Check Membership' button press
    bot.action("check_membership", async (ctx) => {
        const userId = ctx.from.id;
        const isMember = await checkUserMembership(userId);

        if (isMember) {
            return ctx.editMessageText(
                "You are now verified! Please use the buttons below:",
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "Search",
                                    switch_inline_query_current_chat: "",
                                },
                            ],
                            [
                                {
                                    text: isAdmin ? "Add new" : "Send feedback",
                                    callback_data: isAdmin ? "add" : "feedback",
                                },
                            ],
                        ],
                    },
                }
            );
        } else {
            return ctx.answerCbQuery(
                "You have not joined the channel yet. Please join and try again!",
                { show_alert: true }
            );
        }
    });

    bot.action("feedback", async (ctx) => {
        userState[ctx.from.id] = {
            step: "awaitingFeedback",
        };
        await ctx.reply("Please send your feedback.");
    });
}
