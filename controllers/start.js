import { Markup } from "telegraf";
import fetch from "node-fetch";

export const checkUserMembership = async (userId) => {
    const response = await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMember?chat_id=${process.env.ID}&user_id=${userId}`
    );
    const data = await response.json();
    const status = data.result?.status;
    return (
        status === "member" ||
        status === "administrator" ||
        status === "creator"
    );
};

export const createUserLink = async (user) => {
    if (user.username) {
        return `https://t.me/${user.username}`;
    } else {
        return `tg://user?id=${user.id}`;
    }
}

export const startMessage = async (ctx) => {
    const userId = ctx.message.from.id;
    const isAdmin =
        ctx.message.from?.username?.toLowerCase() === process.env.ADMIN;
    const isMember = await checkUserMembership(userId);

    if (isMember) {
        return ctx.reply(
            `Hello ${ctx.message.from.first_name}, welcome to <b><a href='https://t.me/${process.env.CHANNEL_USERNAME}'>TMDB</a></b>'s official bot`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Search", switch_inline_query_current_chat: "" }],
                        [
                            {
                                text: isAdmin ? "Add new" : "Send feedback",
                                callback_data: isAdmin ? "add" : "feedback",
                            },
                        ],
                    ],
                },
            }
        );
    } else {
        return ctx.reply(
            `Hello ${ctx.message.from.first_name}, welcome to <b><a href='https://t.me/${process.env.CHANNEL_USERNAME}'>TMDB</a></b>'s official bot. You need to join our channel to use the bot.`,
            {
                parse_mode: "HTML",
                ...Markup.inlineKeyboard([
                    Markup.button.url(
                        "Join Channel",
                        `https://t.me/${process.env.CHANNEL_USERNAME}`
                    ),
                    Markup.button.callback(
                        "Check Membership",
                        "check_membership"
                    ),
                ]),
            }
        );
    }
};
