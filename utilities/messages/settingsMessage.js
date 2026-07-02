export const settingsText = (user) => {
  const notificationsOn = user?.notificationsEnabled !== false;
  const genres = user?.favoriteGenres?.length ? user.favoriteGenres.join(", ") : "Not set yet";

  return `⚙️ <b>Your Settings</b>

📌 <b>Favorite genres:</b> ${genres}
🔔 <b>Notifications:</b> ${notificationsOn ? "On" : "Off"}

Choose what to update:`;
};

export const buildSettingsKeyboard = (user) => {
  const notificationsOn = user?.notificationsEnabled !== false;

  return [
    [
      {
        text: notificationsOn ? "🔕 Turn off notifications" : "🔔 Turn on notifications",
        callback_data: notificationsOn ? "settings_notify_off" : "settings_notify_on",
      },
    ],
    [
      {
        text: "🎭 Update favorite genres",
        callback_data: "settings_genres",
      },
    ],
    [
      {
        text: "🔄 Restart onboarding",
        callback_data: "settings_reonboard",
      },
    ],
  ];
};
