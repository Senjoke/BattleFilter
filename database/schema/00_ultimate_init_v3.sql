-- 终极版全量数据库初始化脚本 (V2，包含打赏模块)
-- 执行此脚本会清空现有数据并重新创建所有表，一步到位解决表结构或字段缺失问题

BEGIN;

-- 0. 强制删除所有旧表（注意依赖顺序：先删依赖表，再删主表）
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS auction_bids CASCADE;
DROP TABLE IF EXISTS auction_players CASCADE;
DROP TABLE IF EXISTS auction_teams CASCADE;
DROP TABLE IF EXISTS auction_sessions CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS player_stats CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS donators CASCADE;
DROP TABLE IF EXISTS operators CASCADE;
DROP TABLE IF EXISTS admin_contacts CASCADE;

-- 1. 报名表
CREATE TABLE registrations (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
  battle_tag VARCHAR(255) NOT NULL,
  wechat_id VARCHAR(255) NOT NULL,
  wechat_group VARCHAR(50) NOT NULL,
  primary_roles JSONB NOT NULL,
  secondary_roles JSONB,
  self_ranks JSONB,
  queried_ranks JSONB,
  period_id VARCHAR(50) NOT NULL DEFAULT 'global',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(battle_tag, tenant_id),
  UNIQUE(wechat_id, tenant_id)
);

-- 2. 玩家战绩快照表
CREATE TABLE player_stats (
  id SERIAL PRIMARY KEY,
  battle_tag VARCHAR(255) NOT NULL,
  stats_data JSONB NOT NULL,
  score NUMERIC(5,2),
  snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(battle_tag)
);

-- 3. 分队表 (teams)
-- 包含最新字段 group_id 及 members 默认值
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
  period_id VARCHAR(50) NOT NULL DEFAULT 'global',
  group_id VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 赛程表 (matches)
-- 包含最新字段 match_order, score1, score2
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
  period_id VARCHAR(50) NOT NULL DEFAULT 'global',
  team1_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  team2_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  match_order INTEGER DEFAULT 0,
  score1 INTEGER,
  score2 INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 赛事公告表
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
  title TEXT,
  content TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  period_id VARCHAR(50) NOT NULL DEFAULT 'global',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id)
);

-- 6. 访问日志表
CREATE TABLE access_logs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL DEFAULT 'default',
  path VARCHAR(255) NOT NULL,
  ip VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. 打赏人员表
CREATE TABLE donators (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    name VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. 运营团队表
CREATE TABLE operators (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. 管理员打赏联系方式表
CREATE TABLE admin_contacts (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    contact_type VARCHAR(20) NOT NULL, -- qq, wechat, email
    contact_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Auction sessions
CREATE TABLE auction_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL UNIQUE,
    status VARCHAR(30) DEFAULT 'setup' NOT NULL,
    team_count INTEGER DEFAULT 0 NOT NULL,
    initial_budget INTEGER DEFAULT 0 NOT NULL,
    anonymous_mode BOOLEAN DEFAULT FALSE NOT NULL,
    current_player_registration_id INTEGER REFERENCES registrations(id) ON DELETE SET NULL,
    current_highest_team_id INTEGER,
    current_highest_bid INTEGER DEFAULT 0 NOT NULL,
    last_action VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Auction teams
CREATE TABLE auction_teams (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    session_id INTEGER NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    captain_registration_id INTEGER REFERENCES registrations(id) ON DELETE SET NULL,
    captain_code VARCHAR(20) NOT NULL,
    budget_total INTEGER DEFAULT 0 NOT NULL,
    budget_remaining INTEGER DEFAULT 0 NOT NULL,
    locked_bid_amount INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, captain_registration_id),
    UNIQUE(tenant_id, captain_code)
);

-- 12. Auction players
CREATE TABLE auction_players (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    session_id INTEGER NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
    registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'pool' NOT NULL,
    team_id INTEGER REFERENCES auction_teams(id) ON DELETE SET NULL,
    sold_price INTEGER,
    pass_count INTEGER DEFAULT 0 NOT NULL,
    last_passed_at TIMESTAMP WITH TIME ZONE,
    assigned_type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, registration_id)
);

-- 13. Auction bids
CREATE TABLE auction_bids (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    session_id INTEGER NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES auction_teams(id) ON DELETE CASCADE,
    player_registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    bid_amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auction_teams_session ON auction_teams(session_id);
CREATE INDEX idx_auction_players_session_status ON auction_players(session_id, status);
CREATE INDEX idx_auction_bids_session_player ON auction_bids(session_id, player_registration_id);

COMMIT;
