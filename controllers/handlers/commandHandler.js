import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import formatList, { generateHeader, generatePaginationButtons } from "../list/formatList.js";
import { suggestMovie } from "../suggestion.js";

export function handleCommands(bot) {
  bot.command("list", async (ctx) => {
    try {
      const page = parseInt(ctx.match?.[1] || 1);
      const limit = 10;

      const [movies, series, moviesCount, seriesCount] = await Promise.all([
        Movie.find({}).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit),
        Series.find({}).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit),
        Movie.countDocuments({}),
        Series.countDocuments({}),
      ]);

      const totalPages = Math.ceil(Math.max(moviesCount, seriesCount) / limit);
      const header = page === 1 ? generateHeader(moviesCount, seriesCount) : "";
      const content = header + formatList(movies, series, page, limit);
      const paginationButtons = generatePaginationButtons(page, totalPages);

      await ctx.reply(content, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: paginationButtons },
      });
    } catch (error) {
      console.error("Error in /list command:", error);
      await ctx.reply("An error occurred while processing your request.");
      await adminNotifier(bot, error, ctx, "List command error");
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
      ctx.reply("Sizda admin ruxsati yo‘q/");
    }
  });
}