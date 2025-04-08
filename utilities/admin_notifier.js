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
