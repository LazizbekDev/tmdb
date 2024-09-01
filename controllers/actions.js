import Movie from "../model/MovieModel.js";
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

    bot.command("add_video", async (ctx) => {
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
            if (!file) {
                return ctx.reply("Please send a valid video file.");
            }

            const fileType = file.mime_type;

            const formatFileSize = (size) => {
                console.log(size);
                if (size < 1024) return `${size} bytes`;
                else if (size < 1048576)
                    return `${(size / 1024).toFixed(2)} KB`;
                else if (size < 1073741824)
                    return `${(size / 1048576).toFixed(2)} MB`;
                else return `${(size / 1073741824).toFixed(2)} GB`;
            };
            function formatDuration(seconds) {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);

                const paddedHours = hours.toString().padStart(2, "0");
                const paddedMinutes = minutes.toString().padStart(2, "0");
                const paddedSeconds = secs.toString().padStart(2, "0");

                return `${paddedHours}h ${paddedMinutes}m ${paddedSeconds}s`;
            }

            console.log(file);

            if (!fileType.startsWith("video/")) {
                return ctx.reply(
                    "Only video files are accepted. Please send a valid video file."
                );
            }

            userState[userId] = {
                step: "awaitingDetails",
                videoFileId: file.file_id,
                fileType: fileType,
                movieSize: formatFileSize(file.file_size),
                duration: formatDuration(file.duration),
            };

            await ctx.reply(
                "Video received. Please send the movie details in the format: name | caption | keywords"
            );
        } else if (
            userState[userId] &&
            userState[userId].step === "awaitingTeaser"
        ) {
            // Handle teaser video
            const teaser = ctx.message.video;

            // const teaserFileSize = teaser.file_size; // File size in bytes

            // Convert file size from bytes to a human-readable format

            const movie = new Movie({
                name: userState[userId].name,
                caption: userState[userId].caption,
                movieUrl: userState[userId].videoFileId,
                fileType: userState[userId].fileType,
                teaser: teaser.file_id,
                size: userState[userId].movieSize,
                duration: userState[userId].duration,
                keywords: userState[userId].keywords.split(","),
            });

            await movie.save();

            const captionText = `
🎞 ️"<b>${userState[userId].name}</b>"

▪️Size: ${userState[userId].movieSize}
▪️Running time: ${userState[userId].duration}
▪️Keywords: ${userState[userId].keywords}

👉 Watch movie: <a href="https://t.me/kasimkhujaevabot">here</a>
`;

            console.log(userState[userId].keywords);

            await ctx.telegram.sendVideo(process.env.ID, teaser.file_id, {
                caption: captionText,
                parse_mode: "HTML",
            });

            await ctx.reply(
                `The movie "${userState[userId].name}" has been added successfully!`
            );
            delete userState[userId]; // Clean up user state after completion
        } else {
            await ctx.reply("Please start by using the /add_movie command.");
        }
    });

    bot.on("text", async (ctx) => {
        const userId = ctx.from.id;

        if (userState[userId] && userState[userId].step === "awaitingDetails") {
            const [name, caption, keywords] = ctx.message.text
                .split("|")
                .map((text) => text.trim());

            if (!name || !caption || !keywords) {
                return ctx.reply(
                    "Please make sure to send all required fields in the correct format: name | caption | keywords"
                );
            }

            userState[userId] = {
                step: "awaitingTeaser",
                name,
                caption,
                keywords,
                videoFileId: userState[userId].videoFileId,
                fileType: userState[userId].fileType,
                movieSize: userState[userId].movieSize,
                duration: userState[userId].duration,
            };

            await ctx.reply("Now send the teaser video");
        } else {
            await ctx.reply("Please start by using the /add_movie command.");
        }
    });

    // Command for adding a document
    bot.command("add_document", async (ctx) => {
        const isAdmin = ctx.from.username.toLowerCase() === process.env.ADMIN;
        if (!isAdmin) {
            return ctx.reply("You are not authorized to add media files.");
        }

        await ctx.reply("Please send the document file.");

        // Listen for the next document message
        bot.on("document", async (ctx) => {
            const file = ctx.message.document;

            if (!file) {
                return ctx.reply("Please send a valid document file.");
            }

            const fileType = file.mime_type;

            if (fileType.startsWith("video/")) {
                return ctx.reply(
                    "This command is for documents only. Please use the video command."
                );
            }

            const fileId = file.file_id;

            await ctx.reply(
                "Document received. Please send the movie details in the format: name | caption | keywords"
            );

            // Wait for the next text message for details
            bot.on("text", async (ctx) => {
                const [name, caption, keywords] = ctx.message.text
                    .split("|")
                    .map((text) => text.trim());

                if (!name || !caption || !keywords) {
                    return ctx.reply(
                        "Please make sure to send all required fields in the correct format: name | caption | keywords"
                    );
                }

                const movie = new Movie({
                    name,
                    caption,
                    movieUrl: fileId,
                    fileType,
                    keywords: keywords.split(","),
                });

                await movie.save();
                await ctx.reply(
                    `The movie "${name}" has been added successfully!`
                );
            });
        });
    });
}
