const startMessages = {
  subscribed: (firstName, isAdmin) => ({
    text: `<b>👋 Hey ${firstName},</b>

<i>🔍 Just type the movie name, and I'll search it for you instantly!
Or, if you prefer, tap the search button below to start looking for movies.
🎥 Want a full list of films? Just hit /list to explore!</i>

Enjoy your next favorite watch!🍿`,
    keyboard: [
      [{ text: "Search", switch_inline_query_current_chat: "" }],
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
  }),

  notSubscribed: (firstName, botUsername) => `
👋 <b>Hello ${firstName}!</b>

Here's how you can use this bot:

1️⃣ Use the <b>Search</b> feature to find movies or series. 
   - Type <code>@${botUsername}</code> and movie or series name in any chat, and results will appear instantly.

2️⃣ Share your favorites!
   - Search for a movie/series and send it to friends or groups directly using inline search.

3️⃣ Request Content:
   - Can't find something? Use the inline search feature to request a movie or series.

Enjoy unlimited entertainment for free! 🎥🍿
`,

  joinPrompt: (channelUsername) => `
🔔 To get the latest updates and full access, consider joining our channel:
👉 <a href="https://t.me/${channelUsername}">Join Now</a>

After joining, click the "Check Membership" button to unlock full access.
`,
};

export default startMessages;
