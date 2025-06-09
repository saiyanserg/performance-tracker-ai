import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { entries } = req.body as { entries: any[] };
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: "Missing or invalid `entries` array" });
  }

  try {
    // Build a prompt from the entries
    const prompt = `
You are a sales coach. Given these entries:
${JSON.stringify(entries, null, 2)}
Give me one concise actionable tip to improve performance this week.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful sales coach assistant." },
        { role: "user", content: prompt }
      ],
      max_tokens: 60
    });

    const tip = completion.choices?.[0]?.message.content?.trim() ?? "(no tip)";
    return res.status(200).json({ tip });
  } catch (err: any) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: "Failed to generate tip" });
  }
}
