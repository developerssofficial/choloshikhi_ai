-- ========== TABLES ==========

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('gemini', 'mimo')),
  key_value text not null,
  status text not null default 'active' check (status in ('active', 'rate_limited')),
  last_used_at timestamptz
);

create table chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  message text not null,
  response text not null,
  timestamp timestamptz default now() not null
);

create table user_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  usage_date date default current_date not null,
  message_count int default 0 not null,
  unique(user_id, usage_date)
);

-- ========== INDEX ==========

create index idx_chat_history_user on chat_history(user_id, timestamp desc);
create index idx_user_usage_date on user_usage(user_id, usage_date);

-- ========== RPC: increment_usage ==========

create or replace function increment_usage(p_user_id uuid, p_date date)
returns void as $$
begin
  insert into user_usage (user_id, usage_date, message_count)
  values (p_user_id, p_date, 1)
  on conflict (user_id, usage_date)
  do update set message_count = user_usage.message_count + 1;
end;
$$ language plpgsql;

-- ========== RLS POLICIES ==========

alter table chat_history enable row level security;
alter table user_usage enable row level security;

create policy "Users can view own chat history"
  on chat_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat history"
  on chat_history for insert
  with check (auth.uid() = user_id);

create policy "Users can view own usage"
  on user_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own usage"
  on user_usage for insert
  with check (auth.uid() = user_id);
