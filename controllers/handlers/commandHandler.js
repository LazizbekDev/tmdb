import mongoose from "mongoose";
import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { suggestMovie } from "../suggestion.js";
import { generateHeader } from "../list/formatList.js";
import User from "../../model/User.js";
import { handlePagination } from "../../utilities/utilities.js";

export function handleCommands(bot) {
  bot.command("list", async (ctx) => {
    try {
      const page = parseInt(ctx.match?.[1] || 1);
      await handlePagination(ctx, bot, page, Movie, Series, 10, {}, "page_", generateHeader);
    } catch (error) {
      console.error("Error in /list command:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "List command error");
    }
  });

  bot.command("watchlist", async (ctx) => {
    try {
      const userId = ctx.from.id.toString();
      const user = await User.findOne({ telegramId: userId });

      if (!user || !user.savedMovies || user.savedMovies.length === 0) {
        return ctx.reply("Sizda hech qanday saqlangan filmlar yoki seriallar yo‘q.");
      }

      const page = parseInt(ctx.match?.[1] || 1);
      const query = { _id: { $in: user.savedMovies } };
      await handlePagination(ctx, bot, page, Movie, Series, 10, query, "watch_list_", generateHeader);
    } catch (error) {
      console.error("Error in /watch_list command:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Watch List command error");
    }
  });

  bot.command("show", async (ctx) => {
    try {
      if (ctx.from.id !== parseInt(process.env.ADMIN_ID)) {
        return ctx.reply("Sizda bu amalni bajarish uchun ruxsat yo‘q.");
      }

      const args = ctx.message.text.split(" ").slice(1);
      if (args.length < 1) {
        return ctx.reply("Iltimos, foydalanuvchi ID’sini kiriting. Masalan: /show 1622899126");
      }

      const userId = parseInt(args[0]);
      if (isNaN(userId)) {
        return ctx.reply("Foydalanuvchi ID’si raqam bo‘lishi kerak.");
      }

      const page = parseInt(args[1] || 1);
      const query = { accessedBy: userId.toString() };
      const showHeader = (moviesCount, seriesCount) =>
        `<b>Foydalanuvchi (ID: ${userId}) ko‘rgan kontent</b>\nFilmlar: ${moviesCount} | Seriallar: ${seriesCount}\n\n`;

      await handlePagination(ctx, bot, page, Movie, Series, 10, query, `show_${userId}_`, showHeader);
    } catch (error) {
      console.error("Error in /show command:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Show command error");
    }
  });

  bot.command("stat", async (ctx) => {
    try {
      if (ctx.from.id !== parseInt(process.env.ADMIN_ID)) {
        return ctx.reply("Sizda bu amalni bajarish uchun ruxsat yo‘q.");
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const objectId = mongoose.Types.ObjectId.createFromTime(Math.floor(sevenDaysAgo.getTime() / 1000));
      const query = { _id: { $gte: objectId } };

      const [newUsers, newMovies, newSeries, totalUsers, totalMovies, totalSeries] = await Promise.all([
        User.countDocuments(query),
        Movie.countDocuments(query),
        Series.countDocuments(query),
        User.countDocuments(),
        Movie.countDocuments(),
        Series.countDocuments(),
      ]);

      const message = `
📊 <b>Haftalik Statistika (Oxirgi 7 kun)</b>

👤 <b>Yangi foydalanuvchilar:</b> +${newUsers}
🎞 <b>Yangi filmlar:</b> +${newMovies}
📺 <b>Yangi seriallar:</b> +${newSeries}

=================
📈 <b>Umumiy ko'rsatkichlar:</b>
Jami foydalanuvchilar: ${totalUsers}
Jami filmlar: ${totalMovies}
Jami seriallar: ${totalSeries}
`;
      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Error in /stat command:", error);
      await ctx.reply("An error occurred while fetching stats.");
      await adminNotifier(bot, error, ctx, "Stat command error");
    }
  });

  bot.command("suggest", async (ctx) => {
    try {
      await suggestMovie(bot, ctx.from.id);
    } catch (error) {
      console.error("Error in /suggest command:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Suggest command error");
    }
  });

  bot.command("admin", (ctx) => {
    if (ctx.from.id === parseInt(process.env.ADMIN_ID)) {
      ctx.reply("Admin panel", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Admin panelni ochish", web_app: { url: "https://tmdbase.netlify.app/admin/" } }],
          ],
        },
      });
    } else {
      ctx.reply("Sizda admin ruxsati yo‘q");
    }
  });
}