import UserSubmission from "../model/FilmRequest.js";
import Movie from "../model/MovieModel.js";
import Series from "../model/SeriesModel.js";
import User from "../model/User.js";
import caption from "../utilities/caption.js";
import info from "./add_new/info.js";
import add from "./add_new/main.js";
import movie from "./add_new/movie.js";
import teaser from "./add_new/teaser.js";
import toAdmin from "./feedback/toAdmin.js";
import formatList, {
    generateHeader,
    generatePaginationButtons,
} from "./list/formatList.js";
import episodes from "./series/episodes.js";
import saveSeries from "./series/saveSeries.js";
import addNewEpisode from "./series/seasons/add_new.js";
import findCurrentSeason from "./series/seasons/find_current.js";
import saveNewSeason from "./series/seasons/saveSeason.js";
import seriesTeaser from "./series/teaser.js";
import title from "./series/title.js";
import { checkUserMembership, startMessage } from "./start.js";

export async function handleStart(ctx) {
    const userId = ctx.message.from.id;
    const isMember = await checkUserMembership(userId);
    const payload = ctx.startPayload;
    const userFirstName = ctx.message.from.first_name;
    const userUsername = ctx.message.from.username || "No username";

    // Check if the user already exists in the database
    let user = await User.findOne({ telegramId: userId });

    // If the user doesn't exist, create a new one
    if (!user) {
        user = new User({ telegramId: userId });
        await user.save();
        await ctx.replyWithHTML(
            `
👋 <b>Welcome to the Movie Bot!</b>

Here's how you can use this bot:

1️⃣ Use the <b>Search</b> feature to find movies or series. 
   - Type <code>@${process.env.BOT_USERNAME}</code> and movie or series name in any chat, and results will appear instantly.

2️⃣ Share your favorites!
   - Search for a movie/series and send it to friends or groups directly using inline search.

3️⃣ Use Deep Links:
   - Click a movie link (e.g., <code>https://t.me/${process.env.BOT_USERNAME}?start=movieID</code>) to access specific content.

4️⃣ Request Content:
   - Can't find something? Use the inline search feature to request a movie or series.

Enjoy unlimited entertainment for free! 🎥🍿
🔔 To get the latest updates and full access, consider joining our channel:
👉 <a href="https://t.me/${process.env.CHANNEL_USERNAME}">Join Now</a>

After joining, click the "Check Membership" button to unlock full access.
            `,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Check Membership",
                                callback_data: "check_membership",
                            },
                        ],
                    ],
                },
            }
        );
    }

    const limit = 1;

    // If the user is not a member and has reached their limit, prompt them to join the channel
    if (!isMember && user.accessCount >= limit) {
        return ctx.reply(
            `You have reached your free access limit. Please join the <a href='https://t.me/${process.env.CHANNEL_USERNAME}'>channel</a> to continue using the bot.`,
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
            const movie = await Movie.findById(payload);

            if (movie) {
                if (!movie?.accessedBy?.includes(userId.toString())) {
                    movie?.accessedBy.push(userId.toString()); // Use push() to add the user ID to the array
                    movie.views += 1; // Increment views count
                    user.accessedMovies.push(movie._id);
                    await user.save();
                    await movie.save(); // Save the updated movie
                    const adminMessage = `
🔔 <b>Movie Accessed</b>
▪️ <b>Movie:</b> ${movie.name}
▪️ <b>Access Count:</b> ${movie?.accessedBy.length}
▪️ <b>User:</b> ${userFirstName} (@${userUsername})
▪️ <b>User ID:</b> ${userId}
 `;
                    await ctx.telegram.sendMessage(
                        process.env.ADMIN_ID,
                        adminMessage,
                        {
                            parse_mode: "HTML",
                        }
                    );
                }
                ctx.replyWithVideo(movie.movieUrl, {
                    caption: caption(movie, movie._id, false),
                    parse_mode: "HTML",
                    protect_content: !isMember,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "Search",
                                    switch_inline_query_current_chat: "",
                                },
                            ],
                        ],
                    },
                });

                if (!isMember) {
                    user.accessCount++;
                    await user.save();

                    return ctx.reply(
                        `You cannot save or share the content unless you join the main <a href='https://t.me/${process.env.CHANNEL_USERNAME}'>channel</a> `,
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
                                    [
                                        {
                                            text: "Check",
                                            callback_data: "check_membership",
                                        },
                                    ],
                                ],
                            },
                        }
                    );
                }
                return;
            }

            const series = await Series.findById(payload);
            if (series) {
                if (!series?.accessedBy?.includes(userId.toString())) {
                    series?.accessedBy.push(userId.toString());
                    series.views += 1;
                    await series.save();

                    const adminMessage = `
🔔 <b>Series Accessed</b>
▪️ <b>Series:</b> ${series.name}
▪️ <b>Access Count:</b> ${series?.accessedBy.length}
▪️ <b>User:</b> ${userFirstName} (@${userUsername})
▪️ <b>User ID:</b> ${userId}
 `;
                    await ctx.telegram.sendMessage(
                        process.env.ADMIN_ID,
                        adminMessage,
                        {
                            parse_mode: "HTML",
                        }
                    );
                }
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
                            protect_content: !isMember,
                        });
                    }
                }
                ctx.reply(
                    "Send the /list command to see the content of the table, or explore new films by clicking the button below.",
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "Search",
                                        switch_inline_query_current_chat: "",
                                    },
                                ],
                            ],
                        },
                    }
                );

                if (!isMember) {
                    user.accessCount++;
                    await user.save();
                    return ctx.reply(
                        `You cannot save or share the content unless you join the main <a href='https://t.me/${process.env.CHANNEL_USERNAME}'>channel</a> `,
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
                                    [
                                        {
                                            text: "Check",
                                            callback_data: "check_membership",
                                        },
                                    ],
                                ],
                            },
                        }
                    );
                }
                return;
            } else {
                return ctx.reply(
                    "Sorry, the movie or series you are looking for does not exist.\nClick /list to see the table of content",
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "Search",
                                        switch_inline_query_current_chat: "",
                                    },
                                ],
                            ],
                        },
                    }
                );
            }
        } catch (error) {
            console.error("Error fetching movie or series:", error);
            return ctx.reply("There was an error processing your request.");
        }
    } else {
        startMessage(ctx); // Or your default start message
    }
}

