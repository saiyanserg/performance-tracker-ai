import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// initialize Supabase client with your server vars
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  // look up the user
  const { data: user, error } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (error || !user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // compare password against stored bcrypt hash
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  // sign a JWT
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "2h",
  });

  res.status(200).json({ token });
}
