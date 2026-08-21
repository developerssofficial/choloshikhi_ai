-- ========== USER MEMORY TABLE ==========
-- Stores persistent user knowledge extracted from conversations
-- AI can remember: name, class, learning topics, strengths, weaknesses, preferences

create table user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null check (category in ('personal', 'learning', 'preference', 'progress', 'context')),
  key text not null,
  value text not null,
  confidence real default 0.8,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, category, key)
);

-- ========== INDEXES ==========

create index idx_user_memory_user on user_memory(user_id, category);

-- ========== RLS POLICIES ==========

alter table user_memory enable row level security;

create policy "Users can view own memory"
  on user_memory for select
  using (auth.uid() = user_id);

create policy "Users can upsert own memory"
  on user_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update own memory"
  on user_memory for update
  using (auth.uid() = user_id);

create policy "Users can delete own memory"
  on user_memory for delete
  using (auth.uid() = user_id);

-- ========== UPSERT FUNCTION ==========

create or replace function upsert_user_memory(
  p_user_id uuid,
  p_category text,
  p_key text,
  p_value text,
  p_confidence real default 0.8
)
returns void as $$
begin
  insert into user_memory (user_id, category, key, value, confidence)
  values (p_user_id, p_category, p_key, p_value, p_confidence)
  on conflict (user_id, category, key)
  do update set
    value = excluded.value,
    confidence = excluded.confidence,
    updated_at = now();
end;
$$ language plpgsql;

-- ========== USER TOPICS TABLE ==========
-- Tracks which topics a user has studied and how deeply
-- Helps AI know what to review vs what to skip

create table user_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  topic text not null,
  coverage text not null default 'introduced' check (coverage in ('introduced', 'practiced', 'mastered', 'struggled')),
  mention_count int default 1 not null,
  last_practiced timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique(user_id, topic)
);

create index idx_user_topics_user on user_topics(user_id, last_practiced desc);

alter table user_topics enable row level security;

create policy "Users can view own topics"
  on user_topics for select
  using (auth.uid() = user_id);

create policy "Users can upsert own topics"
  on user_topics for insert
  with check (auth.uid() = user_id);

create policy "Users can update own topics"
  on user_topics for update
  using (auth.uid() = user_id);

-- ========== SESSION SUMMARIES ==========
-- Short summary of what happened in each session
-- Used for cross-session context (much cheaper than loading full history)

alter table chat_sessions add column summary text;
alter table chat_sessions add column topic_tags text[];

-- ========== PRUNE OLD LOW-CONFIDENCE MEMORY ==========
-- Function to clean up old/low-confidence memory entries

create or replace function prune_user_memory(p_user_id uuid)
returns void as $$
begin
  -- Remove memory entries older than 30 days with low confidence
  delete from user_memory
  where user_id = p_user_id
    and confidence < 0.5
    and updated_at < now() - interval '30 days';

  -- Cap total memory entries at 100 per user (keep highest confidence)
  delete from user_memory
  where user_id = p_user_id
    and id not in (
      select id from user_memory
      where user_id = p_user_id
      order by confidence desc, updated_at desc
      limit 100
    );
end;
$$ language plpgsql;
