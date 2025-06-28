import formatList, { generatePaginationButtons } from "../controllers/list/formatList.js";
import MovieModel from "../model/MovieModel.js";
import SeriesModel from "../model/SeriesModel.js";
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

export const handlePagination = async (ctx, bot, page, Model1 = MovieModel, Model2 = SeriesModel, limit = 10) => {
  try {
    // Paginated ma'lumotlarni olish
    const [result1, result2] = await Promise.all([
      getPaginatedData(Model1, page, limit),
      getPaginatedData(Model2, page, limit),
    ]);

    // Umumiy sahifalar sonini hisoblash
    const totalPages = Math.max(result1.totalPages, result2.totalPages);

    // Kontentni formatlash
    const content = formatList(result1.data, result2.data, page, limit);

    // Pagination tugmalarini yaratish
    const paginationButtons = generatePaginationButtons(page, totalPages);

    // Xabarni tahrirlash yoki yuborish
    await ctx.editMessageText(content, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: paginationButtons },
    });
  } catch (error) {
    console.error("Error in pagination:", error);
    await ctx.reply("An error occurred while processing your request.");
    await adminNotifier(bot, error, ctx, "Pagination error");
  }
};
