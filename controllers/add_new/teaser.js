import Movie from "../../model/MovieModel.js";
import caption from "../../utilities/caption.js";

export default async function teaser(ctx, userState) {
    const teaser = ctx.message.video;
    const userId = ctx.from.id;

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

    const captionText = caption(userState[userId], movie._id)

    await ctx.telegram.sendVideo(process.env.ID, teaser.file_id, {
        caption: captionText,
        parse_mode: "HTML",
    });

    await ctx.reply(
        `✅ The movie <b>"${userState[userId].name}"</b> has been added to @${process.env.CHANNEL_USERNAME} successfully!\n\n👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}">Check out</a>`,
        {parse_mode: "HTML"}
    );
    delete userState[userId]; // Clean up user state after completion
}
