import Feedback from "#model/Feedback.js";

export default async function toAdmin(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from?.username;
    const message = ctx.message.text;

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
        `👤from ${
            ctx.from.username
                ? "@" + ctx.from.username
                : "User ID: " + `<code>${ctx.from.id}</code>`
        }\n\n📝<i>${message}</i>\n\nℹ️ to reply: <code>/reply ${
            ctx.from.id
        } Thanks for your feedback ☺️</code>`,
        {
            parse_mode: "HTML",
        }
    );

    await ctx.reply(
        "Thank you for your feedback! We'll get back to you shortly."
    );    
}
