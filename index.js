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

config();

connect(process.env.DB)
    .then(() => {
        console.info("Database connection established");
    })
    .catch((err) => {
        console.error("Database connection error:", err);
    });

const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);

bot.start(handleStart);

replyToUser(bot);

actions(bot);
postSubmissionsForVoting(bot);

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

const app = express();

// Health check route to keep bot alive
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

cron.schedule("*/4 * * * *", async () => {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Start bot polling (only needed if you're not using webhooks)
bot.launch();
