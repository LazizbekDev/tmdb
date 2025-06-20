import Movie from "../model/MovieModel.js";

// utils/updateUtils.js
export async function getMovieById(movieId) {
  const movie = await Movie.findById(movieId);
  if (!movie) {
    throw new Error("Movie not found.");
  }
  return movie;
}

export function getUpdateKeyboard(movieId, step) {
  const options = {
    name: [
      { text: "Leave current name", callback_data: `leave_name_${movieId}` },
    ],
    description: [
      { text: "Leave current description", callback_data: `leave_description_${movieId}` },
    ],
    keywords: [
      { text: "Leave current keywords", callback_data: `leave_keywords_${movieId}` },
    ],
    save: [{ text: "Save film", callback_data: `save_${movieId}` }],
  };
  return {
    inline_keyboard: [options[step]],
  };
}

export async function sendUpdateMessage(ctx, message, movieId, step) {
  await ctx.reply(message, {
    reply_markup: getUpdateKeyboard(movieId, step),
  });
}