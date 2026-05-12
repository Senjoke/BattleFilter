-- 平滑升级脚本：增加多租户支持及访问日志表

BEGIN;

-- 1. 为现有的 registrations 表增加 tenant_id
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_battle_tag_period_id_key;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_wechat_id_period_id_key;
ALTER TABLE registrations ADD CONSTRAINT registrations_battle_tag_period_id_tenant_id_key UNIQUE (battle_tag, period_id, tenant_id);
ALTER TABLE registrations ADD CONSTRAINT registrations_wechat_id_period_id_tenant_id_key UNIQUE (wechat_id, period_id, tenant_id);

-- 2. 为 teams 表增加 tenant_id
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL;

-- 3. 为 matches 表增加 tenant_id
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL;

-- 4. 为 announcements 表增加 tenant_id
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL;
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_period_id_key;
ALTER TABLE announcements ADD CONSTRAINT announcements_period_id_tenant_id_key UNIQUE (period_id, tenant_id);

-- 5. 创建访问日志表 (用于系统指标统计)
CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL DEFAULT 'default',
  path VARCHAR(255) NOT NULL,
  ip VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;