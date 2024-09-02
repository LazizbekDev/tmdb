export default async function info(ctx, userState) {
    const [name, caption, keywords] = ctx.message.text
        .split("|")
        .map((text) => text.trim());

    if (!name || !caption || !keywords) {
        return ctx.reply(
            "Please make sure to send all required fields in the correct format: name | caption | keywords"
        );
    }

    userState[ctx.from.id] = {
        step: "awaitingTeaser",
        name,
        caption,
        keywords,
        videoFileId: userState[ctx.from.id].videoFileId,
        fileType: userState[ctx.from.id].fileType,
        movieSize: userState[ctx.from.id].movieSize,
        duration: userState[ctx.from.id].duration,
    };

    await ctx.reply("Now send the teaser video");
}
