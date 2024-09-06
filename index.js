import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { connect } from './db.js';
import {startMessage, checkUserMembership} from "./controllers/start.js";
import Actions from "./controllers/actions.js";
import Movie from './model/MovieModel.js';
import replyToUser from './controllers/feedback/replyToUser.js';
import caption from './utilities/caption.js';

config();
connect(process.env.DB).then(r => r);

const token = process.env.BOT_TOKEN;

const bot = new Telegraf(token);
bot.start(async (ctx) => {
    const userId = ctx.message.from.id;
    const isMember = await checkUserMembership(userId);
    const payload = ctx.startPayload;

    if (!isMember) {
        return startMessage(ctx);
    }

    if (payload) {
        try {
            const movie = await Movie.findById(payload);
            if (movie) {
                return ctx.replyWithVideo(movie.movieUrl, {
                    caption: caption(movie, movie._id),
                    parse_mode: "HTML"
                });
            } else {
                return ctx.reply('Sorry, the movie you are looking for does not exist.');
            }
        } catch (error) {
            console.error("Error fetching movie:", error);
            return ctx.reply('There was an error processing your request.');
        }
    } else {
        return startMessage(ctx);
    }
});

replyToUser(bot);
Actions(bot)

const sendPingToAdmin = async () => {
    try {
        const adminId = process.env.ADMIN_ID; // Use admin's user ID here
        await bot.telegram.sendMessage(adminId, 'To keep bot alive send /start command');
        console.log('Ping sent to admin');
    } catch (error) {
        console.error('Error sending ping to admin:', error);
    }
};

// Set an interval to send the message every 10 minutes (600000 milliseconds)
setInterval(sendPingToAdmin, 600000)

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
