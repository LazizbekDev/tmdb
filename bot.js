import { Telegraf } from "telegraf";
import setupHandlers from "./controllers/handler.js";
import setupActions from "./controllers/actions.js";

export function setupBot() {
  const token = process.env.BOT_TOKEN;
  const bot = new Telegraf(token);

  // Initialize user state
  const userState = {};

  // Setup actions
  setupActions(bot, userState);

  // Setup handlers
  setupHandlers(bot, userState);
  // Web App data handling
  bot.on("web_app_data", (ctx) => {
    const data = ctx.webAppData.data.json();
    ctx.reply(`Web App’dan ma’lumot: ${JSON.stringify(data)}`);
  });

  return bot;
}
