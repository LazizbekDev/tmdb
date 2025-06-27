import cron from "node-cron";
import SuggestionLog from "./model/suggestion_log.js";
import User from "./model/User.js";
import { suggestMovie } from "./controllers/suggestion.js";

export function setupCronJobs(bot) {
  // Har 3 kunda film tavsiya qilish
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

  // Har 7 minutda health check
  // cron.schedule("*/7 * * * *", async () => {
  //   try {
  //     if (!process.env.URL) {
  //       console.warn("⚠️ No URL set in .env file for health check");
  //       return;
  //     }
  //     const response = await axios.get(process.env.URL);
  //     console.log(
  //       `[${new Date().toLocaleString()}] Health Check:`,
  //       response.data
  //     );
  //   } catch (error) {
  //     console.error(
  //       `[${new Date().toLocaleString()}] Bot Health Check Failed!`,
  //       error.message
  //     );
  //   }
  // });
}
