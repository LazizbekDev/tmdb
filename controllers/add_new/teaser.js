import Movie from "../../model/MovieModel.js";
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

export default async function teaser(ctx, userState) {
    const teaser = ctx.message.video;
    const userId = ctx.from.id;

    const filmpath = await getPath(userState[userId].videoFileId, "movieUrl");
    const teaserpath = await getPath(teaser.file_id, "teaser");

    const movie = new Movie({
        name: userState[userId].name,
        cleanedName: cleanText(userState[userId].name),
        caption: userState[userId].caption,
        movieUrl: userState[userId].videoFileId,
        fileType: userState[userId].fileType,
        teaser: teaser.file_id,
        size: userState[userId].movieSize,
        duration: userState[userId].duration,
        keywords: userState[userId].keywords.split(","),
        cleanedKeywords: userState[userId].keywords.split(",").map(keyword => cleanText(keyword)),
        accessedBy: [],
        filmpath,
        teaserpath
    });

    await movie.save();

    const captionText = `
🎞 ️<b><a href='https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}'>${userState[userId].name}</a></b>
    
<b>💾 Size: ${userState[userId].movieSize ?? userState[userId].size}\n⏳ Running time: ${userState[userId].duration}</b>

<i>${userState[userId].caption}</i>

<blockquote>${userState[userId].keywords}</blockquote>`;

    await ctx.telegram.sendVideo(process.env.ID, teaser.file_id, {
        caption: captionText,
        parse_mode: "HTML",
    });

    await ctx.reply(
        `✅ The movie <b>"${userState[userId].name}"</b> has been added to @${process.env.CHANNEL_USERNAME} successfully!\n\n👉 <a href="https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}">Check out</a>`,
        { parse_mode: "HTML" }
    );

    delete userState[userId]; // Clean up user state after completion
}