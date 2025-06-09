/**
 * AI Server Setup (Node.js + Express + Supabase Demo)
 *
 * • Sets up an Express app with CORS and JSON body parsing.
 * • Loads environment variables via dotenv.
 * • Initializes the OpenAI client for GPT calls.
 * • Defines an in-memory user store for demo login with bcrypt-hashed passwords.
 * • Provides JWT middleware for protected routes.
 * • Exposes:
 *     – POST /api/login      → issues JWT on valid credentials
 *     – POST /api/generateTip → returns an AI-generated sales tip (public)
 * • Starts listening on the specified PORT.
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Load variables from .env into process.env
dotenv.config();

// Create the Express application
const app = express();

// Enable Cross-Origin Resource Sharing for all routes
app.use(cors());

// Parse JSON bodies for incoming requests
app.use(express.json());

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ── In-memory “users” array (for demo purposes) ───────────────────────
// Pre-hashed password: “password123” with bcryptjs (10 salt rounds).  
// In production, this would be stored and looked up in a real database.
const users = [
  {
    id: 1,
    username: "admin",
    passwordHash: "$2b$10$Qcs.EaETZC0lP9fbqqMoRerZaQNzgx6nP.brhOddrahJfqEGTfkhW",
  },
];

// ── JWT Authentication Middleware ──────────────────────────────────────
/**
 * authenticateToken
 * • Reads the `Authorization: Bearer <token>` header.
 * • Verifies the JWT using the secret from process.env.JWT_SECRET.
 * • On success, attaches `req.user = { userId, username }` and calls next().
 * • On failure, responds with 401 (missing) or 403 (invalid).
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  // Extract token after "Bearer "
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: "Token invalid." });
    }
    // Attach decoded payload (userId, username) to req.user
    req.user = payload;
    next();
  });
}

// ── LOGIN ROUTE: Issue a JWT if username/password valid ─────────────
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  // Validate presence of credentials
  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials." });
  }

  // Look up the user in our in-memory array
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Compare provided password with stored bcrypt hash
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // On success: sign a JWT that expires in 2 hours
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  // Return the token to the client
  return res.json({ token });
});

// ── PUBLIC: Generate a sales tip (no JWT required) ───────────────────
app.post("/api/generateTip", async (req, res) => {
  const { entries } = req.body;

  // If no entries provided, return an immediate default tip
  if (!entries || entries.length === 0) {
    return res.status(200).json({
      tip: "📊 Add at least one sales entry to get a personalized tip.",
    });
  }

  try {
    // Construct the user prompt for the AI model
    const userPrompt = `
Generate a concise, one-line sales tip based on the following daily sales entries:
${JSON.stringify(entries)}
`;

    // Call OpenAI’s chat completion endpoint
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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

    // Extract and trim the generated tip
    const tipText = completion.choices[0].message.content.trim();
    return res.status(200).json({ tip: tipText });
  } catch (err) {
    console.error("OpenAI error:", err);
    // Fallback static tip if the AI call fails
    const fallbackTip =
      "📈 Tip: Focus on upselling accessories when accessory totals exceed 5 units today.";
    return res.status(200).json({ tip: fallbackTip });
  }
});

// ── Start the server on the configured port ───────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AI server listening on http://localhost:${PORT}`);
});