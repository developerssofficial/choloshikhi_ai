import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase: SupabaseClient =
  supabaseUrl.startsWith("http") && supabaseKey.length > 10
    ? createClient(supabaseUrl, supabaseKey)
    : createClient("http://localhost:54321", "placeholder");
