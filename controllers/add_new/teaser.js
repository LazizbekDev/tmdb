import Movie from "../../model/MovieModel.js";
import caption from "../../utilities/caption.js";
import { cleanText } from "../../utilities/utilities.js";

export default async function teaser(ctx) {
    const teaser = ctx.message.video;

    const movie = new Movie({
        name: ctx.session.name,
        cleanedName: cleanText(ctx.session.name),
        caption: ctx.session.caption,
        movieUrl: ctx.session.videoFileId,
        fileType: ctx.session.fileType,
        teaser: teaser.file_id,
        size: ctx.session.movieSize,
        duration: ctx.session.duration,
        keywords: ctx.session.keywords.split(","),
        cleanedKeywords: ctx.session.keywords.split(",").map(keyword => cleanText(keyword)),
        accessedBy: [],
    });

    await movie.save();

    await ctx.telegram.sendVideo(process.env.ID, teaser.file_id, {
        caption: caption(movie),
        parse_mode: "HTML",
    });

    ctx.session = null;

    return await ctx.reply(
        `✅ The movie <b>"${ctx.session.name}"</b> has been added to @${process.env.CHANNEL_USERNAME} successfully!\n\n👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}">Check out</a>`,
        { parse_mode: "HTML" }
    );
}
