import Series from "../../model/SeriesModel.js";
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
      return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${res.data.result.file_path}`;
    } else {
      console.log(`⚠️ ${label} uchun file_path yo‘q:`, res.data);
    }
  } catch (err) {
    console.log(`❌ ${label} uchun xatolik:`, err.message);
  }

  return null;
};

export default async function saveSeries(ctx) {
  const seriesData = ctx.session;

  const teaserpath = await getPath(seriesData.teaser, "series teaser");

  const newSeries = new Series({
    name: seriesData.seriesName,
    cleanedName: cleanText(seriesData.seriesName),
    caption: seriesData.caption,
    keywords: seriesData.keywords,
    cleanedKeywords: Array.isArray(seriesData.keywords)
      ? seriesData.keywords.map((k) => cleanText(k))
      : seriesData.keywords.split(",").map((k) => cleanText(k)),
    teaser: seriesData.teaser,
    teaserpath,
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
🎞️ <b><a href="https://t.me/${process.env.BOT_USERNAME}?start=${
      newSeries._id
    }">${newSeries.name}</a></b>

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
      remove_keyboard: true,
    },
    parse_mode: "HTML",
  });

  delete ctx.session;
}
