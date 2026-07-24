-- Phase D: notification preferences.
-- Adds a master push toggle to user_config. The daily-checkin-push Edge
-- Function skips users with push_enabled = false. The presence of a row in
-- push_subscriptions is the device-level signal; this toggle lets a user
-- pause nudges without unsubscribing.

alter table user_config
  add column if not exists push_enabled boolean not null default true;
