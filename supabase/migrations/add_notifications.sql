-- ========== NOTIFICATIONS TABLE ==========
-- For task reminders, daily learning tasks, and system notifications

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task_reminder', 'daily_task', 'achievement', 'system', 'welcome')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT false NOT NULL,
  action_url TEXT,                   -- optional deep link
  metadata JSONB,                    -- extra data (execution_id, step_id, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========== USER PREFERENCES TABLE ==========
-- Stores notification settings, learning goals, etc.

CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true NOT NULL,
  daily_task_enabled BOOLEAN DEFAULT true NOT NULL,
  task_reminder_enabled BOOLEAN DEFAULT true NOT NULL,
  preferred_language TEXT DEFAULT 'bn',
  learning_goals TEXT[],             -- array of goal strings
  last_daily_task_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========== INDEXES ==========
CREATE INDEX idx_notifications_user ON user_notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON user_notifications(user_id, read) WHERE read = false;

-- ========== AUTO-UPDATE TIMESTAMPS ==========
CREATE OR REPLACE FUNCTION update_preferences_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_preferences_updated
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_preferences_timestamp();

-- ========== RLS POLICIES ==========
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notifications"
  ON user_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON user_notifications FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own preferences"
  ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
