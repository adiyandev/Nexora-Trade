-- Opt-in display names for privacy-safe, snapshot-backed demo seasons.
-- Apply only to the dedicated development Neon branch.
CREATE TABLE IF NOT EXISTS leaderboard_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leaderboard_display_name_length CHECK (char_length(display_name) BETWEEN 3 AND 20)
);
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_display_name_ci_uq ON leaderboard_profiles (lower(display_name));
CREATE INDEX IF NOT EXISTS leaderboard_public_idx ON leaderboard_profiles(is_public, updated_at DESC);
