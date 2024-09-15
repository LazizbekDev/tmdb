import Movie from "../model/MovieModel.js";
import Series from "../model/SeriesModel.js";
import caption from "../utilities/caption.js";
import info from "./add_new/info.js";
import add from "./add_new/main.js";
import movie from "./add_new/movie.js";
import teaser from "./add_new/teaser.js";
import toAdmin from "./feedback/toAdmin.js";
import episodes from "./series/episodes.js";
import saveSeries from "./series/saveSeries.js";
import addNewEpisode from "./series/seasons/add_new.js";
import findCurrentSeason from "./series/seasons/find_current.js";
import saveNewSeason from "./series/seasons/saveSeason.js";
import seriesTeaser from "./series/teaser.js";
import title from "./series/title.js";
import { checkUserMembership, startMessage } from "./start.js";

// Define the startMessage function
export async function handleStart(ctx) {
    const userId = ctx.message.from.id;
    const isMember = await checkUserMembership(userId);
    const payload = ctx.startPayload;

    // Check if user is a member of the required channel
    if (!isMember) {
        return ctx.reply(
            `Please join the <a href='https://t.me/${process.env.CHANNEL_USERNAME}'>channel</a> to use the bot.`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Join",
                                url: `https://t.me/${process.env.CHANNEL_USERNAME}`,
                            },
                        ],
                        [{ text: "Check", callback_data: "check_membership" }],
                    ],
                },
            }
        );
    }

    // If payload exists, try to fetch movie or series by ID
    if (payload) {
        try {
            const [movie, series] = await Promise.all([
                Movie.findById(payload),
                Series.findById(payload),
            ]);

            if (movie) {
                return ctx.replyWithVideo(movie.movieUrl, {
                    caption: caption(movie, movie._id),
                    parse_mode: "HTML",
                    protect_content: true,
                });
            } else if (series) {
                for (const season of series.series.sort(
                    (a, b) => a.seasonNumber - b.seasonNumber
                )) {
                    for (const episode of season.episodes.sort(
                        (a, b) => a.episodeNumber - b.episodeNumber
                    )) {
                        await ctx.replyWithVideo(episode.fileId, {
                            caption: `<b>${series.name.toUpperCase()}</b>\nSeason ${
                                season.seasonNumber
                            }, Episode ${episode.episodeNumber}`,
                            parse_mode: "HTML",
                            protect_content: true,
                        });
                    }
                }
            } else {
                return ctx.reply(
                    "Sorry, the movie or series you are looking for does not exist."
                );
            }
        } catch (error) {
            console.error("Error fetching movie or series:", error);
            return ctx.reply("There was an error processing your request.");
        }
    } else {
        startMessage(ctx); // Or whatever start message you want to send
    }
}

export const handleActionButtons = (bot, userState) => {
    bot.action("add", add);

    bot.action("add_movie", async (ctx) => {
        await ctx.answerCbQuery("Adding a movie.");
        await ctx.reply("Please send the video file (mp4, mkv, etc.).");
        userState[ctx.from.id] = { step: "awaitingVideo" };
    });

    bot.action("add_series", async (ctx) => {
        await ctx.answerCbQuery("Adding a series.");
        await ctx.reply(
            "Please enter the series details: name | season number | caption | keywords"
        );
        userState[ctx.from.id] = { step: "awaitingSeriesDetails" };
    });

    bot.action("add_season", async (ctx) => {
        await ctx.reply(
            "Please provide the series name for which you want to add a new season."
        );
        userState[ctx.from.id] = { step: "awaitingSeriesForNewSeason" };
    });

    bot.action("check_membership", async (ctx) => {
        const userId = ctx.from.id;
        const isMember = await checkUserMembership(userId);
        if (isMember) {
            await ctx.editMessageText(
                "You are now verified! Use the buttons below:",
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
                                { text: "Add new", callback_data: "add" },
                                {
                                    text: "Send feedback",
                                    callback_data: "feedback",
                                },
                            ],
                        ],
                    },
                }
            );
        } else {
            await ctx.answerCbQuery("Please join the channel and try again!", {
                show_alert: true,
            });
        }
    });

    bot.action("feedback", async (ctx) => {
        userState[ctx.from.id] = { step: "awaitingFeedback" };
        await ctx.answerCbQuery("You can send your feedback to admin");
        await ctx.reply("Please send your feedback.");
    });
};

export const handleVideoOrDocument = async (ctx, userState) => {
    const userId = ctx.from.id;
    const file = ctx.message.video || ctx.message.document;
    if (
        ctx.message.document &&
        !ctx.message.document.mime_type.startsWith("video/")
    ) {
        return ctx.reply("Please send a valid video file (mp4, mkv, etc.).");
    }

    if (userState[userId]) {
        switch (userState[userId].step) {
            case "awaitingSeriesFiles":
                await episodes(ctx, userState, userId, file);
                break;
            case "awaitingNewSeasonDetails":
                await addNewEpisode(ctx, userState, userId, file);
                break;
            case "awaitingVideo":
                await movie(ctx, userState, file);
                break;
            case "awaitingTeaser":
                await teaser(ctx, userState);
                break;
            case "awaitingSeriesTeaser":
                await seriesTeaser(ctx, userState, userId, file);
                break;
            default:
                await ctx.reply("Please start by using the /start command.");
        }
    }
};

export const handleTextInput = async (ctx, userState) => {
    const userId = ctx.from.id;
    const messageText = ctx.message.text;

    if (userState[userId]) {
        switch (userState[userId].step) {
            case "awaitingSeriesForNewSeason":
                await findCurrentSeason(ctx, userState, userId);
                break;
            case "awaitingSeriesDetails":
                await title(ctx, userState, userId);
                break;
            case "awaitingDetails":
                await info(ctx, userState);
                break;
            case "awaitingFeedback":
                await toAdmin(ctx);
                break;
            case "awaitingSeriesFiles":
                if (messageText === "Done")
                    await saveSeries(ctx, userState, userId);
                break;
            case "awaitingNewSeasonDetails":
                if (messageText === "Done")
                    await saveNewSeason(ctx, userState, userId);
                break;
        }
    }
};
