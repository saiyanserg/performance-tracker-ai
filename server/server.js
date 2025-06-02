import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/generateTip", async (req, res) => {
  const { entries } = req.body;

  // If no entries were sent, return a default message immediately.
  if (!entries || entries.length === 0) {
    return res.status(200).json({
      tip: "📊 Add at least one sales entry to get a personalized tip.",
    });
  }

  try {
    // Build a simple prompt using the entries array.
    const userPrompt = `
Generate a concise, one-line sales tip based on the following daily sales entries:
${JSON.stringify(entries)}
`;

    // Attempt to call OpenAI's chat completion endpoint.
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or "gpt-3.5-turbo-0613" if you hit quota issues
      messages: [
        {
          role: "system",
          content:
            "You are a helpful sales coach. Given past daily sales data, you provide a quick tip.",
        },
        {
          role: "user",
          content: userPrompt.trim(),
        },
      ],
    });

    // Extract the generated tip from the response.
    const tipText = completion.choices[0].message.content.trim();
    return res.status(200).json({ tip: tipText });
  } catch (err) {
    console.error("OpenAI error:", err);

    // Fallback logic: if there is any error (rate limit, invalid key, etc.),
    // return a static tip rather than an "Unable to generate" message.
    const fallbackTip =
      "📈 Tip: Focus on upselling accessories when accessory totals exceed 5 units today.";
    return res.status(200).json({ tip: fallbackTip });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AI server listening on http://localhost:${PORT}`);
});
