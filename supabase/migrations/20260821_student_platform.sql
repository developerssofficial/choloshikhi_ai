-- ================================================================
-- STUDENT LEARNING PLATFORM - Comprehensive Schema Migration
-- Tables: student_profiles, friendships, dm_conversations,
--         dm_participants, dm_messages, groups, group_members,
--         group_messages, user_subscriptions, redeem_codes, user_redeems
-- ================================================================

-- ================================================================
-- FUNCTIONS (must exist before triggers)
-- ================================================================

-- generate_username: produces CSH_XXXXXX format, ensures uniqueness
CREATE OR REPLACE FUNCTION generate_username()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT;
  i INT;
BEGIN
  LOOP
    result := 'CSH_';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM student_profiles WHERE username = result
    );
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- check_teacher_quota: returns true if user has quota remaining, increments usage
CREATE OR REPLACE FUNCTION check_teacher_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_month TEXT := to_char(now(), 'YYYY-MM');
  sub RECORD;
BEGIN
  SELECT * INTO sub FROM user_subscriptions WHERE user_id = p_user_id;

  -- No subscription row or teacher mode not enabled
  IF sub IS NULL OR NOT sub.teacher_mode_enabled THEN
    RETURN false;
  END IF;

  -- Reset counter if month has changed
  IF sub.teacher_usage_month IS DISTINCT FROM current_month THEN
    UPDATE user_subscriptions
      SET teacher_monthly_used = 0,
          teacher_usage_month = current_month,
          updated_at = now()
      WHERE user_id = p_user_id;
    sub.teacher_monthly_used := 0;
  END IF;

  -- Check remaining quota
  IF sub.teacher_monthly_used >= sub.teacher_monthly_limit THEN
    RETURN false;
  END IF;

  -- Increment usage
  UPDATE user_subscriptions
    SET teacher_monthly_used = teacher_monthly_used + 1,
        updated_at = now()
    WHERE user_id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- reset_teacher_monthly: resets teacher_monthly_used for all users when month changes
-- Run via pg_cron: SELECT cron.schedule('reset-teacher-monthly', '0 0 1 * *', $$ SELECT reset_teacher_monthly() $$);
-- Or call manually at the start of each month.
CREATE OR REPLACE FUNCTION reset_teacher_monthly()
RETURNS VOID AS $$
DECLARE
  current_month TEXT := to_char(now(), 'YYYY-MM');
BEGIN
  UPDATE user_subscriptions
    SET teacher_monthly_used = 0,
        teacher_usage_month = current_month,
        updated_at = now()
    WHERE teacher_mode_enabled = true
      AND (teacher_usage_month IS DISTINCT FROM current_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- TRIGGER FUNCTIONS
-- ================================================================

-- on_group_message_added: update groups.updated_at on group_messages insert
CREATE OR REPLACE FUNCTION update_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups SET updated_at = now() WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- on_dm_message_updated: update dm_conversations.updated_at on dm_messages insert
CREATE OR REPLACE FUNCTION update_dm_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dm_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TABLES
-- ================================================================

-- 1. student_profiles
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL DEFAULT generate_username(),
  display_name TEXT,
  avatar_url TEXT,
  is_anonymous BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. friendships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

-- 3. dm_conversations
CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. dm_participants
CREATE TABLE IF NOT EXISTS dm_participants (
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

-- 5. dm_messages
CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL
);

-- 6. groups
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  invite_code TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false NOT NULL,
  max_members INT DEFAULT 50 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. group_members
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- 8. group_messages
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 9. user_subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  teacher_mode_enabled BOOLEAN DEFAULT false NOT NULL,
  teacher_monthly_limit INT DEFAULT 30 NOT NULL,
  teacher_monthly_used INT DEFAULT 0 NOT NULL,
  teacher_usage_month TEXT,
  unlimited_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 10. redeem_codes
CREATE TABLE IF NOT EXISTS redeem_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT UNIQUE NOT NULL,
  description TEXT,
  grant_type TEXT NOT NULL DEFAULT 'unlimited' CHECK (grant_type IN ('unlimited')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  max_uses INT,
  current_uses INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 11. user_redeems
CREATE TABLE IF NOT EXISTS user_redeems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES redeem_codes(id),
  redeemed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, code_id)
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_student_profiles_username ON student_profiles(username);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation ON dm_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id, created_at);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_groups_invite'
  ) THEN
    CREATE INDEX idx_groups_invite ON groups(invite_code) WHERE invite_code IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- on_group_message_added: update groups.updated_at when group_messages inserted
