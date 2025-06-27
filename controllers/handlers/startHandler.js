import Movie from "../../model/MovieModel.js";
import Series from "../../model/SeriesModel.js";
import User from "../../model/User.js";
import { adminNotifier } from "../../utilities/admin_notifier.js";
import { checkUserMembership, createUserLink, startMessage } from "../start.js";
import caption from "../../utilities/caption.js";

export async function handleStart(ctx) {
  const userId = ctx.message.from.id;
  const isMember = await checkUserMembership(userId);
  const payload = ctx.startPayload;
  const userFirstName = ctx.message.from.first_name;
  const userUsername = ctx.message.from.username || "No username";
  const limit = 2;

  try {
    let user = await User.findOne({ telegramId: userId });

    if (!user) {
      user = new User({
        telegramId: userId,
        firstName: userFirstName,
        username: userUsername,
        accessCount: 0,
        inActive: false,
        createdAt: new Date(),
      });
      await user.save();
    }

    if (!isMember && user.accessCount >= limit) {
      return ctx.reply(
        `🎬 You can only get a movie after joining our channel. You’ve reached your free access limit.\n\nPlease join the <a href='https://t.me/${process.env.CHANNEL_USERNAME}'>channel</a> to continue enjoying the bot!`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Join Now",
                  url: `https://t.me/${process.env.CHANNEL_USERNAME}`,
                },
              ],
              [{ text: "Check Membership", callback_data: "check_membership" }],
            ],
          },
        }
      );
    }

    if (payload) {
      const movie = await Movie.findById(payload);
      if (movie) {
        const userIdStr = userId.toString();
        const hasAccessedBefore = movie.accessedBy.includes(userIdStr);
        // Agar ilgari ko‘rgan bo‘lsa va hozir a'zo bo‘lsa => protected content false bo‘lib yuborilsin
        const shouldProtect = !isMember && !hasAccessedBefore;
        if (!hasAccessedBefore) {
          movie.accessedBy.push(userIdStr);
          movie.views += 1;
          await movie.save();
          user.accessedMovies.push(movie._id);
          await user.save();

          const adminMessage = `
🔔 <b>Movie Accessed</b>
▪️ <b>Movie:</b> <a href='https://t.me/${process.env.BOT_USERNAME}?start=${movie._id}'>${movie.name}</a>
▪️ <b>Access Count:</b> ${movie.accessedBy.length}
▪️ <b>User:</b> <a href='${createUserLink(ctx.message.from)}'>${userFirstName}</a>
▪️ <b>User ID:</b> <code>${userId}</code>
          `;
          await ctx.telegram.sendMessage(process.env.ADMIN_ID, adminMessage, {
            parse_mode: "HTML",
          });
        }
        const isAdmin =
          ctx.message.from?.username?.toLowerCase() === process.env.ADMIN;
        // Video yuborish — har qanday holatda
        await ctx.replyWithVideo(movie.movieUrl, {
          caption: caption(movie, false),
          parse_mode: "HTML",
          protect_content: shouldProtect,
          reply_markup: {
            inline_keyboard: [
              ...(isAdmin
                ? [
                    [
                      { text: "Delete 🗑", callback_data: `delete_${movie._id}` },
                      { text: "Update ✏️", callback_data: `update_${movie._id}` }
                    ],
                    [{ text: "Search", switch_inline_query_current_chat: "" }],
                  ]
                : [[{ text: "Search", switch_inline_query_current_chat: "" }]]),
            ],
          },
        });

        if (!isMember && !hasAccessedBefore) {
          user.accessCount++;
          await user.save();
          return ctx.reply(
            `You cannot save or share the content unless you join the main <a href='https://t.me/${process.env.CHANNEL_USERNAME}'>channel</a> `,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Join",
                      url: `https://t.me/${process.env.CHANNEL_USERNAME}`,
                    },
                  ],
                  [{ text: "Check", callback_data: "check_membership" }],
                ],
              },
            }
          );
        }
        return;
      }

      const series = await Series.findById(payload);
      if (series) {
        if (!series.accessedBy?.includes(userId.toString())) {
          series.accessedBy = series.accessedBy || [];
          series.accessedBy.push(userId.toString());
          series.views += 1;
          await series.save();

          const adminMessage = `
🔔 <b>Show Accessed</b>
▪️ <b>Show:</b> <a href='https://t.me/${process.env.BOT_USERNAME}?start=${series._id}'>${series.name}</a>
▪️ <b>Access Count:</b> ${series.accessedBy.length}
▪️ <b>User:</b> ${userFirstName} (@${userUsername})
▪️ <b>User ID:</b> <code>${userId}</code>
          `;
          await ctx.telegram.sendMessage(process.env.ADMIN_ID, adminMessage, {
            parse_mode: "HTML",
          });
        }
        let totalEpisodes = 0;
        for (const season of series.series.sort(
          (a, b) => a.seasonNumber - b.seasonNumber
        )) {
          totalEpisodes += season.episodes.length;
          for (const episode of season.episodes.sort(
            (a, b) => a.episodeNumber - b.episodeNumber
          )) {
            await ctx.replyWithVideo(episode.fileId, {
              caption: `<b>${series.name.toUpperCase()}</b>\nSeason ${
                season.seasonNumber
              }, Episode ${episode.episodeNumber}`,
              parse_mode: "HTML",
              protect_content: !isMember,
            });
          }
        }
        ctx.reply(
          `🎬 <b>${series.name}</b>\n📚 Season: <b>${series.series[0].seasonNumber}</b>\n🎞 Total Episodes: <b>${totalEpisodes}</b>\n\nUse /list to explore more or hit the button below to search.`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "Search", switch_inline_query_current_chat: "" }],
              ],
            },
          }
        );

        if (!isMember) {
          user.accessCount++;
          await user.save();
          return ctx.reply(
            `You cannot save or share the content unless you join the main <a href='https://t.me/${process.env.CHANNEL_USERNAME}'>channel</a> `,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Join",
                      url: `https://t.me/${process.env.CHANNEL_USERNAME}`,
                    },
                  ],
                  [{ text: "Check", callback_data: "check_membership" }],
                ],
              },
            }
          );
        }
        return;
      }

      return ctx.reply(
        "Sorry, the movie or series you are looking for does not exist.\nClick /list to see the table of content",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Search", switch_inline_query_current_chat: "" }],
            ],
          },
        }
      );
    }

    startMessage(ctx);
  } catch (error) {
    console.error("❌ Error in handleStart:", error);
    await adminNotifier(
      ctx.telegram,
      error,
      ctx,
      "Error in handleStart function"
    );
    return ctx.reply("⚠️ Something went wrong. Please try again later.");
  }
}
