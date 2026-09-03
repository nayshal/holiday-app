// api/generate-trip.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server' });
  }

  try {
    const systemPrompt = `You are an expert travel planner. Create a detailed travel itinerary for the prompt: "${prompt}". 
    Return ONLY a valid JSON array of objects. Do not include markdown code blocks like \`\`\`json, just return the raw JSON array string.
    Each object must have these exact keys:
    - "day": string (e.g., "Day 1", "Day 2", "To Do")
    - "time": string (e.g., "09:00 AM")
    - "activity": string (e.g., "Visit Eiffel Tower")
    - "location": string (e.g., "Eiffel Tower, Paris")
    - "cost": string (e.g., "30" or "0")
    - "paidBy": string ("You")
    - "notes": string (short tips or booking info)`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const data = await geminiRes.json();
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    const cleanedJsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedItinerary = JSON.parse(cleanedJsonStr);

    return res.status(200).json({ itinerary: parsedItinerary });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}