export const handleActionButtons = (bot, userState) => {
    bot.action("add", add);

    bot.action("add_movie", async (ctx) => {
        await ctx.answerCbQuery("Adding a movie.");
        await ctx.reply("Please send the video file (mp4, mkv, etc.).");
        userState[ctx.from.id] = { step: "awaitingVideo" };
    });

    bot.action(/list_page_(\d+)/, async (ctx) => {
        const page = parseInt(ctx.match[1], 10); // Get the page number from the callback data
        const limit = 10; // Show 10 movies/series per page
    
        // Paginate and fetch movies and series, sorted by the newest first
        const movies = await Movie.find({})
            .sort({ _id: -1 })
            .limit(limit)
            .skip((page - 1) * limit);
    
        const series = await Series.find({})
            .sort({ _id: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const totalMoviesCount = movies.length;
        const totalSeriesCount = series.length;

        const totalPages = Math.ceil(
            Math.max(totalMoviesCount, totalSeriesCount) / 10
        );

        const content = formatList(movies, series, page, limit);
        const paginationButtons = generatePaginationButtons(page, totalPages);

        await ctx.editMessageText(content, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: paginationButtons,
            },
        });
    });

    bot.action("send_movie_request", async (ctx) => {
        await ctx.answerCbQuery("We will post it to channel");
        await ctx.reply("Send name of the film name that you want to watch");
        userState[ctx.from.id] = { step: "awaitingRequestName" };
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
        const isAdmin =
            ctx.message?.from?.username?.toLowerCase() === process.env.ADMIN;
        const isMember = await checkUserMembership(userId);
        if (isMember) {
            await User.findOneAndUpdate(
                { telegramId: userId }, // Filter: Find the user by telegramId
                { $set: { isSubscribed: true } }, // Update: Set isSubscribed to true
                { new: true } // Options: Return the updated document
            );
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
                                {
                                    text: isAdmin ? "Add new" : "Send feedback",
                                    callback_data: isAdmin ? "add" : "feedback",
                                },
                            ],
                            [
                                {
                                    text: "🎬 Send Movie Request",
                                    callback_data: "send_movie_request",
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
                if (messageText === "Done") {
                    await saveSeries(ctx, userState, userId);
                }

                break;
            case "awaitingNewSeasonDetails":
                3;
                if (messageText === "Done")
                    await saveNewSeason(ctx, userState, userId);
                break;
            case "awaitingRequestName":
                // Store the request in the database
                await UserSubmission.create({
                    userId: userId,
                    name: ctx.from.first_name,
                    request: messageText,
                    timestamp: new Date(),
                });

                await ctx.telegram.sendMessage(
                    process.env.ADMIN_ID,
                    `👤from ${
                        ctx.from.username
                            ? "@" + ctx.from.username
                            : "User ID: " +
                              `<code>${userId} - ${ctx.from?.first_name}</code>`
                    }\n\n📝<i>${messageText}</i>\n\nℹ️ to reply: <code>/reply ${userId} Thanks for your feedback ☺️</code>`,
                    {
                        parse_mode: "HTML",
                    }
                );

                ctx.reply("Thank you! Your request has been submitted.");
                break;
        }
    }

    try {
        const page = 1;
        const [movies, seriesList] = await Promise.all([
            Movie.find({
                $or: [
                    { name: { $regex: messageText, $options: "i" } },
                    { keywords: { $regex: messageText, $options: "i" } },
                ],
            }),
            Series.find({
                $or: [
                    { name: { $regex: messageText, $options: "i" } },
                    { keywords: { $regex: messageText, $options: "i" } },
                ],
            }),
        ]);

        const moviesCount = movies.length;
        const seriesCount = seriesList.length;

        // Calculate total pages for pagination
        const totalPages = Math.ceil(Math.max(moviesCount, seriesCount) / 30);
        const content = formatList(movies, seriesList, page, 30);
        const paginationButtons = generatePaginationButtons(page, totalPages);

        // Generate the header with counts
        const header = generateHeader(moviesCount, seriesCount);

        // Send the formatted list, header, and pagination buttons to the user
        await ctx.replyWithHTML(`${header}${content}`, {
            reply_markup: {
                inline_keyboard: paginationButtons,
            },
        });
    } catch (error) {
        console.log(error);
        await ctx.reply("Something went wrong while processing your request.");
    }
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
