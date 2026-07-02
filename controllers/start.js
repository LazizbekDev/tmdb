import fetch from "node-fetch";
import User from "#model/User.js";
import startMessages from "#utilities/messages/startMessage.js";

export const checkUserMembership = async (userId) => {
    const response = await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMember?chat_id=${process.env.ID}&user_id=${userId}`
    );
    const data = await response.json();

    // Handle cases where the user might not exist or isn't in the chat
    if (!data.result || !data.result.status) {
        return false;
    }

    const status = data.result.status;
    return (
        status === "member" ||
        status === "administrator" ||
        status === "creator"
    );
};

export const createUserLink = (user) => {
    return `tg://user?id=${user.id}`;
};

export const startMessage = async (ctx) => {
  const from = ctx.from || ctx.message?.from || ctx.callbackQuery?.from;
  if (!from) {
    throw new Error("No sender data available for start message");
  }

  const userId = from.id;
  const isAdmin =
    from?.username?.toLowerCase() === process.env.ADMIN?.toLowerCase() ||
    userId === parseInt(process.env.ADMIN_ID);
  const isMember = await checkUserMembership(userId);

  const firstName = from.first_name || from.firstName || "there";
  const botUsername = process.env.BOT_USERNAME;
  const channelUsername = process.env.CHANNEL_USERNAME;

  const sendReply = async (text, options = {}) => {
    if (typeof ctx.reply === "function") {
      return ctx.reply(text, options);
    }

    const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
    if (chatId && typeof ctx.telegram?.sendMessage === "function") {
      return ctx.telegram.sendMessage(chatId, text, options);
    }

    throw new Error("No reply method available for start message");
  };

  if (isMember) {
    await User.findOneAndUpdate(
      { telegramId: userId },
      { $set: { isSubscribed: true } },
      { new: true }
    );

    const messageData = startMessages.subscribed(
      firstName,
      isAdmin,
      botUsername
    );

    return sendReply(messageData.text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: messageData.keyboard },
    });
  }

  await sendReply(startMessages.notSubscribed(firstName, botUsername), {
    parse_mode: "HTML",
  });

  return sendReply(startMessages.joinPrompt(channelUsername), {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Check Membership", callback_data: "check_membership" }],
      ],
    },
  });
};
