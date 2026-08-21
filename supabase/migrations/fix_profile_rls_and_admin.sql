-- Fix: student_profiles RLS — restrict read to own profile only
-- Previously: anyone could read all profiles
-- Now: users can only read their own profile details

DROP POLICY IF EXISTS "Profiles: anyone can read" ON student_profiles;
DROP POLICY IF EXISTS "Profiles: users can read own" ON student_profiles;

CREATE POLICY "Profiles: users can read own"
  ON student_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Note: Admin access is handled server-side via service_role key (bypasses RLS)
-- The frontend AccountMenu fetches /api/subscription which uses service_role
