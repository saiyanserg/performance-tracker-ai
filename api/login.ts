import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

// ← use the server vars, not VITE_…
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  // Lookup user
  const { data: user, error } = await supabase
    .from("users")
    .select("id, password")
    .eq("username", username)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // TODO: bcrypt-compare in prod
  if (password !== user.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Sign a JWT using the **JWT_SECRET** var
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "2h",
  });

  return res.status(200).json({ token });
}
