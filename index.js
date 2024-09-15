import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { connect } from './db.js';
import actions from './controllers/actions.js';
import replyToUser from './controllers/feedback/replyToUser.js';
import { handleStart } from './controllers/handler.js';
import { postSubmissionsForVoting } from './utilities/vote.js';

// Load environment variables
config();

// Connect to the database
connect(process.env.DB).then(() => {
    console.info('Database connection established');
}).catch((err) => {
    console.error('Database connection error:', err);
});

const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);

// Use the handleStart function for the /start command
bot.start(handleStart);

// Feedback handling
replyToUser(bot);

// Load other bot actions
actions(bot);

postSubmissionsForVoting(bot);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'PRODUCTION') {
    bot.launch({
        webhook: {
            domain: process.env.URL,
            port: PORT
        }
    }).then(() => {
        console.info(`The bot ${bot.botInfo.username} is running on the server`);
    });
} else {
    bot.launch().then(() => {
        console.info(`The bot ${bot.botInfo.username} is running locally`);
    });
}
