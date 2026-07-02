import fetch from "node-fetch";
import { extractGenres } from "#utilities/utilities.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const ALLOWED_EMOJIS = [
  "👍", "👎", "❤", "🔥", "🥰", "👏", "🤔", "🤯", "😱", "🤬", "😢", "🎉",
  "🤩", "🤮", "💩", "🙏", "👌", "🕊", "🤡", "🥱", "🥴", "😍", "🐳", "❤‍🔥",
  "🌚", "🌭", "💯", "🤣", "⚡", "🍌", "🏆", "💔", "🤨", "😐", "🍓", "🍾",
  "💋", "🖕", "😈", "😴", "😭", "🤓", "👻", "👨‍💻", "👀", "🎃", "🙈", "😇",
  "😨", "🤝", "✍", "🤗", "🫡", "🎅", "🎄", "☃", "💅", "🤪", "🗿", "🆒",
  "💘", "🙉", "🦄", "😘", "💊", "🙊", "😎", "👾", "🤷‍♂", "🤷", "🤷‍♀", "😡",
];

const GENRE_FALLBACKS = {
  Action: {
    intro: "You just unlocked a great fit for your vibe.",
    body: "That was a proper adrenaline rush.",
    emoji: "🔥",
    tone: "adrenaline",
    moodTags: ["intense", "high-energy"],
  },
  Thriller: {
    intro: "You just unlocked a great fit for your vibe.",
    body: "This one really kept the tension high.",
    emoji: "😱",
    tone: "suspenseful",
    moodTags: ["tense", "gripping"],
  },
  Comedy: {
    intro: "You just unlocked a great fit for your vibe.",
    body: "That was a fun one, no doubt.",
    emoji: "🎉",
    tone: "lighthearted",
    moodTags: ["fun", "uplifting"],
  },
  "Sci-Fi": {
    intro: "You just unlocked a great fit for your vibe.",
    body: "This feels like a mind-bending ride.",
    emoji: "🤯",
    tone: "mind-bending",
    moodTags: ["futuristic", "thought-provoking"],
  },
  Romance: {
    intro: "You just unlocked a great fit for your vibe.",
    body: "That one has a warm, emotional touch.",
    emoji: "❤",
    tone: "emotional",
    moodTags: ["warm", "heartfelt"],
  },
  Horror: {
    intro: "You just unlocked a great fit for your vibe.",
    body: "That one really knows how to unsettle you.",
    emoji: "😱",
    tone: "unsettling",
    moodTags: ["dark", "creepy"],
  },
  Drama: {
    intro: "You just unlocked a great fit for your vibe.",
    body: "This one hits with real emotional depth.",
    emoji: "🤔",
    tone: "reflective",
    moodTags: ["emotional", "character-driven"],
  },
};

const DEFAULT_FALLBACK = {
  intro: "You just unlocked a great fit for your vibe.",
  body: "That's the kind of title that makes a first impression.",
  emoji: "👍",
  tone: "engaging",
  moodTags: ["compelling"],
};

function normalizeEmoji(emoji) {
  if (emoji && ALLOWED_EMOJIS.includes(emoji)) {
    return emoji;
  }
  return "👍";
}

function getFallbackReaction(genres) {
  for (const genre of genres) {
    if (GENRE_FALLBACKS[genre]) {
      return { ...GENRE_FALLBACKS[genre], generatedAt: new Date() };
    }
  }
  return { ...DEFAULT_FALLBACK, generatedAt: new Date() };
}

export async function generateFilmReaction(content, userGenres = []) {
  const genres = extractGenres(content.keywords);
  const primaryGenre = genres[0] || "Drama";
  const userGenreHint = userGenres.length
    ? `User favorite genres: ${userGenres.join(", ")}.`
    : "";

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You create short, emotionally resonant reactions for a movie bot unlock moment.
Return ONLY a JSON object with these exact fields:
{
  "intro": "One short sentence — feels like a personal unlock (max 12 words)",
  "body": "One short sentence about the film's genre/mood/vibe (max 14 words)",
  "emoji": "Single emoji from Telegram reaction list",
  "tone": "One word emotional tone",
  "moodTags": ["tag1", "tag2"]
}

Rules:
- Never say "Good movie" or generic praise
- Match the primary genre mood (Action=adrenaline, Thriller=tension, Comedy=fun, etc.)
- If user genres overlap film genres, personalize intro slightly
- emoji MUST be one of: ${ALLOWED_EMOJIS.slice(0, 20).join(" ")}
- Total text across intro+body: max 2 short sentences`,
          },
          {
            role: "user",
            content: `Title: "${content.name}"
Genres: ${genres.join(", ") || primaryGenre}
Description: ${content.caption || "No description"}
${userGenreHint}`,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      intro: result.intro || DEFAULT_FALLBACK.intro,
      body: result.body || DEFAULT_FALLBACK.body,
      emoji: normalizeEmoji(result.emoji),
      tone: result.tone || "engaging",
      moodTags: result.moodTags || [],
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error("Error generating film reaction:", error);
    return getFallbackReaction(genres);
  }
}

export async function getOrCreateReaction(content, user = null) {
  if (content.aiReaction?.generatedAt) {
    return content.aiReaction;
  }

  const userGenres = user?.favoriteGenres || [];
  const reaction = await generateFilmReaction(content, userGenres);

  content.aiReaction = reaction;
  await content.save();

  return reaction;
}

export async function reactToMessage(ctx, emoji) {
  const normalizedEmoji = normalizeEmoji(emoji);
  try {
    const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
    const messageId = ctx.message?.message_id || ctx.callbackQuery?.message?.message_id;

    if (!chatId || !messageId) {
      return;
    }

    if (typeof ctx.react === "function") {
      await ctx.react(normalizedEmoji);
      return;
    }

    await ctx.telegram.callApi("setMessageReaction", {
      chat_id: chatId,
      message_id: messageId,
      reaction: [{ type: "emoji", emoji: normalizedEmoji }],
    });
  } catch (error) {
    console.error("Failed to set message reaction:", error);
  }
}
