import express from "express";
import { config } from "dotenv";
import { connect } from "./db.js";
import { setupBot } from "./bot.js";
import setupRoutes from "./routes/movies.js";
import { setupCronJobs } from "./cronJobs.js";
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

// Express server sozlamasi
const app = express();
app.use(express.json());
app.use(cors());

// Botni sozlash
const bot = setupBot();

// API route'larni sozlash
setupRoutes(app);

// Cron job'larni sozlash
setupCronJobs(bot);

// Serverni ishga tushirish
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Botni polling rejimida ishga tushirish
bot.launch();