DROP TRIGGER IF EXISTS on_group_message_added ON group_messages;
CREATE TRIGGER on_group_message_added
  AFTER INSERT ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_group_timestamp();

-- on_dm_message_updated: update dm_conversations.updated_at when dm_messages inserted
DROP TRIGGER IF EXISTS on_dm_message_updated ON dm_messages;
CREATE TRIGGER on_dm_message_updated
  AFTER INSERT ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_conversation_timestamp();

-- Auto-update updated_at for student_profiles
CREATE OR REPLACE FUNCTION update_student_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_student_profile_updated ON student_profiles;
CREATE TRIGGER on_student_profile_updated
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_student_profile_timestamp();

-- Auto-update updated_at for friendships
CREATE OR REPLACE FUNCTION update_friendship_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_friendship_updated ON friendships;
CREATE TRIGGER on_friendship_updated
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendship_timestamp();

-- Auto-update updated_at for groups
CREATE OR REPLACE FUNCTION update_group_meta_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_group_updated ON groups;
CREATE TRIGGER on_group_updated
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_group_meta_timestamp();

-- Auto-update updated_at for dm_conversations (on direct update)
DROP TRIGGER IF EXISTS on_dm_conversation_updated ON dm_conversations;
CREATE TRIGGER on_dm_conversation_updated
  BEFORE UPDATE ON dm_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_conversation_timestamp();

-- Auto-update updated_at for user_subscriptions
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_subscription_updated ON user_subscriptions;
CREATE TRIGGER on_subscription_updated
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
-- redeem_codes: no RLS (server-side only via service role)
ALTER TABLE user_redeems ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES: student_profiles
-- Users can only read their own profile. Admin can read all.
-- Other students CANNOT see other students' details.
-- ================================================================

DROP POLICY IF EXISTS "Profiles: anyone can read" ON student_profiles;
DROP POLICY IF EXISTS "Profiles: users can read own" ON student_profiles;
CREATE POLICY "Profiles: users can read own"
  ON student_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Profiles: users can insert own" ON student_profiles;
CREATE POLICY "Profiles: users can insert own"
  ON student_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Profiles: users can update own" ON student_profiles;
CREATE POLICY "Profiles: users can update own"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Profiles: users can delete own" ON student_profiles;
CREATE POLICY "Profiles: users can delete own"
  ON student_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- RLS POLICIES: friendships
-- Users can only see friendships where they are requester or addressee
-- ================================================================

DROP POLICY IF EXISTS "Friendships: users can view own" ON friendships;
CREATE POLICY "Friendships: users can view own"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Friendships: users can insert as requester" ON friendships;
CREATE POLICY "Friendships: users can insert as requester"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Friendships: users can update own" ON friendships;
CREATE POLICY "Friendships: users can update own"
  ON friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Friendships: users can delete own" ON friendships;
CREATE POLICY "Friendships: users can delete own"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ================================================================
-- RLS POLICIES: dm_conversations
-- Users can only see conversations they participate in
-- ================================================================

DROP POLICY IF EXISTS "DM: users can view own conversations" ON dm_conversations;
CREATE POLICY "DM: users can view own conversations"
  ON dm_conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM dm_participants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "DM: service role can create" ON dm_conversations;
CREATE POLICY "DM: service role can create"
  ON dm_conversations FOR INSERT
  WITH CHECK (true);

-- ================================================================
-- RLS POLICIES: dm_participants
-- Users can see participants of conversations they belong to
-- ================================================================

