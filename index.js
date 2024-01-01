import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { connect } from './db.js';
import {startMessage} from "./controllers/start.js";
import Actions from "./controllers/actions.js";
config();
connect(process.env.DB);

const token = process.env.BOT_TOKEN;
console.log(token)
const bot = new Telegraf(token);
bot.start((ctx) => {
    console.log(ctx.message.from);
    if (ctx.message.from?.username.toLowerCase() === process.env.ADMIN) {
        startMessage(ctx).then(r => r)
    } else {
        ctx.reply("slaom")
    }
})
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))
Actions(bot)
const PORT = process.env.PORT || 5000;

if(process.env.NODE_ENV === "PRODUCTION"){
    bot.launch({
        webhook:{
            domain: process.env.URL,// Your domain URL (where server code will be deployed)
            port: PORT
        }
    }).then(() => {
        console.info(`The bot ${bot.botInfo.username} is running on server`);
    });
} else { // if local use Long-polling
    bot.launch().then(() => {
        console.info(`The bot ${bot.botInfo.username} is running locally`);
    });
}
