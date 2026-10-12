-- Retention + premium + AI quota
create or replace function log_usage(events jsonb) returns void language plpgsql security definer set search_path=public as $$
declare d date := (now() at time zone 'utc')::date;
begin
  insert into usage_events(user_id,tool_id,at)
    select auth.uid(), e->>'tool', to_timestamp((e->>'at')::bigint/1000.0) from jsonb_array_elements(events) e limit 200;
  insert into ledger(user_id,delta,reason,ref) values(auth.uid(),2,'daily_visit',d::text) on conflict do nothing;
end $$;

-- Daily check-in: streak bonus 5..20 pts, once per UTC day
create function daily_checkin() returns jsonb language plpgsql security definer set search_path=public as $$
declare d date := (now() at time zone 'utc')::date; p profiles; ns int; b int;
begin
  select * into p from profiles where id=auth.uid() for update;
  if p.last_active = d then return jsonb_build_object('streak',p.streak,'bonus',0); end if;
  ns := case when p.last_active = d-1 then p.streak+1 else 1 end;
  b := least(4+ns, 20);
  update profiles set streak=ns,last_active=d where id=p.id;
  insert into ledger(user_id,delta,reason,ref) values(p.id,b,'checkin',d::text) on conflict do nothing;
  return jsonb_build_object('streak',ns,'bonus',b);
end $$;

create table ai_usage(user_id uuid references profiles(id) on delete cascade, day date, n int default 0, primary key(user_id,day));
alter table ai_usage enable row level security;
create function ai_quota(p_user uuid, p_limit int) returns boolean language plpgsql security definer set search_path=public as $$
declare c int;
begin
  insert into ai_usage(user_id,day,n) values(p_user,current_date,1)
    on conflict(user_id,day) do update set n=ai_usage.n+1 where ai_usage.n<p_limit returning n into c;
  return c is not null;
end $$;
revoke all on function ai_quota from public, anon, authenticated;

insert into tasks(title,description,reward) values
 ('Share a tool on WhatsApp','Share any tool link and submit a screenshot',10),
 ('Give feedback','Write 2 sentences about what to improve',15),
 ('Invite a friend','A friend signs up with your link (auto-credited 50 pts)',50);
