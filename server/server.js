import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ── In-memory “users” array (for demo purposes) ───────────────────────
// We’ve pre-hashed the password “password123” below. In production,
// you’d store/lookup these in a real database.
const users = [
  {
    id: 1,
    username: "admin",
    // Hash for “password123” (bcryptjs, 10 salt rounds)
    passwordHash: "$2b$10$Qcs.EaETZC0lP9fbqqMoRerZaQNzgx6nP.brhOddrahJfqEGTfkhW",
  },
];
// ─────────────────────────────────────────────────────────────────────

/**
 * authenticateToken
 * ─────────────────────────────────────────────────────────────────
 * Middleware that checks for “Authorization: Bearer <token>” header,
 * verifies it, and attaches `req.user = { userId, username }` if valid.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Token missing." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: "Token invalid." });
    }
    // Attach payload (e.g. { userId, username }) to req.user
    req.user = payload;
    next();
  });
}

// ── LOGIN ROUTE: Issue a JWT if username/password valid ─────────────
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials." });
  }

  // Look up the user in our “users” array
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Compare submitted password vs. stored hash
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // On success: sign a JWT (expires in 2 hours)
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return res.json({ token });
});
// ─────────────────────────────────────────────────────────────────────

// ── PUBLIC: Generate a sales tip (no JWT required) ───────────────────
app.post("/api/generateTip", async (req, res) => {
  const { entries } = req.body;

  // If no entries, return a default tip immediately
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

    // Call OpenAI’s chat completion endpoint.
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

    // Fallback logic: return a static tip rather than an error message.
    const fallbackTip =
      "📈 Tip: Focus on upselling accessories when accessory totals exceed 5 units today.";
    return res.status(200).json({ tip: fallbackTip });
  }
});
// ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AI server listening on http://localhost:${PORT}`);
});
