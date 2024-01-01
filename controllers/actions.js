export default function Actions (bot) {
    bot.action('male', async (ctx) => {
        await ctx.answerCbQuery("ohh you're man!");
    });

    bot.action('female', async (ctx) => {
        await ctx.answerCbQuery("Welcome Lady!");
    });

    bot.action('male', async (ctx) => {
        await ctx.answerCbQuery("Are you an animal??");
    })
}