import Feedback from "../../model/Feedback.js";
import { createUserLink } from "../start.js";

export default async function toAdmin(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from?.username;
    const message = ctx.message.text;
    const link = await createUserLink(ctx.from);

    // Save feedback to the database
    const feedback = new Feedback({
        userId,
        username,
        message,
    });
    await feedback.save();

    // Notify the admin
    await ctx.telegram.sendMessage(
        process.env.ADMIN_ID,
        `New feedback from ${
            ctx.from.username
                ? "@" + ctx.from.username
                : "User ID: " + `<code>${ctx.from.id}</code>`
        } (${link}):\n\n${message}`,
        {
            parse_mode: "HTML",
        }
    );

    await ctx.reply(
        "Thank you for your feedback! We'll get back to you shortly."
    );
}
