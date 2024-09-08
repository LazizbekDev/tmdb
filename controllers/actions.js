import Movie from "../model/MovieModel.js";
import info from "./add_new/info.js";
import movie from "./add_new/movie.js";
import teaser from "./add_new/teaser.js";
import { checkUserMembership } from "./start.js";
import toAdmin from "./feedback/toAdmin.js";
import Series from "../model/SeriesModel.js"

const userState = {};

export default function Actions(bot) {
    bot.on("inline_query", async (ctx) => {
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
            })
        ]);

        // console.log(movies);

        const combinedResults = [
            ...movies.map(movie => ({
                type: "article",
                id: `movie_${movie._id.toString()}`,
                title: `🎞 Movie: ${movie.name}`,
                input_message_content: {
                    message_text: `
        🎞 "<b>${movie.name}</b>"
        
        ▪️Size: ${movie.size}
        ▪️Running time: ${movie.duration}
        ▪️Keywords: ${movie.keywords.join(", ")}
        
        🔗 <a href='https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}'>Get Movie</a>
        `,
                    parse_mode: "HTML",
                },
                description: `Movie: ${movie.name}`,
            })),
            ...seriesList.map(series => ({
                type: "article",
                id: `series_${series._id.toString()}`,
                title: `📺 Series: ${series.name}`,
                input_message_content: {
                    message_text: `
        📺 "<b>${series.name}</b>"
        
        ▪️Keywords: ${series.keywords.join(", ")}
        
        🔗 <a href='https://t.me/${process.env.BOT_USERNAME}?start=${series._id}'>Get Series</a>
        `,
                    parse_mode: "HTML",
                },
                description: `Series: ${series.name}`,
            }))
        ]        

        await ctx.answerInlineQuery(combinedResults);
    });

    bot.action("add", async (ctx) => {
        const isAdmin = ctx.from.username.toLowerCase() === process.env.ADMIN;
        if (!isAdmin) {
            return ctx.reply("You are not authorized to add media files.");
        }

        // Edit the message to ask if the user wants to add a movie or a series
        await ctx.editMessageText(
            "You're going to add media. Would you like to add a movie or a series?",
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Movie", callback_data: "add_movie" },
                            { text: "Series", callback_data: "add_series" },
                        ],
                    ],
                },
            }
        );
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
            const { episodeNumber } = userState[userId];

            // Add the episode to the user's episode list
            userState[userId].episodes.push({
                episodeNumber: episodeNumber, // Track episode number
                fileId: file.file_id, // Store the fileId
            });

            // Increment episode number for the next upload
            userState[userId].episodeNumber += 1;

            await ctx.reply(
                `Episode ${episodeNumber} added! Send the next episode or press 'Done'.`
            );
        }

        if (userState[userId] && userState[userId].step === "awaitingVideo") {
            await movie(ctx, userState, file); // Process video or document
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingTeaser"
        ) {
            await teaser(ctx, userState);
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
            messageText === "Done" &&
            userState[userId].step === "awaitingSeriesFiles"
        ) {
            const seriesData = userState[userId];

            // Prepare the series model to save
            const newSeries = new Series({
                name: seriesData.seriesName,
                caption: seriesData.caption,
                keywords: seriesData.keywords,
                series: [
                    {
                        seasonNumber: seriesData.seasonNumber,
                        episodes: seriesData.episodes,
                    },
                ],
            });
    
            await newSeries.save();
    
            // Clear the user state after saving
            delete userState[userId];
            await ctx.reply("Series saved successfully!", {
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
            const [name, season, caption, keywords] = ctx.message.text
                .split("|")
                .map((s) => s.trim());

            // Store series information and initialize episode number
            userState[userId] = {
                step: "awaitingSeriesFiles", // Change to awaiting series files
                seriesName: name,
                seasonNumber: parseInt(season), // Convert season to number
                caption: caption,
                keywords: keywords?.split(","),
                episodes: [], // Array to store episodes
                episodeNumber: 1, // Start from the first episode
            };

            await ctx.reply(
                "Now send the series episodes one by one. Press 'Done' when finished.",
                {
                    reply_markup: {
                        keyboard: [[{ text: "Done" }]],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                }
            );
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
