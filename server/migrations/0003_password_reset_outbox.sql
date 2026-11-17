-- Ticket 05: password-reset links wait here until the owner sends them by hand (no email provider yet).
-- Rows are deleted once the link has expired (one hour), so account emails do not pile up (CS 2.6).
create table password_reset_outbox (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  link text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index password_reset_outbox_email_idx on password_reset_outbox (email);
