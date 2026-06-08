-- 取消周期筛选：将唯一约束从 period_id 维度迁移为 tenant 维度
-- 执行前请确保已备份数据库

BEGIN;

-- 1) registrations 去重（保留每个 tenant 下最新记录）
WITH ranked_by_wechat AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, wechat_id ORDER BY created_at DESC, id DESC) AS rn
  FROM registrations
)
DELETE FROM registrations r
USING ranked_by_wechat d
WHERE r.id = d.id AND d.rn > 1;

WITH ranked_by_battletag AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, battle_tag ORDER BY created_at DESC, id DESC) AS rn
  FROM registrations
)
DELETE FROM registrations r
USING ranked_by_battletag d
WHERE r.id = d.id AND d.rn > 1;

-- 2) announcements 去重（保留每个 tenant 下最新记录）
WITH ranked_ann AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at DESC, id DESC) AS rn
  FROM announcements
)
DELETE FROM announcements a
USING ranked_ann d
WHERE a.id = d.id AND d.rn > 1;

-- 3) DROP 旧的 period 维度约束（使用 IF EXISTS 兼容不同初始化脚本）
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_battle_tag_period_id_tenant_id_key;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_wechat_id_period_id_tenant_id_key;
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_period_id_tenant_id_key;
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_period_id_tenant_id_key1;

-- 4) 新增 tenant 维度唯一约束
ALTER TABLE registrations ADD CONSTRAINT registrations_battle_tag_tenant_id_key UNIQUE (battle_tag, tenant_id);
ALTER TABLE registrations ADD CONSTRAINT registrations_wechat_id_tenant_id_key UNIQUE (wechat_id, tenant_id);
ALTER TABLE announcements ADD CONSTRAINT announcements_tenant_id_key UNIQUE (tenant_id);

-- 5) period_id 保留但设定默认值，避免后续写入继续引入周期语义
ALTER TABLE registrations ALTER COLUMN period_id SET DEFAULT 'global';
ALTER TABLE teams ALTER COLUMN period_id SET DEFAULT 'global';
ALTER TABLE matches ALTER COLUMN period_id SET DEFAULT 'global';
ALTER TABLE announcements ALTER COLUMN period_id SET DEFAULT 'global';

COMMIT;

