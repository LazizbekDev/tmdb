import Movie from "#model/MovieModel.js";
import caption from "#utilities/caption.js";
import { cleanText } from "#utilities/utilities.js";

export const saveAiMovie = async (ctx) => {
    try {
        const { name, caption: movieCaption, keywords, videoFileId, fileType, movieSize, duration, teaser } = ctx.session.movieData;

        const movie = new Movie({
            name: name,
            cleanedName: cleanText(name),
            caption: movieCaption,
            movieUrl: videoFileId,
            fileType: fileType,
            teaser: teaser || null,
            size: movieSize,
            duration: duration,
            keywords: keywords,
            cleanedKeywords: keywords.map(keyword => cleanText(keyword)),
            accessedBy: [],
        });

        await movie.save();

        if (teaser) {
            await ctx.telegram.sendVideo(process.env.ID, teaser, {
                caption: caption(movie),
                parse_mode: "HTML",
            });
        } else {
            await ctx.telegram.sendVideo(process.env.ID, videoFileId, {
                caption: caption(movie),
                parse_mode: "HTML",
            });
        }

        ctx.session.step = null;
        ctx.session.movieData = null;

        return await ctx.reply(
            `✅ The AI movie <b>"${movie.name}"</b> has been added to @${process.env.CHANNEL_USERNAME} successfully!\n\n👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}">Check out</a>`,
            { parse_mode: "HTML" }
        );
    } catch (error) {
        console.error("Error saving AI movie:", error);
        await ctx.reply("❌ Failed to save the movie. Please try again.");
    }
};

export const saveManualMovie = async (ctx) => {
    try {
        const { name, caption: movieCaption, keywords, videoFileId, fileType, movieSize, duration, teaser } = ctx.session.movieData;

        const movie = new Movie({
            name: name,
            cleanedName: cleanText(name),
            caption: movieCaption,
            movieUrl: videoFileId,
            fileType: fileType,
            teaser: teaser || null,
            size: movieSize,
            duration: duration,
            keywords: keywords,
            cleanedKeywords: keywords.map(keyword => cleanText(keyword)),
            accessedBy: [],
        });

        await movie.save();

        if (teaser) {
            await ctx.telegram.sendVideo(process.env.ID, teaser, {
                caption: caption(movie),
                parse_mode: "HTML",
            });
        } else {
            await ctx.telegram.sendVideo(process.env.ID, videoFileId, {
                caption: caption(movie),
                parse_mode: "HTML",
            });
        }

        ctx.session.step = null;
        ctx.session.movieData = null;

        return await ctx.reply(
            `✅ The movie <b>"${movie.name}"</b> has been added to @${process.env.CHANNEL_USERNAME} successfully!\n\n👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}">Check out</a>`,
            { parse_mode: "HTML" }
        );
    } catch (error) {
        console.error("Error saving manual movie:", error);
        await ctx.reply("❌ Failed to save the movie. Please try again.");
    }
};
