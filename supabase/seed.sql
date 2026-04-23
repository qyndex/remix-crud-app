-- Seed data for development
-- Run after applying migrations and creating test users

-- Insert sample profiles (replace UUIDs with real auth.users IDs in your environment)
-- These are illustrative — the handle_new_user trigger creates profiles automatically on signup.

-- Sample tasks (no auth required — will be owned by first signed-in user in dev)
-- These require profiles to exist first.

-- To seed quickly in Supabase Studio SQL editor:
-- 1. Sign up a user via the app (creates a profile automatically)
-- 2. Run the INSERT below with the user's actual UUID

/*
-- Example (replace <your-user-id> with the UUID from auth.users):
insert into profiles (id, email, full_name) values
  ('<your-user-id>', 'demo@example.com', 'Demo User')
on conflict (id) do nothing;

insert into tasks (title, description, status, priority, assignee_id) values
  ('Design system audit', 'Review all UI components for consistency.', 'done', 'high', '<your-user-id>'),
  ('API rate limiting', 'Implement token bucket algorithm for public API.', 'in_progress', 'high', '<your-user-id>'),
  ('Write onboarding docs', 'Document the new developer onboarding flow.', 'todo', 'medium', null),
  ('Add dark mode', 'Implement dark mode using Tailwind dark class strategy.', 'todo', 'low', null),
  ('Fix mobile nav', 'Navigation breaks on screens < 375px.', 'in_progress', 'medium', '<your-user-id>');
*/
