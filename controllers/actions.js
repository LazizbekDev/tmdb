import Movie from "../model/MovieModel.js";

export default function Actions(bot) {
    bot.command('search', async (ctx) => {
        const query = ctx.message.text.split(' ').slice(1).join(' ');
        if (!query) {
            return ctx.reply('Please provide a search keyword.');
        }
    
        // Search by movie name or keywords
        const movie = await Movie.findOne({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { keywords: { $regex: query, $options: 'i' } }
            ]
        });
    
        if (movie) {
            console.log(movie.fileType)
            try {
                if (movie.fileType.startsWith('video/mp4')) { // Check if it's an MP4 file
                    await ctx.replyWithVideo(movie.movieUrl, { 
                        caption: `${movie.name}\n**${movie.caption}**`,
                    });
                } else {
                    await ctx.replyWithDocument(movie.movieUrl, { // For other file types
                        caption: `${movie.name}\n${movie.caption}`
                    });
                }
            } catch (error) {
                console.error("Failed to send media:", error);
                await ctx.reply('There was an error sending the media.');
            }
        } else {
            console.log(movie); // Log for debugging purposes
            await ctx.reply('No media found for your search.');
        }
    });
    bot.action("add", async (ctx) => {
        const isAdmin = ctx.from.username.toLowerCase() === process.env.ADMIN;
        if (!isAdmin) {
            return ctx.reply("You are not authorized to add media files.");
        }
    
        await ctx.reply("Please send the movie file.");
    
        bot.on("document", async (ctx) => {
            const file = ctx.message.document;
            const fileType = file.mime_type; // Get the MIME type of the file
            const fileId = file.file_id;
    
            // Check if the file is a video
            if (!fileType.startsWith('video/')) {
                return ctx.reply("Only video files are accepted. Please send a valid video file.");
            }
    
            await ctx.reply("Please send the name and caption in the format: name | caption | keywords");
    
            bot.on("text", async (ctx) => {
                const [name, caption, keywords] = ctx.message.text.split("|").map((text) => text.trim());
    
                if (!name || !caption || !keywords) {
                    return ctx.reply("Please make sure to send all required fields in the correct format.");
                }
    
                const movie = new Movie({
                    name,
                    caption,
                    movieUrl: fileId,
                    fileType, // Store the file type
                    keywords: keywords.split(","),
                });
    
                await movie.save();
                await ctx.reply(`The movie "${name}" has been added successfully!`);
            });
        });
    });
}