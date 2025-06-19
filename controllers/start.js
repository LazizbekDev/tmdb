import fetch from "node-fetch";
import User from "../model/User.js";
import startMessages from "../utilities/messages/startMessage.js";

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
    if (user.username) {
        return `https://t.me/${user.username}`;
    } else {
        return `tg://user?id=${user.id}`;
    }
};

export const startMessage = async (ctx) => {
  const userId = ctx.message.from.id;
  const isAdmin =
    ctx.message.from?.username?.toLowerCase() === process.env.ADMIN;
  const isMember = await checkUserMembership(userId);

  const firstName = ctx.message.from.first_name;
  const botUsername = process.env.BOT_USERNAME;
  const channelUsername = process.env.CHANNEL_USERNAME;

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

    return ctx.reply(messageData.text, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: messageData.keyboard },
    });
  } else {
    await ctx.replyWithHTML(
      startMessages.notSubscribed(firstName, botUsername)
    );

    return ctx.replyWithHTML(startMessages.joinPrompt(channelUsername), {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Check Membership", callback_data: "check_membership" }],
        ],
      },
    });
  }
};
