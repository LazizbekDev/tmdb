import Movie from "../../model/MovieModel.js";
import caption from "../../utilities/caption.js";
import { cleanText } from "../../utilities/utilities.js";
import axios from "axios";

const getPath = async (fileId, label) => {
    if (!fileId || typeof fileId !== "string" || fileId.trim().length < 10) {
        console.log(`❌ ${label} file_id noto‘g‘ri:`, fileId);
        return null;
    }

    try {
        const res = await axios.get(
            `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
        );
        if (res.data.ok && res.data.result?.file_path) {
            const path = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${res.data.result.file_path}`;
            return path;
        } else {
            console.log(`⚠️ ${label} uchun file_path yo‘q:`, res.data);
        }
    } catch (err) {
        console.log(`❌ ${label} uchun xatolik:`, err.message);
    }
    return null;
};

export default async function teaser(ctx) {
    const teaser = ctx.message.video;

    const filmpath = await getPath(ctx.session.videoFileId, "movieUrl");
    const teaserpath = await getPath(teaser.file_id, "teaser");

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
        filmpath,
        teaserpath
    });

    await movie.save();

    await ctx.telegram.sendVideo(process.env.ID, teaser.file_id, {
        caption: caption(movie),
        parse_mode: "HTML",
    });

    await ctx.reply(
        `✅ The movie <b>"${ctx.session.name}"</b> has been added to @${process.env.CHANNEL_USERNAME} successfully!\n\n👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}">Check out</a>`,
        { parse_mode: "HTML" }
    );

    delete ctx.session; // Clean up user state after completion
}