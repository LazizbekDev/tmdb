import { Telegraf } from "telegraf";
import setupHandlers from "./controllers/handler.js";
import setupActions from "./controllers/actions.js";
import applySession from "./utilities/session.js";

export async function setupBot() {
  const token = process.env.BOT_TOKEN;
  const bot = new Telegraf(token);

  // 💾 Session middlewareni ulash
  await applySession(bot); // session birinchi bo‘lishi kerak!

  // ⚙️ Harakatlar
  setupActions(bot);

  // 📥 Xabarlar
  setupHandlers(bot);

  // 🌐 WebApp data
  bot.on("web_app_data", (ctx) => {
    const data = JSON.parse(ctx.webAppData.data);
    ctx.reply(`Web App’dan ma’lumot: ${JSON.stringify(data)}`);
  });

  return bot;
}
