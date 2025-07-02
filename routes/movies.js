import Movie from "../model/MovieModel.js";
import { checkAdmin } from "../middleware/auth.js";
import axios from "axios";
import mongoose from "mongoose";

export default function setupRoutes(app) {
  // Health check route
  app.get("/", async (req, res) => {
    try {
      const { formatCpuUsage, formatMemoryUsage, formatUptime, getSystemLoad } =
        await import("../utilities/vote.js");
      const userCount = await (
        await import("../model/User.js")
      ).default.countDocuments();
      res.json({
        status: "success",
        message: "Bot is running!",
        timestamp: new Date().toISOString(),
        uptime: formatUptime(process.uptime()),
        memoryUsage: formatMemoryUsage(process.memoryUsage().heapUsed),
        cpuUsage: formatCpuUsage(process.cpuUsage()),
        systemLoad: getSystemLoad(),
        usersCount: userCount,
      });
    } catch (err) {
      res.status(500).json({
        status: "error",
        message: "Something went wrong",
        error: err.message,
      });
    }
  });

  // Barcha filmlarni olish
  app.get("/api/movies", async (req, res) => {
    try {
      const movies = await Movie.find();
      res.json(movies);
    } catch (err) {
      console.error("Filmlarni olishda xato:", err);
      res.status(500).json({ error: "Filmlarni olishda xatolik" });
    }
  });

  // Bitta filmni ID bo‘yicha olish
  app.get("/api/movies/:id", async (req, res) => {
    try {
      const movie = await Movie.findById(req.params.id);
      if (!movie) {
        return res.status(404).json({ error: "Film topilmadi" });
      }
      res.json(movie);
    } catch (err) {
      console.error("Filmni olishda xato:", err);
      res.status(500).json({ error: "Filmni olishda xatolik" });
    }
  });

app.get("/api/recommendations/:id", async (req, res) => {
  try {

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid movie ID format" });
    }

    // Fetch the movie
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      console.log("Movie not found for ID:", req.params.id);
      return res.status(404).json({ error: "Movie not found" });
    }

    // Log movie keywords for debugging
    const normalizedKeywords = (movie.keywords || [])
      .flatMap((kw) => kw.replace(/#/g, "").split(/[\s,]+/))
      .filter((kw) => kw.trim() !== "")
      .map((kw) => kw.toLowerCase());
    console.log("Normalized keywords:", normalizedKeywords);

    // Fetch recommendations with randomization
    const recommendations = await Movie.aggregate([
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(req.params.id) },
          $or: [
            { keywords: { $in: normalizedKeywords } }, // Matches array-based keywords
            { keywords: { $regex: normalizedKeywords.join("|"), $options: "i" } }, // Matches string-based keywords
          ],
        },
      },
      { $sample: { size: 5 } }, // Randomize results, return up to 5
    ]);

    console.log("Recommendations found:", recommendations.length);
    res.json(recommendations);
  } catch (err) {
    console.error("Error in /recommendations/:id:", {
      message: err.message,
      stack: err.stack,
      movieId: req.params.id,
    });
    res.status(500).json({ error: "Failed to fetch recommendations", details: err.message });
  }
});

  // Yangi film qo‘shish
  app.post("/api/movies", checkAdmin, async (req, res) => {
    try {
      const movie = new Movie({
        name: req.body.name,
        caption: req.body.caption,
        movieUrl: req.body.movieUrl,
        keywords: req.body.keywords,
        fileType: req.body.fileType,
        teaser: req.body.teaser,
        size: req.body.size,
        duration: req.body.duration,
        views: req.body.views || 0,
        accessedBy: req.body.accessedBy || [],
      });
      await movie.save();
      res.json(movie);
    } catch (err) {
      console.error("Film qo‘shishda xato:", err);
      res.status(500).json({ error: "Film qo‘shishda xatolik" });
    }
  });

  // Filmni yangilash
  app.put("/api/movies/:id", checkAdmin, async (req, res) => {
    try {
      console.log("PUT /api/movies/:id payload:", req.body); // Log incoming payload
      const {
        name,
        caption,
        movieUrl,
        keywords,
        fileType,
        teaser,
        size,
        duration,
        views,
        accessedBy,
      } = req.body;

      // Validate required fields
      if (!name || !caption || !movieUrl || !fileType) {
        return res.status(400).json({
          error: "Name, caption, movieUrl, and fileType are required",
        });
      }

      const updateData = {
        name,
        caption,
        movieUrl,
        keywords: Array.isArray(keywords) ? keywords : [],
        fileType,
        teaser: teaser || "",
        size: size || "",
        duration: duration || "",
        views: parseInt(views) || 0,
        accessedBy: Array.isArray(accessedBy) ? accessedBy : [],
      };

      const movie = await Movie.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      });
      if (!movie) {
        return res.status(404).json({ error: "Film topilmadi" });
      }
      res.json(movie);
    } catch (err) {
      console.error("Filmni yangilashda xato:", err);
      res
        .status(500)
        .json({ error: "Filmni yangilashda xatolik", details: err.message });
    }
  });

  // Filmni o‘chirish
  app.delete("/api/movies/:id", checkAdmin, async (req, res) => {
    try {
      const movie = await Movie.findByIdAndDelete(req.params.id);
      if (!movie) {
        return res.status(404).json({ error: "Film topilmadi" });
      }
      console.log(`Film o'chirildi: ${movie.name}`);
      res.json({ browserslist: { status: "OK" } });
    } catch (err) {
      console.error("Filmni o‘chirishda xato:", err);
      res.status(500).json({ error: "Filmni o‘chirishda xatolik" });
    }
  });

  // Fayl URL’ini olish
  app.get("/api/file/:fileId", async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const response = await axios.get(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
      );
      if (!response.data.ok) {
        throw new Error("Faylni olishda xato");
      }
      const filePath = response.data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
      console.log("Fayl URL:", fileUrl);
      res.json({ fileUrl });
    } catch (err) {
      console.error("Fayl URL’ini olishda xato:", err);
      res.status(500).json({ error: "Faylni olishda xatolik" });
    }
  });
}
