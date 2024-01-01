import {Markup} from "telegraf";

export const startMessage = async (ctx) => {
    return ctx.reply(`Hello ${ctx.message.from.first_name}, welcome to our bot! Set your gander`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
                Markup.button.callback('Male', 'male'),
                Markup.button.callback('Female', 'female'),
                Markup.button.callback("Others", 'animal')
            ]
        )
    })
}

