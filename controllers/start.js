import { Markup } from "telegraf";
import fetch from 'node-fetch';

export const checkUserMembership = async (userId) => {
    const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMember?chat_id=${process.env.ID}&user_id=${userId}`);
    const data = await response.json();
    const status = data.result?.status;
    return status === 'member' || status === 'administrator' || status === 'creator';
};

export const startMessage = async (ctx) => {
    const userId = ctx.message.from.id;
    const isAdmin = ctx.message.from?.username?.toLowerCase() === process.env.ADMIN;
    const isMember = await checkUserMembership(userId);

    if (isMember) {
        return ctx.reply(`Hello ${ctx.message.from.first_name}, welcome to <b>TMDB</b>'s official bot. You're verified user!`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                Markup.button.callback('Movie', 'movie'),
                Markup.button.callback('Series', 'series'),
                Markup.button.callback(isAdmin ? "Add new" : "Send feedback", isAdmin ? "add" : "feedback")
            ])
        });
    } else {
        return ctx.reply(`Hello ${ctx.message.from.first_name}, welcome to <b>TMDB</b>'s official bot. You need to join our channel to use the bot.`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                Markup.button.url('Join Channel', `https://t.me/${process.env.CHANNEL_USERNAME}`),
                Markup.button.callback('Check Membership', 'check_membership')
            ])
        });
    }
};
