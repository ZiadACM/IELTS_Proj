-- Ticket 04: guest sessions (Better Auth tables), invite codes and learner settings.

-- Better Auth 1.7.15 core tables plus the anonymous plugin's "isAnonymous" column, as produced by its own migration
-- compiler (better-auth/db/migration, compileMigrations). Column names are Better Auth's; do not rename them.
-- "ipAddress" and "userAgent" stay empty: IP tracking is off and only the cookie header reaches Better Auth (CS 2.6).
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "isAnonymous" boolean);
create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);
create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);
create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);
create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");

-- Only a hash of each code is stored, so a database read does not hand out unused codes. A code is redeemed once.
create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash bytea not null unique,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by text references "user" ("id") on delete set null,
  adult_confirmed boolean not null default false, -- the 18+ confirmation (D12), stored with the redemption
  check (redeemed_at is null or adult_confirmed)
);

create table learner_settings (
  user_id text primary key references "user" ("id") on delete cascade,
  interface_language text not null default 'ar' check (interface_language in ('ar', 'en')),
  target_band text check (target_band in ('5.5', '6.0', '6.5', '7.0+')),
  updated_at timestamptz not null default now()
);
