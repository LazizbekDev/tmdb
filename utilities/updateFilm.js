import Movie from "#model/MovieModel.js";
import Series from "#model/SeriesModel.js";

// utils/updateUtils.js
export async function getContentById(contentId) {
  let content = await Movie.findById(contentId);
  if (!content) {
    content = await Series.findById(contentId);
  }
  if (!content) {
    throw new Error("Content not found.");
  }
  return content;
}

export function getUpdateKeyboard(contentId, step, isSeries = false) {
  const options = {
    name: [
      { text: "Leave current name", callback_data: `leave_name_${contentId}` },
    ],
    description: [
      {
        text: "Leave current description",
        callback_data: `leave_description_${contentId}`,
      },
    ],
    film: [
      {
        text: isSeries ? "Leave current episodes" : "Leave current film",
        callback_data: `leave_film_${contentId}`,
      },
    ],
    teaser: [
      {
        text: "Leave current teaser",
        callback_data: `leave_teaser_${contentId}`,
      },
    ],
    keywords: [
      {
        text: "Leave current keywords",
        callback_data: `leave_keywords_${contentId}`,
      },
    ],
    save: [{ text: isSeries ? "Save series" : "Save film", callback_data: `save_${contentId}` }],
  };
  return {
    inline_keyboard: [options[step]],
  };
}

export async function sendUpdateMessage(ctx, message, contentId, step, isSeries = false) {
  await ctx.reply(message, {
    reply_markup: getUpdateKeyboard(contentId, step, isSeries),
  });
}
