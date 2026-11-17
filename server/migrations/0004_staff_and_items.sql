-- Ticket 06: staff roles and items.

-- Staff roles (D8). One person may hold several; learners and guests hold none. Granted only by the owner script.
create table staff_roles (
  user_id text not null references "user" ("id") on delete cascade,
  role text not null check (role in ('content_author', 'content_reviewer', 'admin')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Items (content format v1). `content` is the item file as validated; the app, not the file, holds the status:
-- import always stores a draft, and only a content_reviewer publishes (CS 3.1). Re-importing replaces a draft only.
create table items (
  id uuid primary key default gen_random_uuid(),
  content_id text not null unique, -- the file's own "id"
  status text not null check (status in ('draft', 'published')),
  content jsonb not null,
  imported_by text references "user" ("id") on delete set null,
  imported_at timestamptz not null,
  published_by text references "user" ("id") on delete set null,
  published_at timestamptz,
  check ((status = 'published') = (published_at is not null))
);
