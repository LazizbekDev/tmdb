export default function Actions (bot) {
    bot.action('movie`', async (ctx) => {
        await ctx.answerCbQuery("ohh you're man!");
    });

    bot.action('female', async (ctx) => {
        await ctx.answerCbQuery("Welcome Lady!");
    });

    bot.action('animal', async (ctx) => {
        await ctx.answerCbQuery("Are you an animal??");
    });
    bot.action('add', async (ctx) => {
        // Send a predefined message to the channel
        await ctx.reply("Now send movie")
        await ctx.answerCbQuery("excellent")


        // await ctx.telegram.sendMessage(process.env.ID, "This is a predefined message for the 'add' action.");
    });
}