import search from "./search.js";
import { handleActionButtons } from "./handlers/actionHandler.js";
import { handleTextInput } from "./handlers/textHandler.js";
import { handleVideoOrDocument } from "./handlers/mediaHandler.js";
import { handleCommands } from "./handlers/commandHandler.js";
import { handleCallbackQueries } from "./handlers/callbackQueryHandler.js";
import { handleChatMemberUpdates } from "./handlers/chatMemberHandler.js";
import { handleStart } from "./handlers/startHandler.js";

export default function setupActions(bot, userState) {
    // Handle /start command
  bot.start((ctx) => handleStart(ctx, userState));

  // Handle commands
  handleCommands(bot);

  // Handle inline queries
  bot.on("inline_query", search);

  // Handle action buttons
  handleActionButtons(bot, userState);

  // Handle text input
  bot.on("text", (ctx) => {
    if (ctx.message.via_bot) return;
    handleTextInput(ctx, userState, bot);
  });

  // Handle video and document messages
  bot.on(["video", "document"], (ctx) => {
    if (ctx.message.via_bot) return;
    handleVideoOrDocument(ctx, userState);
  });

  // Handle callback queries
  handleCallbackQueries(bot);

  // Handle chat member updates
  bot.on("my_chat_member", handleChatMemberUpdates);
}