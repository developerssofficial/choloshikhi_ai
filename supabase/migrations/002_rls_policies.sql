-- ============================================
-- Xparrow AI — Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES
-- ============================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (limited columns)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do anything (for backend)
CREATE POLICY "Service role full access on profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
-- Users can read their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage subscriptions (for Paddle webhooks)
CREATE POLICY "Service role full access on subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- CONVERSATIONS
-- ============================================
-- Users can CRUD their own conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "Service role full access on conversations"
  ON conversations FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- MESSAGES
-- ============================================
-- Users can read messages from their own conversations
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert messages into their own conversations
CREATE POLICY "Users can create own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "Service role full access on messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- MEMORIES
-- ============================================
-- Users can CRUD their own memories
CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "Service role full access on memories"
  ON memories FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- USAGE
-- ============================================
-- Users can read their own usage
CREATE POLICY "Users can view own usage"
  ON usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage usage (for tracking)
CREATE POLICY "Service role full access on usage"
  ON usage FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- PROMPT CACHE
-- ============================================
-- Users can read their own cache entries
CREATE POLICY "Users can view own cache"
  ON prompt_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage their own cache
CREATE POLICY "Users can insert own cache"
  ON prompt_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cache"
  ON prompt_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cache"
  ON prompt_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "Service role full access on prompt_cache"
  ON prompt_cache FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- WEBHOOK EVENTS (service role only)
-- ============================================
-- Only service role can access webhook events
CREATE POLICY "Service role full access on webhook_events"
  ON webhook_events FOR ALL
  USING (auth.role() = 'service_role');
