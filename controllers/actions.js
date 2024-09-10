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

const userState = {};

export default function Actions(bot) {
    bot.command("list", async (ctx) => {
        // Fetch movies and series from the database
        const movies = await Movie.find({});
        const series = await Series.find({});
    
        // Call a function to format the data into a table of contents
        const content = formatList(movies, series);
    
        // Send the formatted list to the user with HTML parse mode
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
            const { seriesId } = userState[userId];

            const series = await Series.findById(seriesId);

            if (!series) {
                console.log(seriesId);
                return ctx.reply("Series not found.");
            }

            // Add the episode to the new season in the user state
            userState[userId].episodes = userState[userId].episodes || [];
            const currentSeason =
                userState[userId].seasonNumber || series.series.length + 1;
            const episodeNumber = userState[userId].episodeNumber || 1;

            userState[userId].episodes.push({
                episodeNumber: episodeNumber,
                fileId: file.file_id,
            });
            // Increment episode number for the next upload
            userState[userId].episodeNumber = episodeNumber + 1;

            await ctx.reply(
                `Episode ${episodeNumber} added to season ${currentSeason}! Send the next episode or press 'Done'.`
            );
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
            const series = await Series.find({
                $or: [
                    { name: { $regex: messageText, $options: "i" } },
                    // { _id: { $regex: messageText, $options: "i" } },
                ],
            });

            if (!series) {
                return ctx.reply(
                    "Series not found! Please provide a valid series name or ID."
                );
            }

            // console.log(series[0])

            // Store the series and move to the next step
            userState[userId] = {
                step: "awaitingNewSeasonDetails",
                seriesId: series[0]._id,
            };

            await ctx.reply(
                `Please provide the season number for <i>${series[0].name}</i>\nfollowed by the episodes (send one by one). Press 'Done' when finished.`,
                {
                    reply_markup: {
                        keyboard: [[{ text: "Done" }]],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                    parse_mode: "HTML",
                }
            );
        } else if (
            messageText === "Done" &&
            userState[userId].step === "awaitingSeriesFiles"
        ) {
            await saveSeries(ctx, userState, userId);
        } else if (
            messageText === "Done" &&
            userState[userId].step === "awaitingNewSeasonDetails"
        ) {
            const seriesId = userState[userId].seriesId;
            const seasonNumber = userState[userId].seasonNumber;
            const episodes = userState[userId].episodes;

            // Find the series and add the new season
            const series = await Series.findById(seriesId);

            if (!series) {
                return ctx.reply("Series not found.");
            }

            series.series.push({
                seasonNumber: seasonNumber,
                episodes: episodes,
            });

            await series.save();

            // Clear the user state
            delete userState[userId];

            await ctx.reply(`Season ${seasonNumber} saved successfully!`, {
                reply_markup: {
                    remove_keyboard: true, // Remove the keyboard after done
                },
            });
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
