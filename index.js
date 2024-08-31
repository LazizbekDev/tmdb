import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { connect } from './db.js';
import {startMessage} from "./controllers/start.js";
import Actions from "./controllers/actions.js";
config();
connect(process.env.DB).then(r => r);

const token = process.env.BOT_TOKEN;
// console.log(token)
const bot = new Telegraf(token);
bot.start((ctx) => {
    startMessage(ctx).then(r => r)
})

bot.command('add', async (ctx) => {
    console.log(ctx)
    await ctx.telegram.sendMessage(process.env.ID, "This is a predefined message for the 'add' action.");
})

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