DROP POLICY IF EXISTS "DM participants: users can view own conversations" ON dm_participants;
CREATE POLICY "DM participants: users can view own conversations"
  ON dm_participants FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM dm_participants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "DM participants: service role can manage" ON dm_participants;
CREATE POLICY "DM participants: service role can manage"
  ON dm_participants FOR INSERT
  WITH CHECK (true);

-- ================================================================
-- RLS POLICIES: dm_messages
-- Users can only see messages in conversations they participate in
-- Can only insert as sender_id = auth.uid()
-- ================================================================

DROP POLICY IF EXISTS "DM messages: users can view own conversations" ON dm_messages;
CREATE POLICY "DM messages: users can view own conversations"
  ON dm_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM dm_participants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "DM messages: users can insert as sender" ON dm_messages;
CREATE POLICY "DM messages: users can insert as sender"
  ON dm_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (
      SELECT conversation_id FROM dm_participants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "DM messages: users can update own" ON dm_messages;
CREATE POLICY "DM messages: users can update own"
  ON dm_messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT conversation_id FROM dm_participants WHERE user_id = auth.uid()
    )
  );

-- ================================================================
-- RLS POLICIES: groups
-- Users can see groups they are members of, plus public groups
-- ================================================================

DROP POLICY IF EXISTS "Groups: members and public visible" ON groups;
CREATE POLICY "Groups: members and public visible"
  ON groups FOR SELECT
  USING (
    is_public = true
    OR id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Groups: authenticated users can create" ON groups;
CREATE POLICY "Groups: authenticated users can create"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Groups: creators and owners can update" ON groups;
CREATE POLICY "Groups: creators and owners can update"
  ON groups FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Groups: creators and owners can delete" ON groups;
CREATE POLICY "Groups: creators and owners can delete"
  ON groups FOR DELETE
  USING (
    auth.uid() = creator_id
    OR id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ================================================================
-- RLS POLICIES: group_members
-- Users can see members of groups they belong to
-- ================================================================

DROP POLICY IF EXISTS "Group members: members can view" ON group_members;
CREATE POLICY "Group members: members can view"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group members: owners/admins can manage" ON group_members;
CREATE POLICY "Group members: owners/admins can manage"
  ON group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Group members: owners/admins can update members" ON group_members;
CREATE POLICY "Group members: owners/admins can update members"
  ON group_members FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Group members: owners/admins can remove members" ON group_members;
CREATE POLICY "Group members: owners/admins can remove members"
  ON group_members FOR DELETE
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ================================================================
-- RLS POLICIES: group_messages
-- Users can only see/insert messages in groups they are members of
-- ================================================================

DROP POLICY IF EXISTS "Group messages: members can view" ON group_messages;
CREATE POLICY "Group messages: members can view"
  ON group_messages FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group messages: members can insert" ON group_messages;
CREATE POLICY "Group messages: members can insert"
  ON group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- ================================================================
-- RLS POLICIES: user_subscriptions
-- Users can only see their own subscription
-- ================================================================

DROP POLICY IF EXISTS "Subscriptions: users can view own" ON user_subscriptions;
CREATE POLICY "Subscriptions: users can view own"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Subscriptions: service role can manage" ON user_subscriptions;
CREATE POLICY "Subscriptions: service role can manage"
  ON user_subscriptions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Subscriptions: service role can update" ON user_subscriptions;
CREATE POLICY "Subscriptions: service role can update"
  ON user_subscriptions FOR UPDATE
  USING (true);

-- ================================================================
-- RLS POLICIES: user_redeems
-- Users can only see their own redeems
-- ================================================================

DROP POLICY IF EXISTS "Redeems: users can view own" ON user_redeems;
CREATE POLICY "Redeems: users can view own"
  ON user_redeems FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Redeems: users can insert own" ON user_redeems;
CREATE POLICY "Redeems: users can insert own"
  ON user_redeems FOR INSERT
  WITH CHECK (auth.uid() = user_id);
