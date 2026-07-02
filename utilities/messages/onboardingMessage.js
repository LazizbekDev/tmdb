export const ONBOARDING_GENRES = [
  "Action",
  "Comedy",
  "Sci-Fi",
  "Thriller",
  "Romance",
  "Horror",
  "Drama",
];

export const GENRE_CALLBACK_KEYS = {
  Action: "Action",
  Comedy: "Comedy",
  "Sci-Fi": "SciFi",
  Thriller: "Thriller",
  Romance: "Romance",
  Horror: "Horror",
  Drama: "Drama",
};

export const CALLBACK_KEY_TO_GENRE = Object.fromEntries(
  Object.entries(GENRE_CALLBACK_KEYS).map(([genre, key]) => [key, genre])
);

export function buildGenreKeyboard(selectedGenres = []) {
  const rows = [];
  let row = [];

  for (const genre of ONBOARDING_GENRES) {
    const key = GENRE_CALLBACK_KEYS[genre];
    const isSelected = selectedGenres.includes(genre);
    row.push({
      text: `${isSelected ? "✅" : "⬜"} ${genre}`,
      callback_data: `onboard_toggle_${key}`,
    });

    if (row.length === 2) {
      rows.push(row);
      row = [];
    }
  }

  if (row.length) {
    rows.push(row);
  }

  rows.push([{ text: "✅ Confirm Selection", callback_data: "onboard_genres_done" }]);
  rows.push([{ text: "Skip for now", callback_data: "onboard_skip" }]);

  return rows;
}

export function genreSelectionText(selectedGenres, inferredGenres = []) {
  const hasHistory = inferredGenres.length > 0;
  const selectedText = selectedGenres.length
    ? selectedGenres.join(", ")
    : "none yet";

  let text = `<b>🎭 Personalize Your Experience</b>\n\n`;
  text += `Pick <b>3 to 5</b> genres you love. We'll tailor recommendations just for you.\n\n`;

  if (hasHistory) {
    text += `<i>Based on what you've watched, we think you enjoy: <b>${inferredGenres.join(", ")}</b>. Tap to adjust, then confirm.</i>\n\n`;
  }

  text += `<b>Selected (${selectedGenres.length}/5):</b> ${selectedText}`;
  return text;
}

export const notificationPreferenceText = `<b>🔔 Stay in the loop?</b>

Would you like occasional movie suggestions and watchlist reminders tailored to your taste?

You can change this anytime.`;

export function buildNotificationKeyboard() {
  return [
    [{ text: "✅ Yes, keep me posted", callback_data: "onboard_notify_yes" }],
    [{ text: "No thanks", callback_data: "onboard_notify_no" }],
  ];
}
