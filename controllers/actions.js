import Movie from "../model/MovieModel.js";
import info from "./add_new/info.js";
import movie from "./add_new/movie.js";
import teaser from "./add_new/teaser.js";
const userState = {};

export default function Actions(bot) {
    bot.command("search", async (ctx) => {
        const query = ctx.message.text.split(" ").slice(1).join(" ");
        if (!query) {
            return ctx.reply("Please provide a search keyword.");
        }

        // Search by movie name or keywords
        const movie = await Movie.findOne({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { keywords: { $regex: query, $options: "i" } },
            ],
        });

        if (movie) {
            console.log(movie.fileType);
            try {
                if (movie.fileType.startsWith("video/mp4")) {
                    // Check if it's an MP4 file
                    const captionText = `
🎞 ️"<b>${movie.name}</b>"
▪️Size: ${movie.size}
▪️Running time: ${movie.duration}
▪️Keywords: ${movie.keywords.join(', ')}
`;

                    await ctx.telegram.sendVideo(
                        ctx.from.id,
                        movie.movieUrl,
                        {
                            caption: captionText,
                            parse_mode: "HTML",
                        }
                    );
                } else {
                    await ctx.replyWithDocument(movie.movieUrl, {
                        // For other file types
                        caption: `${movie.name}\n${movie.caption}`,
                    });
                }
            } catch (error) {
                console.error("Failed to send media:", error);
                await ctx.reply("There was an error sending the media.");
            }
        } else {
            console.log(movie); // Log for debugging purposes
            await ctx.reply("No media found for your search.");
        }
    });

    bot.action("add", async (ctx) => {
        const isAdmin = ctx.from.username.toLowerCase() === process.env.ADMIN;
        if (!isAdmin) {
            return ctx.reply("You are not authorized to add media files.");
        }
        await ctx.answerCbQuery("send movie")
        await ctx.reply("Please send the video file (mp4, mvm, etc.).");

        const userId = ctx.from.id;

        userState[userId] = {
            step: "awaitingVideo",
        };

        await ctx.reply("Please send the main video file.");
    });

    bot.on("video", async (ctx) => {
        const userId = ctx.from.id;
        const file = ctx.message.video;

        if (userState[userId] && userState[userId].step === "awaitingVideo") {
            await movie(ctx, userState, file)
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingTeaser"
        ) {
            await teaser(ctx, userState);
        } else {
            await ctx.reply("Please start by using the /add_movie command.");
        }
    });

    bot.on("text", async (ctx) => {
        const userId = ctx.from.id;

        if (userState[userId] && userState[userId].step === "awaitingDetails") {
            await info(ctx, userState);
        } else {
            await ctx.reply("Please start by using the /add_movie command.");
        }
    });
}
