import Movie from "../../model/MovieModel.js";

export default async function teaser(ctx, userState) {
    // Handle teaser video
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
}
