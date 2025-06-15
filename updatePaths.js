import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import path from "path";
import Movies from "./model/MovieModel.js";
import Series from "./model/SeriesModel.js";
import { getExtension } from "./utilities/utilities.js";

dotenv.config();

const getMimeTypeFromUrl = async (fileUrl) => {
  try {
    const res = await axios.head(fileUrl);
    return res.headers["content-type"];
  } catch (e) {
    console.log("❌ MIME aniqlanmadi:", e.message);
    return null;
  }
};

const getExtensionSmart = async (fileUrl, filePath, fileType) => {
  if (fileType) return getExtension(fileType);
  if (filePath && filePath.includes(".")) {
    return path.extname(filePath).replace(".", "");
  }
  const mime = await getMimeTypeFromUrl(fileUrl);
  return getExtension(mime);
};

const getPath = async (fileId, label) => {
  if (!fileId || typeof fileId !== "string" || fileId.trim().length < 10) {
    console.log(`❌ ${label} file_id noto‘g‘ri:`, fileId);
    return { url: null, filePath: null };
  }

  try {
    const res = await axios.get(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
    );

    if (res.data.ok && res.data.result?.file_path) {
      const filePath = res.data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
      return { url: fileUrl, filePath };
    } else {
      console.log(`⚠️ ${label} uchun file_path yo‘q:`, res.data);
    }
  } catch (err) {
    console.log(`❌ ${label} uchun xatolik:`, err.message);
  }

  return { url: null, filePath: null };
};

const updateDatabase = async () => {
  try {
    await mongoose.connect(process.env.DB);
    console.log("✅ DB bilan ulanish o‘rnatildi.");

    const movies = await Movies.find({});
    for (const movie of movies) {
      const updatedFields = {};

      if (movie.movieUrl && !movie.filmpath) {
        const { url, filePath } = await getPath(movie.movieUrl, "movieUrl");
        if (url) {
          updatedFields.filmpath = url;
          updatedFields.filmext = await getExtensionSmart(url, filePath, movie.fileType);
        }
      }

      if (movie.teaser && !movie.teaserpath) {
        const { url, filePath } = await getPath(movie.teaser, "teaser");
        if (url) {
          updatedFields.teaserpath = url;
          updatedFields.teaserext = await getExtensionSmart(url, filePath, null); // mostly mp4
        }
      }

      if (Object.keys(updatedFields).length > 0) {
        await Movies.updateOne({ _id: movie._id }, { $set: updatedFields });
        console.log(`🎬 [Movie] ${movie.name} yangilandi`);
      }
    }

    const seriesList = await Series.find({});
    for (const series of seriesList) {
      if (series.teaser ) {
        const { url, filePath } = await getPath(series.teaser, "series teaser");
        if (url) {
          const teaserext = await getExtensionSmart(url, filePath, null);
          await Series.updateOne(
            { _id: series._id },
            { $set: { teaserpath: url, teaserext } }
          );
          console.log(`📺 [Series] ${series.name} yangilandi`);
        }
      }
    }

    console.log("🎉 Barcha hujjatlar yangilandi.");
    mongoose.disconnect();
  } catch (err) {
    console.error("❌ Umumiy xatolik:", err.message);
    mongoose.disconnect();
  }
};

updateDatabase();
