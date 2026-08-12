-- ========== CHAT SESSIONS TABLE ==========

create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Chat',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ========== ADD SESSION_ID TO CHAT_HISTORY ==========

alter table chat_history add column session_id uuid references chat_sessions(id) on delete cascade;

-- ========== INDEXES ==========

create index idx_chat_sessions_user on chat_sessions(user_id, updated_at desc);
create index idx_chat_history_session on chat_history(session_id, timestamp asc);

-- ========== RLS POLICIES ==========

alter table chat_sessions enable row level security;

create policy "Users can view own sessions"
  on chat_sessions for select
  using (auth.uid() = user_id);

create policy "Users can create own sessions"
  on chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on chat_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on chat_sessions for delete
  using (auth.uid() = user_id);

-- ========== AUTO-UPDATE updated_at ==========

create or replace function update_session_timestamp()
returns trigger as $$
begin
  update chat_sessions set updated_at = now() where id = new.session_id;
  return new;
end;
$$ language plpgsql;

create trigger on_chat_message_added
  after insert on chat_history
  for each row
  execute function update_session_timestamp();
