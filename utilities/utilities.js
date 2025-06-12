import MovieModel from "../model/MovieModel.js";
import SeriesModel from "../model/SeriesModel.js";

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
