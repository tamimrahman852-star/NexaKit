-- NexaKit schema. Principle: the client NEVER writes points or payouts; all money-like state is server-controlled.
create extension if not exists pgcrypto;

create table profiles(
  id uuid primary key references auth.users on delete cascade,
  ref_code text unique not null default substr(encode(gen_random_bytes(6),'hex'),1,8),
  referred_by uuid references profiles(id),
  is_pro boolean not null default false,
  streak int not null default 0, last_active date,
  created_at timestamptz default now());

-- append-only ledger = source of truth for points; unique key makes credits idempotent
create table ledger(
  id bigserial primary key, user_id uuid not null references profiles(id),
  delta int not null, reason text not null, ref text, created_at timestamptz default now(),
  unique(user_id,reason,ref));
create view balances with (security_invoker=on) as select user_id, sum(delta)::int as points from ledger group by user_id;

create table tasks(id serial primary key, title text, description text, reward int not null check(reward>0), active boolean default true);
create table task_completions(id bigserial primary key, user_id uuid references profiles(id), task_id int references tasks(id),
  status text default 'pending' check(status in('pending','approved','rejected')), proof text, created_at timestamptz default now(), unique(user_id,task_id));

create table withdrawals(
  id bigserial primary key, user_id uuid not null references profiles(id),
  channel text not null check(channel in('bKash','Nagad','Rocket','Binance Pay')),
  account text not null, points int not null check(points>0),
  status text not null default 'pending' check(status in('pending','paid','rejected')), created_at timestamptz default now());

create table snippets(id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade,
  tool_id text, title text, body text, updated_at timestamptz default now());      -- Pro cloud sync
create table usage_events(id bigserial primary key, user_id uuid references profiles(id), tool_id text, at timestamptz);

alter table profiles enable row level security; alter table ledger enable row level security; alter table tasks enable row level security;
alter table task_completions enable row level security; alter table withdrawals enable row level security;
alter table snippets enable row level security; alter table usage_events enable row level security;
create policy own_profile_read on profiles for select using (id=auth.uid());
create policy own_ledger_read on ledger for select using (user_id=auth.uid());
create policy tasks_read on tasks for select using (active);
create policy own_tc_read on task_completions for select using (user_id=auth.uid());
create policy own_tc_insert on task_completions for insert with check (user_id=auth.uid() and status='pending');
create policy own_wd_read on withdrawals for select using (user_id=auth.uid());
create policy own_snip_all on snippets for all using (user_id=auth.uid() and (select is_pro from profiles where id=auth.uid())) with check (user_id=auth.uid());
-- No client write policies on ledger/withdrawals/profiles => is_pro, points and payouts can't be forged from the browser.

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare r uuid;
begin
  select id into r from profiles where ref_code = new.raw_user_meta_data->>'ref';
  insert into profiles(id,referred_by) values(new.id, r);
  if r is not null and r<>new.id then insert into ledger(user_id,delta,reason,ref) values(r,50,'referral',new.id::text); end if;
  return new;
end $$;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();

create function log_usage(events jsonb) returns void language plpgsql security definer set search_path=public as $$
declare d date := (now() at time zone 'utc')::date;
begin
  insert into usage_events(user_id,tool_id,at)
    select auth.uid(), e->>'tool', to_timestamp((e->>'at')::bigint/1000.0) from jsonb_array_elements(events) e limit 200;
  update profiles set streak = case when last_active = d-1 then streak+1 when last_active = d then streak else 1 end, last_active = d where id=auth.uid();
  insert into ledger(user_id,delta,reason,ref) values(auth.uid(),2,'daily_visit',d::text) on conflict do nothing;  -- max 2 pts/day
end $$;

create function request_withdrawal(p_user uuid, p_channel text, p_account text, p_points int) returns bigint
language plpgsql security definer set search_path=public as $$
declare bal int; wid bigint;
begin
  perform 1 from profiles where id=p_user for update;           -- serialize per user (no double-spend)
  select coalesce(sum(delta),0) into bal from ledger where user_id=p_user;
  if p_points < 500 then raise exception 'Minimum is 500 points'; end if;
  if bal < p_points then raise exception 'Insufficient balance'; end if;
  insert into withdrawals(user_id,channel,account,points) values(p_user,p_channel,p_account,p_points) returning id into wid;
  insert into ledger(user_id,delta,reason,ref) values(p_user,-p_points,'withdrawal',wid::text);
  return wid;
end $$;
revoke all on function request_withdrawal from public, anon, authenticated;
