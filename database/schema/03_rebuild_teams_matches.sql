BEGIN;

-- 强制删除旧表（注意顺序，matches 依赖 teams）
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS teams;

-- 重新创建具有最新完整字段的分队表 (teams)
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  period_id VARCHAR(50) NOT NULL,
  group_id VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 重新创建具有最新完整字段的赛程表 (matches)
CREATE TABLE matches (
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

COMMIT;
