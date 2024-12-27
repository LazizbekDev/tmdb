import Feedback from "../../model/Feedback.js";
import User from "../../model/User.js";

export default async function replyToUser(bot) {
    bot.command("reply", async (ctx) => {
        const isAdmin =
            ctx.message.from?.username?.toLowerCase() === process.env.ADMIN;
        if (!isAdmin) {
            return ctx.reply("Sorry, this feature only for admin");
        }

        const [userId, ...response] = ctx.message.text.split(" ").slice(1);
        const replyMessage = response.join(" ");
        const isMemberOfTheBot = await User.findOne({telegramId: userId});

        if (!userId || !replyMessage) {
            return ctx.reply(
                "Please use the correct format: /reply <user_id> <message>"
            );
        }

        // Send the reply to the user
        if (isMemberOfTheBot.leftTheBot) {
            await ctx.reply("Sorry, this user blocked the bot!");
            return;
        }

        await ctx.telegram.sendMessage(
            userId,
            `Admin's reply: ${replyMessage}`
        );

        // Update the feedback as replied
        await Feedback.findOneAndUpdate(
            { userId, replied: false },
            { replied: true }
        );

        return await ctx.reply("Your reply has been sent.");
    });

    bot.command("messages", async (ctx) => {
        const isAdmin =
            ctx.message.from?.username?.toLowerCase() === process.env.ADMIN;

        if (!isAdmin) {
            return ctx.reply("Sorry, this feature only for admin");
        }

        const unseenMessages = await Feedback.find({
            $or: [{ replied: false }],
        });

        unseenMessages.map((unseen) => {
            ctx.reply(
                `👤from ${
                    unseen.username
                        ? "@" + unseen.username
                        : "User ID: " + `<code>${unseen.userId}</code>`
                }\n\n📝<i>${unseen.message}</i>\n\nℹ️ to reply: <code>/reply ${
                    unseen.userId
                } Thanks for your feedback ☺️</code>`,
                {
                    parse_mode: "HTML",
                }
            );
        });
    });
}
