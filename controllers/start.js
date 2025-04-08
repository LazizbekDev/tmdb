import fetch from "node-fetch";
import User from "../model/User.js";

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

export const createUserLink = async (user) => {
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

    if (isMember) {
        await User.findOneAndUpdate(
            { telegramId: userId }, // Filter: Find the user by telegramId
            { $set: { isSubscribed: true } }, // Update: Set isSubscribed to true
            { new: true } // Options: Return the updated document
        );

        return ctx.reply(
            `<b>👋 Hey ${ctx.message.from.first_name},</b>
\n
<i>🔍 Just type the movie name, and I'll search it for you instantly!\n
Or, if you prefer, tap the search button below to start looking for movies.\n
🎥 Want a full list of films? Just hit /list to explore!</i>
\n
Enjoy your next favorite watch!🍿`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Search",
                                switch_inline_query_current_chat: "",
                            },
                        ],
                        [
                            {
                                text: isAdmin ? "Add new" : "Send feedback",
                                callback_data: isAdmin ? "add" : "feedback",
                            },
                        ],
                        [
                            {
                                text: "🎬 Send Movie Request",
                                callback_data: "send_movie_request",
                            },
                        ],
                    ],
                },
            }
        );
    } else {
        await ctx.replyWithHTML(
            `
👋 <b>Hello ${ctx.message.from.first_name}!</b>

Here's how you can use this bot:

1️⃣ Use the <b>Search</b> feature to find movies or series. 
   - Type <code>@${process.env.BOT_USERNAME}</code> and movie or series name in any chat, and results will appear instantly.

2️⃣ Share your favorites!
   - Search for a movie/series and send it to friends or groups directly using inline search.

3️⃣ Request Content:
   - Can't find something? Use the inline search feature to request a movie or series.

Enjoy unlimited entertainment for free! 🎥🍿
            `
        );

        // Optionally ask them to join the channel but delay this step
        return await ctx.replyWithHTML(
            `
🔔 To get the latest updates and full access, consider joining our channel:
👉 <a href="https://t.me/${process.env.CHANNEL_USERNAME}">Join Now</a>

After joining, click the "Check Membership" button to unlock full access.
            `,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Check Membership",
                                callback_data: "check_membership",
                            },
                        ],
                    ],
                },
            }
        );
    }
};
