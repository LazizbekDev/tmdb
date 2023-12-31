import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { connect } from './db.js';
config();
connect(process.env.DB);

const token = process.env.BOT_TOKEN;
console.log(token)
const bot = new Telegraf(token);
bot.start((ctx) => {
    console.log(ctx.message.from);
    if (ctx.message.from?.username.toLowerCase() === process.env.ADMIN) {
        ctx.reply("Hush kelibsiz admin!")
    } else {
        ctx.reply("slaom")
    }
})
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))
bot.launch()