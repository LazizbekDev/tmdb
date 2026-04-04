export const adminNotifier = async (bot, error, ctx, location = "Unknown") => {
    const adminId = process.env.ADMIN_ID;
    const user = ctx?.from;
    const userInfo = user ? `👤 <b>${user.first_name}</b> (ID: <code>${user.id}</code>)` : "👤 Unknown user";

    const message = `
🚨 <b>Error in ${location}</b>
${userInfo}

🧱 <b>Error:</b>
<code>${(error.message || error).toString().slice(0, 500)}</code>

🪵 <b>Stack:</b>
<code>${(error.stack || "No stack").toString().slice(0, 1000)}</code>
`.trim();

    try {
        await bot.telegram.sendMessage(adminId, message, { parse_mode: "HTML" });
    } catch (adminNotifyErr) {
        console.error("❌ Failed to notify admin:", adminNotifyErr);
    }
};

export const notifyAdminContentAccessed = async (ctx, user, content, type) => {
    try {
        const usernameDisplay = user.username ? `@${user.username}` : "No username";
        const contentLabel = type === "Movie" ? "Movie" : "Show";
        const urlPrefix = `https://t.me/${process.env.BOT_USERNAME}?start=${content._id}`;
        
        const message = `
🔔 <b>${contentLabel} Accessed</b>
▪️ <b>${contentLabel}:</b> <a href='${urlPrefix}'>${content.name}</a>
▪️ <b>Access Count:</b> ${content.accessedBy.length}
▪️ <b>User:</b> ${user.first_name} (${usernameDisplay})
▪️ <b>User ID:</b> <code>${user.id}</code>
        `.trim();

        await ctx.telegram.sendMessage(process.env.ADMIN_ID, message, { parse_mode: "HTML" });
    } catch (error) {
        console.error("❌ Failed to notify admin about content logic:", error);
    }
};
