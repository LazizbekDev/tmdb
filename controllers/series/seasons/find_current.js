import Series from "../../../model/SeriesModel.js";

export default async function findCurrentSeason(ctx) {
    const series = await Series.find({
        $or: [
            { name: { $regex: ctx.message.text, $options: "i" } },
        ],
    });

    if (!series || series.length === 0) {
        return ctx.reply(
            "Series not found! Please provide a valid series name or ID."
        );
    }

    // Store session data for the user
    ctx.session.step = "awaitingNewSeasonDetails";
    ctx.session.seriesId = series[0]._id;

    await ctx.reply(
        `Please provide the season number for <i>${series[0].name}</i>\nfollowed by the episodes (send one by one). Press 'Done' when finished.`,
        {
            reply_markup: {
                keyboard: [[{ text: "Done" }]],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
            parse_mode: "HTML",
        }
    );
}
