import User from "#model/User.js";

export async function handleUserList(ctx, bot, page = 0) {
    const limit = 10;
    const skip = page * limit;

    const totalUsers = await User.countDocuments();
    const users = await User.find().skip(skip).limit(limit).sort({ lastAccessed: -1 });

    let message = `👥 <b>Users List (Total: ${totalUsers})</b>\n\n`;
    const keyboard = [];

    for (const user of users) {
        let name = user.firstName;
        let username = user.username;

        // If name is missing, try fetching from Telegram and update DB
        if (!name) {
            try {
                const chat = await bot.telegram.getChat(user.telegramId);
                name = chat.first_name || "User";
                username = chat.username || "";
                
                // Update DB so we don't have to fetch next time
                await User.updateOne(
                    { telegramId: user.telegramId },
                    { $set: { firstName: name, username: username } }
                );
            } catch (err) {
                name = "User";
                console.error(`Could not fetch info for ${user.telegramId}:`, err.message);
            }
        }

        const usernameDisplay = username ? ` (@${username})` : "";
        message += `👤 <a href='tg://user?id=${user.telegramId}'>${name}</a>${usernameDisplay}\n`;
        keyboard.push([{ text: `💬 Chat with ${name}`, callback_data: `chat_with_${user.telegramId}` }]);
    }

    const navButtons = [];
    if (page > 0) {
        navButtons.push({ text: "⬅️ Previous", callback_data: `admin_user_list_${page - 1}` });
    }
    if (skip + limit < totalUsers) {
        navButtons.push({ text: "Next ➡️", callback_data: `admin_user_list_${page + 1}` });
    }
    if (navButtons.length > 0) {
        keyboard.push(navButtons);
    }

    keyboard.push([{ text: "❌ Close", callback_data: "close_user_list" }]);

    if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        await ctx.reply(message, {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: keyboard }
        });
    }
}
