-- Ticket 07: attempts (harness contract "Attempt state"). Ticket 07 starts guided attempts and serves their audio;
-- answers and submit (08), support usage (11), deadlines (13) and scores fill the remaining columns later.
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete cascade,
  item_id uuid not null references items ("id"),
  mode text not null check (mode in ('guided', 'exam')),
  status text not null default 'open' check (status in ('open', 'submitted')),
  answers jsonb not null default '{}',
  replay_count integer not null default 0,
  hint_count integer not null default 0,
  deadline timestamptz,
  seen_before boolean not null,
  late boolean not null default false,
  score integer,
  started_at timestamptz not null,
  submitted_at timestamptz,
  check ((status = 'submitted') = (submitted_at is not null))
);

-- D10: at most one open attempt per user per item.
create unique index attempts_one_open_per_item on attempts (user_id, item_id) where status = 'open';
