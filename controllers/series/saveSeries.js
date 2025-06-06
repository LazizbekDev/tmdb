import Series from "../../model/SeriesModel.js";

export default async function saveSeries(ctx, userState, userId) {
    const seriesData = userState[userId];

    // Prepare the series model to save
    const newSeries = new Series({
        name: seriesData.seriesName,
        caption: seriesData.caption,
        keywords: seriesData.keywords,
        teaser: seriesData.teaser,
        series: [
            {
                seasonNumber: seriesData.seasonNumber,
                episodes: seriesData.episodes,
            },
        ],
    });

    await newSeries.save();

// Send to the main channel
await ctx.telegram.sendVideo(process.env.ID, newSeries.teaser, {
    caption: `
🎞️ <b><a href="https://t.me/${process.env.BOT_USERNAME}?start=${newSeries._id}">${newSeries.name}</a></b>

📀 <b>Season ${newSeries.series[0].seasonNumber}</b>
🎬 <b>Total Episodes:</b> ${newSeries.series?.[0]?.episodes?.length || 0}

<i>${newSeries.caption}</i>

<blockquote>${newSeries.keywords?.join(",")}</blockquote>
`,
    parse_mode: "HTML",
});


    // Confirm with the user that the series was saved
    await ctx.replyWithVideo(newSeries.teaser, {
        caption: `<b>${newSeries.name.toUpperCase()}</b> saved successfully!\n🔗 <a href='https://t.me/${
            process.env.BOT_USERNAME
        }?start=${newSeries._id}'>Click to watch</a>`,
        reply_markup: {
            remove_keyboard: true, // Remove the keyboard after done
        },
        parse_mode: "HTML",
    });

    // Clear the user state after saving
    delete userState[userId];
}
