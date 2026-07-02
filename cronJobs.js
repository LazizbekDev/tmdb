import cron from "node-cron";
import SuggestionLog from "#model/suggestion_log.js";
import User from "#model/User.js";
import Movie from "#model/MovieModel.js";
import Series from "#model/SeriesModel.js";
import { suggestMovie } from "#controllers/suggestion.js";

export function setupCronJobs(bot) {
  // Har 3 kunda film tavsiya qilish
  cron.schedule("0 13 * * *", async () => {
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

      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const lastRunDate = new Date(log.lastRun);

      if (now - lastRunDate >= sevenDays) {
        console.log("🎬 Running movie suggestion job...");

        const users = await User.find({
          notificationsEnabled: { $ne: false },
          inActive: false,
        });
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
        console.log("⏳ Less than 1 week since last run. Skipping...");
      }
    } catch (err) {
      console.error("❌ Cron job failed:", err);
    }
  });

  // Watchlist Reminders (Every 3 days at 15:00)
  cron.schedule("0 15 */3 * *", async () => {
    console.log("⏰ Running watchlist reminder job...");
    try {
      const users = await User.find({
        savedMovies: { $exists: true, $not: { $size: 0 } },
        notificationsEnabled: { $ne: false },
        inActive: false,
      });

      for (const user of users) {
        try {
          const randomId = user.savedMovies[Math.floor(Math.random() * user.savedMovies.length)];
          const movie = await Movie.findById(randomId) || await Series.findById(randomId);

          if (movie) {
            await bot.telegram.sendMessage(
              user.telegramId,
              `🍿 <b>Don't forget your watchlist!</b>\n\nYou saved <b>${movie.name}</b> a while ago. Want to watch it now?\n\n🎬 <i>Tap the button below to start!</i>`,
              {
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "▶️ Watch Now", url: `https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}` }],
                    [{ text: "📜 See Full Watchlist", callback_data: "watch_list_1" }]
                  ]
                }
              }
            );
          }
          // Small delay to avoid hitting Telegram limits
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
          if (err.code === 403) {
             user.inActive = true;
             await user.save();
          }
        }
      }
      console.log("✅ Watchlist reminders sent.");
    } catch (err) {
      console.error("❌ Watchlist reminder job failed:", err);
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
