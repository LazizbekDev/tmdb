export default async function title(ctx) {
    const [name, season, caption, keywords] = ctx.message.text
        .split("|")
        .map((s) => s.trim());

    ctx.session.step = "awaitingSeriesTeaser"; // Keyingi bosqich
    ctx.session.seriesName = name;
    ctx.session.seasonNumber = parseInt(season); // String -> number
    ctx.session.caption = caption;
    ctx.session.keywords = keywords?.split(",").map(k => k.trim());
    ctx.session.episodes = [];
    ctx.session.episodeNumber = 1;

    await ctx.reply("Now send the teaser of the series");
}
