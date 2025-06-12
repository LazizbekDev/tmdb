import express from "express";
import { Telegraf } from "telegraf";
import { config } from "dotenv";
import { connect } from "./db.js";
import actions from "./controllers/actions.js";
import replyToUser from "./controllers/feedback/replyToUser.js";
import { handleStart } from "./controllers/handler.js";
import {
  formatCpuUsage,
  formatMemoryUsage,
  formatUptime,
  getSystemLoad,
  postSubmissionsForVoting,
} from "./utilities/vote.js";
import User from "./model/User.js";
import { suggestMovie } from "./controllers/suggestion.js";
import cron from "node-cron";
import axios from "axios";
import SuggestionLog from "./model/suggestion_log.js";
import Movie from "./model/MovieModel.js"; // Movie modelini import qilish
import cors from "cors";

// .env faylini yuklash
config();

// MongoDB ulanishi
connect(process.env.DB)
  .then(() => {
    console.info("Database connection established");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

// Bot sozlamasi
const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);

// Bot komandalari
bot.start(handleStart);
replyToUser(bot);
actions(bot);
postSubmissionsForVoting(bot);

// Web App’dan ma’lumotlarni qabul qilish
bot.on("web_app_data", (ctx) => {
  const data = ctx.webAppData.data.json();
  ctx.reply(`Web App’dan ma’lumot: ${JSON.stringify(data)}`);
});

// Express server sozlamasi
const app = express();
app.use(express.json());
app.use(cors());

// Admin huquqlarini tekshirish middleware
const checkAdmin = (req, res, next) => {
  const initData = req.headers["telegram-init-data"];
  // Lokal muhitda telegram-init-data yo'q bo'lsa, ruxsat berish
  if (process.env.NODE_ENV === "development" && !initData && req.ip === "::1") {
    console.warn("Lokal muhitda admin tekshiruvi chetlab o'tildi.");
    return next();
  }
  if (!initData) {
    return res.status(401).json({ error: "Telegram initData topilmadi" });
  }
  try {
    const user = JSON.parse(initData)?.user;
    if (!user || user.id !== parseInt(process.env.ADMIN_ID)) {
      return res.status(403).json({ error: "Admin ruxsati yo‘q" });
    }
    next();
  } catch (err) {
    return res.status(400).json({ error: "Noto‘g‘ri initData formati" });
  }
};

// API endpoint’lari
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
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        caption: req.body.caption,
        movieUrl: req.body.movieUrl,
        keywords: req.body.keywords,
        fileType: req.body.fileType,
        teaser: req.body.teaser,
        size: req.body.size,
        duration: req.body.duration,
        views: req.body.views,
        accessedBy: req.body.accessedBy,
      },
      { new: true }
    );
    if (!movie) {
      return res.status(404).json({ error: "Film topilmadi" });
    }
    res.json(movie);
  } catch (err) {
    console.error("Filmni yangilashda xato:", err);
    res.status(500).json({ error: "Filmni yangilashda xatolik" });
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

// Health check route
app.get("/", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
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

// Cron job: Har 3 kunda film tavsiya qilish
cron.schedule("0 12 * * *", async () => {
  console.log("⏰ Checking if it's time to suggest movies...");

  try {
    let log = await SuggestionLog.findOne();

    const now = new Date();

    if (!log) {
      log = new SuggestionLog({ lastRun: now });
      await log.save();
      console.log("✅ First time setup. Log created.");
      return;
    }

    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const lastRunDate = new Date(log.lastRun);

    if (now - lastRunDate >= threeDays) {
      console.log("🎬 Running movie suggestion job...");

      const users = await User.find();
      if (!users.length) {
        console.log("No users to suggest movies to.");
        return;
      }
      for (const user of users) {
        try {
          await suggestMovie(bot, user.telegramId);
        } catch (err) {
          console.error(`❌ Error for ${user.telegramId}:`, err);
        }
      }

      log.lastRun = now;
      await log.save();
      console.log("✅ Suggestions sent and log updated.");
    } else {
      console.log("⏳ Less than 3 days since last run. Skipping...");
    }
  } catch (err) {
    console.error("❌ Cron job failed:", err);
  }
});

// Cron job: Har 7 minutda health check
cron.schedule("*/7 * * * *", async () => {
  try {
    if (!process.env.URL) {
      console.warn("⚠️ No URL set in .env file for health check");
      return;
    }
    const response = await axios.get(process.env.URL);
    console.log(
      `[${new Date().toLocaleString()}] Health Check:`,
      response.data
    );
  } catch (error) {
    console.error(
      `[${new Date().toLocaleString()}] Bot Health Check Failed!`,
      error.message
    );
  }
});

// Serverni ishga tushirish
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Botni polling rejimida ishga tushirish
bot.launch();
