-- ========== TASK EXECUTION TABLES ==========
-- Phase 2: Task Execution Engine
-- Stores execution state server-side so page refresh preserves progress.

-- Overall task execution (one per "Start Task" click)
CREATE TABLE task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  graph JSONB NOT NULL,              -- The full validated TaskGraph
  title TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','running','paused','completed','failed','cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Individual step execution state
CREATE TABLE task_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES task_executions(id) ON DELETE CASCADE NOT NULL,
  step_id TEXT NOT NULL,             -- matches TaskNode.id (e.g. "step-1")
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed','waiting_for_user','skipped')),
  result JSONB,                      -- AI-generated output for this step
  output_text TEXT,                  -- human-readable summary
  error TEXT,                        -- error message if failed
  user_input TEXT,                   -- user's response when waiting_for_user
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (execution_id, step_id)
);

-- ========== INDEXES ==========
CREATE INDEX idx_task_executions_user ON task_executions(user_id, created_at DESC);
CREATE INDEX idx_task_executions_session ON task_executions(session_id);
CREATE INDEX idx_task_exec_steps_execution ON task_execution_steps(execution_id, step_id);

-- ========== AUTO-UPDATE TIMESTAMPS ==========
CREATE OR REPLACE FUNCTION update_execution_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_task_execution_updated
  BEFORE UPDATE ON task_executions
  FOR EACH ROW EXECUTE FUNCTION update_execution_timestamp();

CREATE TRIGGER on_task_exec_step_updated
  BEFORE UPDATE ON task_execution_steps
  FOR EACH ROW EXECUTE FUNCTION update_execution_timestamp();

-- ========== RLS POLICIES ==========
ALTER TABLE task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_execution_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions"
  ON task_executions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own executions"
  ON task_executions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions"
  ON task_executions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own execution steps"
  ON task_execution_steps FOR SELECT
  USING (execution_id IN (
    SELECT id FROM task_executions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create own execution steps"
  ON task_execution_steps FOR INSERT
  WITH CHECK (execution_id IN (
    SELECT id FROM task_executions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own execution steps"
  ON task_execution_steps FOR UPDATE
  USING (execution_id IN (
    SELECT id FROM task_executions WHERE user_id = auth.uid()
  ));
