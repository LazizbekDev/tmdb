import {Markup} from "telegraf";

export const startMessage = async (ctx) => {
    const isAdmin = ctx.message.from?.username.toLowerCase() === process.env.ADMIN;
    return ctx.reply(`Hello ${ctx.message.from.first_name}, welcome to <b>I MOVIE ARCHIVE's official bot</b>`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
                Markup.button.callback('Movie', 'movie'),
                Markup.button.callback('Series', 'series'),
                Markup.button.callback(isAdmin ? "Add new" : "Send feedback", isAdmin ? "add" : "feedback")
            ]
        )
    })
}

