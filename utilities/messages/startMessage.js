const startMessages = {
  subscribed: (firstName, isAdmin, botUsername) => ({
    text: `<b>👋 Welcome, ${firstName}!</b>

🛸 <b>Your Premium Cinema Archive</b>
I curate high-quality movies and series for the true enthusiast. No clutter, no distractions—just the content you love, delivered with speed and precision.

──────────────────
<b>🚀 HOW TO USE:</b>

🔍 <b>Search:</b> Just type the movie name or tap the button below.
🎞 <b>Explore:</b> Use /list to see our full library.
🎥 <b>Inline:</b> Type <code>@${botUsername}</code> in any chat to share movies!

<b>Enjoy your next favorite watch! 🍿</b>`,
    keyboard: [
      [{ text: "🔍 Start Searching", switch_inline_query_current_chat: "" }],
      [
        { text: "🔥 Trending Now", callback_data: "trending_list" },
        { text: "📜 Library List", callback_data: "page_1" }
      ],
      [
        {
          text: isAdmin ? "➕ Add New Content" : "💬 Contact Support",
          callback_data: isAdmin ? "add" : "feedback",
        },
      ],
      isAdmin ? [{ text: "👥 Manage Users", callback_data: "admin_user_list_0" }] : [],
      [
        {
          text: "🎬 Request a Movie",
          callback_data: "send_movie_request",
        },
      ],
    ],
  }),

  notSubscribed: (firstName, botUsername) => `
<b>👋 Hello ${firstName}!</b>

🛸 <b>Your Premium Cinema Archive</b>
I curate high-quality movies and series for the true enthusiast. No clutter, no distractions—just the content you love, delivered with speed and precision.

──────────────────
<b>🎥 BOT FEATURES:</b>

1️⃣ <b>Instant Search:</b> Find any movie or series in seconds.
2️⃣ <b>Quick Sharing:</b> Type <code>@${botUsername}</code> in any chat to share.
3️⃣ <b>Requests:</b> Can't find something? Let us know!

<b>Join us to unlock everything! 🎥🍿</b>
`,

  joinPrompt: (channelUsername) => `
<b>🔔 ACCESS RESTRICTED</b>

To get the latest updates and full access to our library, please join our channel:

👉 <b><a href="https://t.me/${channelUsername}">JOIN OUR CHANNEL</a></b>

<i>After joining, tap the button below to verify.</i>
`,
};

export default startMessages;
