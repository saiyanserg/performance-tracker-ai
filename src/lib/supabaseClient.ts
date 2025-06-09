/**
 * supabaseClient.ts
 *
 * Initializes and exports a single Supabase client instance for use throughout the app.
 * • Reads the project URL and anon key from environment variables.
 * • Throws an error at startup if either variable is missing, preventing hard-to-debug runtime failures.
 */
import { createClient } from '@supabase/supabase-js'

// Read Supabase URL and anonymous public key from Vite env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

// Validate that both variables are defined
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your .env file'
  )
}

// Create and export the Supabase client for CRUD operations
export const supabase = createClient(supabaseUrl, supabaseKey)
