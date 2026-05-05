import fetch from "node-fetch";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function getAiSuggestions(query) {
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a movie expert. The user is searching for a movie or series. Return a JSON object with two fields: 'titles' (array of up to 5 similar/correct movie titles) and 'genres' (array of genres like Drama, Action, etc.). Return ONLY the JSON object."
          },
          {
            role: "user",
            content: `User search query: "${query}"`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return {
      titles: result.titles || [],
      genres: result.genres || []
    };
  } catch (error) {
    console.error("Error in AI suggestions:", error);
    return null;
  }
}

export async function generateMediaInfoWithAI(title, isSeries = false) {
  try {
    const type = isSeries ? "series" : "movie";
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a professional movie and series expert. The user provides a ${type} title.
Your task is to generate high-quality, professional metadata for a Telegram bot.

Return ONLY a JSON object with these exact fields:
{
  "name": "Film Name (Year)",
  "caption": "A charismatic and engaging description (2-4 sentences). It should be exciting to read, compelling the user to watch, or providing a sharp summary of why it's worth (or not worth) their time. Use an inviting and professional tone.",
  "keywords": ["#MainActorOrActress", "#Genre", "#SearchKeyword1", "#SearchKeyword2", "#SearchKeyword3"]
}

Important:
1. The "name" MUST include the release year in parentheses.
2. The "caption" MUST be charismatic, high-energy, and captivating.
3. The "keywords" MUST be an array of strings, each starting with '#'. Include: Main Cast, Genres, and the Top 3 keywords users would use to find this ${type}.
4. Return ONLY the JSON object. No markdown, no extra text.`
          },
          {
            role: "user",
            content: `Title: "${title}"`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return result;
  } catch (error) {
    console.error(`Error in generating ${isSeries ? "series" : "movie"} info:`, error);
    return null;
  }
}
