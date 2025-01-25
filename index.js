import express from 'express';
import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { connect } from './db.js';
import actions from './controllers/actions.js';
import replyToUser from './controllers/feedback/replyToUser.js';
import { handleStart } from './controllers/handler.js';
import { postSubmissionsForVoting } from './utilities/vote.js';
import User from './model/User.js';
import { suggestMovie } from './controllers/suggestion.js';
import cron from "node-cron";

config();

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

cron.schedule("0 12 * * 0", async () => {
  console.log("Running weekly movie suggestion job...");

  try {
      const users = await User.find(); // Get all registered users
      for (const user of users) {
          try {
              await suggestMovie(bot, user.telegramId); // Suggest a movie to the user
          } catch (err) {
              console.error(
                  `Error suggesting movie to user ${user.telegramId}:`,
                  err
              );
          }
      }
  } catch (error) {
      console.error("Error running weekly suggestion job:", error);
  }
});

const app = express();

// Health check route to keep bot alive
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start bot polling (only needed if you're not using webhooks)
bot.launch();
