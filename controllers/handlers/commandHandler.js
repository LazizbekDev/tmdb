import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { suggestMovie } from "../suggestion.js";
import formatList, { generateHeader, generatePaginationButtons } from "../list/formatList.js";
import { connect } from "../../db.js";
import User from "../../model/User.js";

export function handleCommands(bot) {
  // Verify database connection
  async function ensureDbConnection() {
    try {
      await connect(process.env.DB);
      console.log("Database connection verified for command");
    } catch (error) {
      console.error("Database connection error:", error);
      throw new Error("Failed to connect to database");
    }
  }

  bot.command("list", async (ctx) => {
    try {
      await ensureDbConnection();
      const page = parseInt(ctx.match?.[1] || 1);
      const limit = 10;

      const [movies, series, moviesCount, seriesCount] = await Promise.all([
        Movie.find({}).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit),
        Series.find({}).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit),
        Movie.countDocuments({}),
        Series.countDocuments({}),
      ]);

      if (moviesCount === 0 && seriesCount === 0) {
        return ctx.reply(
          "No movies or series found in the database. Please add content or contact the admin.",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "Contact Admin", callback_data: "feedback" }]],
            },
          }
        );
      }

      const totalPages = Math.ceil(Math.max(moviesCount, seriesCount) / limit);
      const header = page === 1 ? generateHeader(moviesCount, seriesCount) : "";
      const content = header + formatList(movies, series, page, limit);
      const paginationButtons = generatePaginationButtons(page, totalPages);

      await ctx.reply(content || "No content available for this page.", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: paginationButtons },
      });
    } catch (error) {
      console.error("Error in /list command:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "List command error");
    }
  });

  bot.command("watchlist", async (ctx) => {
    try {
      await ensureDbConnection();

      const userId = ctx.from.id.toString();
      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        return ctx.reply("Sizda hech qanday saqlangan filmlar yoki seriallar yo‘q.");
      }
      const savedMovies = user.savedMovies || [];
      if (savedMovies.length === 0) { 
        return ctx.reply("Sizda hech qanday saqlangan filmlar yoki seriallar yo‘q.");
      }
      const limit = 10;
      const page = parseInt(ctx.match?.[1] || 1);
      const skip = (page - 1) * limit;
      const movies = await Movie.find({ _id: { $in: savedMovies } })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit);
      const series = await Series.find({ _id: { $in: savedMovies } })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit);
      const moviesCount = await Movie.countDocuments({ _id: { $in: savedMovies } });
      const seriesCount = await Series.countDocuments({ _id: { $in: savedMovies } });
      if (moviesCount === 0 && seriesCount === 0) {
        return ctx.reply("Sizda hech qanday saqlangan filmlar yoki seriallar yo‘q.");
      }
      const totalPages = Math.ceil(Math.max(moviesCount, seriesCount) / limit);
      const header = page === 1 ? generateHeader(moviesCount, seriesCount) : "";
      const content = header + formatList(movies, series, page, limit);
      const paginationButtons = generatePaginationButtons(page, totalPages, "watch_list_");
      await ctx.reply(content || "No content available for this page.", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: paginationButtons },
      });
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

      await ensureDbConnection();

      // Parse user_id and page from command (e.g., /show 1622899126 2)
      const args = ctx.message.text.split(" ").slice(1); // Skip /show
      if (args.length < 1) {
        return ctx.reply("Iltimos, foydalanuvchi ID’sini kiriting. Masalan: /show 1622899126");
      }

      const userId = parseInt(args[0]);
      if (isNaN(userId)) {
        return ctx.reply("Foydalanuvchi ID’si raqam bo‘lishi kerak.");
      }

      const page = parseInt(args[1] || 1);
      const limit = 10;

      // Query movies and series where accessedBy includes userId
      const [movies, series, moviesCount, seriesCount] = await Promise.all([
        Movie.find({ accessedBy: userId.toString() })
          .sort({ _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Series.find({ accessedBy: userId.toString() })
          .sort({ _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Movie.countDocuments({ accessedBy: userId.toString() }),
        Series.countDocuments({ accessedBy: userId.toString() }),
      ]);

      // Log for debugging
      console.log(`User ID: ${userId}, Page: ${page}, Movies: ${movies.length}, Series: ${series.length}`);

      if (moviesCount === 0 && seriesCount === 0) {
        return ctx.reply(`Foydalanuvchi (ID: ${userId}) hech qanday film yoki serial ko‘rmagan.`);
      }

      const totalPages = Math.ceil(Math.max(moviesCount, seriesCount) / limit);
      const header =
        page === 1
          ? `<b>Foydalanuvchi (ID: ${userId}) ko‘rgan kontent</b>\n` +
            `Filmlar: ${moviesCount} | Seriallar: ${seriesCount}\n\n`
          : "";
      const content = header + formatList(movies, series, page, limit);
      const paginationButtons = generatePaginationButtons(page, totalPages, `show_${userId}_`);

      await ctx.reply(content || "No content available for this page.", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: paginationButtons },
      });
    } catch (error) {
      console.error("Error in /show command:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "Show command error");
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
            [
              {
                text: "Admin panelni ochish",
                web_app: { url: "https://tmdbase.netlify.app/admin/" },
              },
            ],
          ],
        },
      });
    } else {
      ctx.reply("Sizda admin ruxsati yo‘q");
    }
  });
}