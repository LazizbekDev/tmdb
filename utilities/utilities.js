import formatList, { generatePaginationButtons } from "../controllers/list/formatList.js";
import MovieModel from "../model/MovieModel.js";
import SeriesModel from "../model/SeriesModel.js";
import { adminNotifier } from "./admin_notifier.js";
import { getPaginatedData } from "./pagination.js";

// Hashtaglardan toza genre'larni chiqarish
export function extractGenres(keywords) {
  const tags = [];

  for (const kw of keywords || []) {
    const matches = kw.match(/#[^\s#]+/g);
    if (matches) {
      for (const tag of matches) {
        const clean = tag.replace("#", "").trim();
        if (clean && !tags.includes(clean)) {
          tags.push(clean);
        }
      }
    }
  }
  console.log("Extracted genres:", tags);
  return tags;
}

// Random content oluvchi helper
export async function getRandomContent(excludeIds = []) {
  const movie = await MovieModel.aggregate([
    { $match: { _id: { $nin: excludeIds } } },
    { $sample: { size: 1 } },
  ]);

  if (movie.length) return { type: "movie", data: movie[0] };

  const series = await SeriesModel.aggregate([
    { $match: { _id: { $nin: excludeIds } } },
    { $sample: { size: 1 } },
  ]);

  if (series.length) return { type: "series", data: series[0] };

  return null;
}

// Matnni tozalash funksiyasi
export const cleanText = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Diakritik belgilarni olib tashlash
    .replace(/[^\w\s]|_/g, "") // Barcha maxsus belgilarni olib tashlash, faqat harf va raqamlarni saqlash
    .replace(/\s+/g, "") // Bir nechta bo'shliqlarni olib tashlash
    .toLowerCase(); // Kichik harflarga o'tkazish

export const getExtension = (mimeType = "") => {
  const map = {
    "video/mp4": "mp4",
    "video/x-matroska": "mkv",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
  };
  return map[mimeType.toLowerCase()] || "mp4"; // default
};

export const handlePagination = async (ctx, bot, page, Model1 = MovieModel, Model2 = SeriesModel, limit = 10, query = {}, callbackPrefix = "search_list_", headerGenerator = null) => {
  try {
    // Paginated ma'lumotlarni olish
    const [result1, result2] = await Promise.all([
      getPaginatedData(Model1, page, limit, query),
      getPaginatedData(Model2, page, limit, query),
    ]);

    // Agar hech qanday ma'lumot topilmasa
    if (result1.data.length === 0 && result2.data.length === 0) {
      if (ctx.update.callback_query) {
        await ctx.answerCbQuery("😔 No results appeared!");
      } else {
        await ctx.reply("😔 No results appeared!");
      }
      return;
    }

    // Umumiy sahifalar sonini hisoblash
    const totalPages = Math.max(result1.totalPages, result2.totalPages);

    let header = "";
    if (headerGenerator && page === 1) {
      header = headerGenerator(result1.totalCount, result2.totalCount);
    }

    // Kontentni formatlash
    const content = header + formatList(result1.data, result2.data, page, limit);

    // Pagination tugmalarini yaratish
    const paginationButtons = generatePaginationButtons(page, totalPages, callbackPrefix);

    // Xabarni tahrirlash yoki yuborish
    if (ctx.update.callback_query) {
      await ctx.editMessageText(content || "No content available for this page.", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: paginationButtons },
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.replyWithHTML(content || "No content available for this page.", {
        reply_markup: { inline_keyboard: paginationButtons },
      });
    }
  } catch (error) {
    console.error("Error in pagination:", error);
    await ctx.reply("An error occurred while processing your request.");
    await adminNotifier(bot, error, ctx, "Pagination error");
  }
};

export const sendJoinWarning = async (ctx) => {
  const channel = process.env.CHANNEL_USERNAME;
  return ctx.reply(
    `You cannot save or share the content unless you join the main <a href='https://t.me/${channel}'>channel</a> `,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Join", url: `https://t.me/${channel}` }],
          [{ text: "Check", callback_data: "check_membership" }],
        ],
      },
    }
  );
};

export const generateInteractiveKeyboard = async (ctx, item, isInWatchlist, isAdmin) => {
  const keyboard = [];

  if (isAdmin) {
    keyboard.push([
      { text: "Delete 🗑", callback_data: `delete_${item._id}` },
      { text: "Update ✏️", callback_data: `update_${item._id}` },
    ]);
  }

  // Watchlist toggle
  keyboard.push([
    {
      text: isInWatchlist ? "Remove from Watch List 🗑" : "📌 Add to Watch List",
      callback_data: isInWatchlist ? `remove_later_${item._id}` : `save_later_${item._id}`,
    },
  ]);

  // Similar Movies
  if (process.env.WEB) {
    keyboard.push([
      { text: "Similar Movies 🎥", web_app: { url: `${process.env.WEB}movie/${item._id}/similar` } },
    ]);
  }

  // Search
  keyboard.push([{ text: "Search", switch_inline_query_current_chat: "" }]);

  // Share to Story
  let videoUrl = "";
  try {
    if (item.teaser) {
      const file = await ctx.telegram.getFile(item.teaser);
      // WARNING: Passing BOT_TOKEN inside the URL exposes it strictly on the client side. 
      // It is heavily advised to proxy this via your own server endpoint.
      videoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    }
  } catch (error) {
    console.error("Failed to generate file URL for story sharing:", error);
  }

  if (videoUrl) {
    // IMPORTANT: Replace this URL with your actual deployed Mini App domain (e.g. from Vercel/Netlify)
    const MINI_APP_URL = "https://sage-mandazi-baa4d5.netlify.app/";
    const encodedVideo = encodeURIComponent(videoUrl);
    const encodedName = encodeURIComponent(item.name || "Kino");

    keyboard.push([
      { text: "✨ Share to Story", web_app: { url: `${MINI_APP_URL}/?video=${encodedVideo}&name=${encodedName}&movie_id=${item._id}&bot_username=${process.env.BOT_USERNAME || 'kasimkhujaevabot'}` } },
    ]);
  }

  return keyboard;
};

export const checkIsAdmin = (ctx) => {
  return ctx.from?.id === parseInt(process.env.ADMIN_ID) || ctx.from?.username?.toLowerCase() === process.env.ADMIN?.toLowerCase();
};

export const findContentById = async (Movie, Series, id) => {
  let content = await Movie.findById(id);
  if (!content) {
    content = await Series.findById(id);
  }
  return content;
};

export const getWatchlistToggleButton = (movieId, isAdded) => {
  return {
    inline_keyboard: [
      [
        {
          text: isAdded ? "💔 Remove" : "❤️ Add to Watchlist",
          callback_data: isAdded ? "remove_later_${movieId}" : "save_later_${movieId}",
        },
      ],
      [
        {
          text: "🔍 Search",
          switch_inline_query_current_chat: "",
        },
      ],
    ],
  };
};
