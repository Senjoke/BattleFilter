-- Add auction team-building tables.
-- Run this on an existing database initialized before 00_ultimate_init_v3.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS auction_sessions (
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

CREATE TABLE IF NOT EXISTS auction_teams (
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

CREATE TABLE IF NOT EXISTS auction_players (
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

CREATE TABLE IF NOT EXISTS auction_bids (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    session_id INTEGER NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES auction_teams(id) ON DELETE CASCADE,
    player_registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    bid_amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auction_teams_session ON auction_teams(session_id);
CREATE INDEX IF NOT EXISTS idx_auction_players_session_status ON auction_players(session_id, status);
CREATE INDEX IF NOT EXISTS idx_auction_bids_session_player ON auction_bids(session_id, player_registration_id);

COMMIT;
