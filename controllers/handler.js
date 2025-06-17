import { handleActionButtons } from "./handlers/actionHandler.js";
import { handleVideoOrDocument } from "./handlers/mediaHandler.js";
import { handleStart } from "./handlers/startHandler.js";
import { handleTextInput } from "./handlers/textHandler.js";

export default function setupHandlers(bot, userState) {
  // Handle /start command
  bot.start((ctx) => handleStart(ctx, userState));

  // Handle action buttons
  handleActionButtons(bot, userState);

  // Handle text input
  bot.on("text", (ctx) => handleTextInput(ctx, userState, bot));

  // Handle video or document
  bot.on(["video", "document"], (ctx) => handleVideoOrDocument(ctx, userState));
}