import Movie from "#model/MovieModel.js";
import Series from "#model/SeriesModel.js";
import User from "#model/User.js";
import { startMessage } from "#controllers/start.js";
import { extractGenres } from "#utilities/utilities.js";
import {
  ONBOARDING_GENRES,
  CALLBACK_KEY_TO_GENRE,
  buildGenreKeyboard,
  genreSelectionText,
  notificationPreferenceText,
  buildNotificationKeyboard,
} from "#utilities/messages/onboardingMessage.js";

export async function inferGenresFromHistory(user) {
  const allInterestIds = [
    ...new Set([...(user.accessedMovies || []), ...(user.savedMovies || [])]),
  ];

  if (!allInterestIds.length) {
    return [];
  }

  const [movies, series] = await Promise.all([
    Movie.find({ _id: { $in: allInterestIds } }, { keywords: 1 }),
    Series.find({ _id: { $in: allInterestIds } }, { keywords: 1 }),
  ]);

  const keywordCount = {};
  [...movies, ...series].forEach((item) => {
    extractGenres(item.keywords).forEach((genre) => {
      if (ONBOARDING_GENRES.includes(genre)) {
        keywordCount[genre] = (keywordCount[genre] || 0) + 1;
      }
    });
  });

  return Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);
}

export async function startOnboarding(ctx, user) {
  const inferredGenres = await inferGenresFromHistory(user);
  ctx.session.onboardingGenres = inferredGenres.length ? [...inferredGenres] : [];
  ctx.session.onboardingInferred = [...inferredGenres];

  await ctx.reply(genreSelectionText(ctx.session.onboardingGenres, inferredGenres), {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buildGenreKeyboard(ctx.session.onboardingGenres) },
  });
}

export async function handleOnboardingCallback(ctx, callbackData) {
  if (callbackData.startsWith("onboard_toggle_")) {
    const key = callbackData.replace("onboard_toggle_", "");
    const genre = CALLBACK_KEY_TO_GENRE[key];
    if (!genre) {
      return ctx.answerCbQuery("Unknown genre.");
    }

    ctx.session.onboardingGenres = ctx.session.onboardingGenres || [];
    const selected = ctx.session.onboardingGenres;
    const index = selected.indexOf(genre);

    if (index >= 0) {
      selected.splice(index, 1);
    } else if (selected.length >= 5) {
      return ctx.answerCbQuery("You can select up to 5 genres.", { show_alert: true });
    } else {
      selected.push(genre);
    }

    const inferred = ctx.session.onboardingInferred || [];
    await ctx.editMessageText(
      genreSelectionText(selected, inferred),
      {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buildGenreKeyboard(selected) },
      }
    );
    return ctx.answerCbQuery();
  }

  if (callbackData === "onboard_genres_done") {
    const selected = ctx.session.onboardingGenres || [];
    if (selected.length < 3) {
      return ctx.answerCbQuery("Please select at least 3 genres.", { show_alert: true });
    }

    ctx.session.onboardingStep = "notifications";
    await ctx.editMessageText(notificationPreferenceText, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buildNotificationKeyboard() },
    });
    return ctx.answerCbQuery();
  }

  if (callbackData === "onboard_skip") {
    await finishOnboarding(ctx, { skipGenres: true });
    return ctx.answerCbQuery("Skipped for now.");
  }

  if (callbackData === "onboard_notify_yes" || callbackData === "onboard_notify_no") {
    const notificationsEnabled = callbackData === "onboard_notify_yes";
    const selected = ctx.session.onboardingGenres || [];
    await finishOnboarding(ctx, {
      favoriteGenres: selected,
      notificationsEnabled,
    });
    return ctx.answerCbQuery(notificationsEnabled ? "Notifications enabled!" : "No notifications.");
  }

  return false;
}

async function finishOnboarding(ctx, options = {}) {
  const userId = ctx.from.id.toString();
  const update = {
    onboardingCompleted: true,
    notificationsEnabled: options.notificationsEnabled ?? true,
  };

  if (!options.skipGenres && options.favoriteGenres?.length) {
    update.favoriteGenres = options.favoriteGenres;
  }

  await User.findOneAndUpdate({ telegramId: userId }, { $set: update });

  delete ctx.session.onboardingGenres;
  delete ctx.session.onboardingInferred;
  delete ctx.session.onboardingStep;

  if (ctx.callbackQuery?.message) {
    await ctx.editMessageText("<b>✨ All set!</b> Your experience is now personalized.", {
      parse_mode: "HTML",
    });
  }

  await startMessage(ctx);
}

export function isOnboardingCallback(callbackData) {
  return callbackData.startsWith("onboard_");
}
