import search from "#controllers/search.js";
import { handleActionButtons } from "#controllers/handlers/actionHandler.js";
import { handleTextInput } from "#controllers/handlers/textHandler.js";
import { handleVideoOrDocument } from "#controllers/handlers/mediaHandler.js";
import { handleCommands } from "#controllers/handlers/commandHandler.js";
import { handleCallbackQueries } from "#controllers/handlers/callbackQueryHandler.js";
import { handleChatMemberUpdates } from "#controllers/handlers/chatMemberHandler.js";
import { handleStart } from "#controllers/handlers/startHandler.js";
import replyToUser from "#controllers/feedback/replyToUser.js";

export default function setupActions(bot) {
  // Handle /start command
  bot.start((ctx) => handleStart(ctx));

  // Handle commands
  handleCommands(bot);

  // Handle reply and messages commands
  replyToUser(bot);

  // Handle inline queries
  bot.on("inline_query", search);

  // Handle action buttons
  handleActionButtons(bot);

  // Handle video and document messages
  bot.on(["video", "document"], (ctx) => {
    if (ctx.message.via_bot) {return;}
    handleVideoOrDocument(ctx);
  });

  // Handle text input
  bot.on("text", (ctx) => {
    if (ctx.message.via_bot) {return;}
    handleTextInput(ctx, bot);
  });

  // Handle callback queries
  handleCallbackQueries(bot);

  // Handle chat member updates
  bot.on("my_chat_member", handleChatMemberUpdates);
}