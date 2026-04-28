import fetch from "node-fetch";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function getAiSuggestions(query) {
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
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
