import Movie from "../model/MovieModel.js";
import info from "./add_new/info.js";
import movie from "./add_new/movie.js";
import teaser from "./add_new/teaser.js";
import { checkUserMembership } from "./start.js";
import toAdmin from "./feedback/toAdmin.js";
import Series from "../model/SeriesModel.js";
import formatList from "./list/formatList.js";
import search from "./search.js";
import add from "./add_new/main.js";
import title from "./series/title.js";
import seriesTeaser from "./series/teaser.js";
import episodes from "./series/episodes.js";
import saveSeries from "./series/saveSeries.js";
import findCurrentSeason from "./series/seasons/find_current.js";
import addNewEpisode from "./series/seasons/add_new.js";
import saveNewSeason from "./series/seasons/saveSeason.js";

const userState = {};

export default function actions(bot) {
    bot.command("list", async (ctx) => {
        const movies = await Movie.find({});
        const series = await Series.find({});
        const content = formatList(movies, series);
        await ctx.reply(content, { parse_mode: "HTML" });
    });

    bot.on("inline_query", async (ctx) => {
        await search(ctx);
    });

    bot.action("add", async (ctx) => {
        await add(ctx);
    });

    bot.action("add_movie", async (ctx) => {
        await ctx.answerCbQuery("Adding a movie.");
        await ctx.reply("Please send the video file (mp4, mvm, etc.).");

        const userId = ctx.from.id;
        userState[userId] = { step: "awaitingVideo" };
    });

    // Handle adding series (as per the previous steps)
    bot.action("add_series", async (ctx) => {
        await ctx.answerCbQuery("Adding a series.");
        await ctx.reply(
            "Please enter the series details in the format: name | season number | caption | keywords"
        );

        const userId = ctx.from.id;
        userState[userId] = { step: "awaitingSeriesDetails" };
    });

    bot.action("add_season", async (ctx) => {
        await ctx.reply(
            "Please provide the series name for which you want to add a new season."
        );

        const userId = ctx.from.id;
        userState[userId] = { step: "awaitingSeriesForNewSeason" };
    });

    // Handle video and document messages
    bot.on(["video", "document"], async (ctx) => {
        if (ctx.message.via_bot) return;
        const userId = ctx.from.id;
        let file;

        if (ctx.message.video) {
            file = ctx.message.video; // Handle videos sent as video
        } else if (ctx.message.document) {
            const mimeType = ctx.message.document.mime_type;
            // Accept only video-type documents like .mkv, .avi, etc.
            if (mimeType.startsWith("video/")) {
                file = ctx.message.document; // Handle video sent as document
            } else {
                return ctx.reply(
                    "Please send a valid video file (mp4, mkv, avi, etc.)."
                );
            }
        }

        if (
            userState[userId] &&
            userState[userId].step === "awaitingSeriesFiles"
        ) {
            await episodes(ctx, userState, userId, file);
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingNewSeasonDetails"
        ) {
            await addNewEpisode(ctx, userState, userId, file)
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingVideo"
        ) {
            await movie(ctx, userState, file); // Process video or document
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingTeaser"
        ) {
            await teaser(ctx, userState);
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingSeriesTeaser"
        ) {
            await seriesTeaser(ctx, userState, userId, file);
        } else {
            if (userState[userId].step === "awaitingSeriesFiles") return;
            await ctx.reply("Please start by using the /start command.");
        }
    });

    bot.on("text", async (ctx) => {
        if (ctx.message.via_bot) return;
        const userId = ctx.from.id;
        const messageText = ctx.message.text;

        if (
            userState[userId] &&
            userState[userId].step === "awaitingSeriesForNewSeason"
        ) {
            await findCurrentSeason(ctx, userState, userId);
        } else if (
            messageText === "Done" &&
            userState[userId].step === "awaitingSeriesFiles"
        ) {
            await saveSeries(ctx, userState, userId);
        } else if (
            messageText === "Done" &&
            userState[userId].step === "awaitingNewSeasonDetails"
        ) {
            await saveNewSeason(ctx, userState, userId);
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingDetails"
        ) {
            await info(ctx, userState);
        }
        // Handle feedback
        else if (
            userState[userId] &&
            userState[userId].step === "awaitingFeedback"
        ) {
            await toAdmin(ctx);
        }
        // Handle series details
        else if (
            userState[userId] &&
            userState[userId].step === "awaitingSeriesDetails"
        ) {
            await title(ctx, userState, userId);
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
