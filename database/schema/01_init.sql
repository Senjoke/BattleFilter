-- 01_init.sql
-- 包含所有核心业务表及其完整字段，支持重复执行（使用 IF NOT EXISTS）

BEGIN;

-- 1. 报名表
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  battle_tag VARCHAR(255) NOT NULL,
  roles JSONB NOT NULL,
  primary_role VARCHAR(50),
  secondary_roles JSONB,
  period_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(battle_tag, period_id)
);

-- 2. 玩家战绩快照表
CREATE TABLE IF NOT EXISTS player_stats (
  id SERIAL PRIMARY KEY,
  battle_tag VARCHAR(255) NOT NULL,
  stats_data JSONB NOT NULL,
  score NUMERIC(5,2),
  snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(battle_tag)
);

-- 3. 分队表 (teams)
-- 包含最新字段 group_id 及 members 默认值
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  period_id VARCHAR(50) NOT NULL,
  group_id VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 赛程表 (matches)
-- 包含最新字段 match_order, score1, score2
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  period_id VARCHAR(50) NOT NULL,
  team1_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  team2_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  match_order INTEGER DEFAULT 0,
  score1 INTEGER,
  score2 INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 赛事公告表
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  period_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (period_id)
);

COMMIT;
