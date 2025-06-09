import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { error, count } = await supabase
    .from("entries")
    .delete()
    .neq("id", ""); // delete all rows

  if (error) {
    console.error("Error clearing entries:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ cleared: count });
}
