BEGIN;

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  battle_tag VARCHAR(255) NOT NULL,
  roles JSONB NOT NULL,
  period_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (battle_tag, period_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  period_id VARCHAR(50) NOT NULL,
  group_id VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  period_id VARCHAR(50) NOT NULL,
  team1_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  team2_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  match_order INTEGER DEFAULT 0,
  score1 INTEGER,
  score2 INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  start_time TIMESTAMPTZ,
  period_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_id)
);

COMMIT;