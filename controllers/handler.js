import { handleActionButtons } from "./handlers/actionHandler.js";
import { handleVideoOrDocument } from "./handlers/mediaHandler.js";
import { handleTextInput } from "./handlers/textHandler.js";

export default function setupHandlers(bot, userState) {
  // Handle action buttons
  handleActionButtons(bot, userState);

  // Handle text input
  bot.on("text", (ctx) => handleTextInput(ctx, userState, bot));

  // Handle video or document
  bot.on(["video", "document"], (ctx) => handleVideoOrDocument(ctx, userState));
}