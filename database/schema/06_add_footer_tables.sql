-- 新增页脚信息栏与打赏管理相关表结构

BEGIN;

-- 1. 打赏人员表
CREATE TABLE IF NOT EXISTS donators (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    name VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 运营团队表
CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 管理员打赏联系方式表
CREATE TABLE IF NOT EXISTS admin_contacts (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) DEFAULT 'default' NOT NULL,
    contact_type VARCHAR(20) NOT NULL, -- qq, wechat, email
    contact_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;