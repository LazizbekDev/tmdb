import search from "./search.js";
import { handleActionButtons } from "./handlers/actionHandler.js";
import { handleTextInput } from "./handlers/textHandler.js";
import { handleVideoOrDocument } from "./handlers/mediaHandler.js";
import { handleCommands } from "./handlers/commandHandler.js";
import { handleCallbackQueries } from "./handlers/callbackQueryHandler.js";
import { handleChatMemberUpdates } from "./handlers/chatMemberHandler.js";
import { handleStart } from "./handlers/startHandler.js";

export default function setupActions(bot) {
    // Handle /start command
  bot.start((ctx) => handleStart(ctx));

  // Handle commands
  handleCommands(bot);

  // Handle inline queries
  bot.on("inline_query", search);

  // Handle action buttons
  handleActionButtons(bot);
  
  // Handle video and document messages
  bot.on(["video", "document"], (ctx) => {
    if (ctx.message.via_bot) return;
    handleVideoOrDocument(ctx);
  });

  // Handle text input
  bot.on("text", (ctx) => {
    if (ctx.message.via_bot) return;
    handleTextInput(ctx, bot);
  });

  // Handle callback queries
  handleCallbackQueries(bot);

  // Handle chat member updates
  bot.on("my_chat_member", handleChatMemberUpdates);
}