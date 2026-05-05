import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { connect } from "#db.js";
import { setupBot } from "#bot.js";
import setupRoutes from "#routes/movies.js";
import { setupCronJobs } from "#cronJobs.js";

config();

const app = express();
app.use(express.json());
app.use(cors());

setupRoutes(app); // Route-larni server ishlashidan oldin chaqirish kerak

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🌐 SERVER ON: http://localhost:${PORT}`);

  try {
    await connect(process.env.DB);
    console.log("✅ MongoDB connected");

    const bot = await setupBot();
    setupCronJobs(bot);
    await bot.launch();
    console.log("🚀 Bot launched");
  } catch (err) {
    console.error("❌ Server initialization error:", err);
    process.exit(1);
  }
});
