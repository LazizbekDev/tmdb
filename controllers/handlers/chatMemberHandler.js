import User from "../../model/User.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";

export async function handleChatMemberUpdates(ctx) {
  try {
    const status = ctx.update.my_chat_member.new_chat_member.status;
    const userId = ctx.update.my_chat_member.from.id;

    if (status === "kicked" || status === "left") {
      await User.findOneAndUpdate(
        { telegramId: userId },
        { $set: { leftTheBot: true } }
      );
      console.log(`User ${userId} has blocked or deleted the bot.`);
    }
  } catch (error) {
    console.error("Error in my_chat_member handler:", error);
    await ctx.reply("An error occurred while processing your request.");
    await adminNotifier(ctx.telegram, error, ctx, "my_chat_member error");
  }
}