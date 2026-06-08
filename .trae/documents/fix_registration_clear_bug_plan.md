# 取消周期功能改造计划

## Summary

本次改造目标是取消系统“按周期（period\_id）自动切换展示数据”的行为：报名信息、分队、赛程、公告、赛事看板不再仅查询当前周期数据；历史数据只有在管理员手动清理/删除后才不再显示。

用户已确认：取消周期后不允许同一社区内出现同一玩家（battle\_tag / wechat\_id）的多条历史报名记录（需要管理员清理后才能再次报名）。

## Current State Analysis

### 1) 周期的现有实现方式

* 后端通过 `getPeriodId()` 计算形如 `YYYY-Wxx` 的周期字符串，并在写入与查询时以 `period_id` 作为隔离维度。

  * [period.ts](file:///e:/BattleFilter/backend/src/utils/period.ts)

  * [registration.ts:getPeriodId](file:///e:/BattleFilter/backend/src/routes/registration.ts#L40-L47)

* 现有的看板/管理端/服务层在 SQL 中普遍使用 `WHERE period_id = $1` 来筛选“当前周期”数据，导致跨周后历史数据不显示。

### 2) 涉及按 period\_id 过滤的核心模块

* 报名：查询、查重、清空等（[registration.ts](file:///e:/BattleFilter/backend/src/routes/registration.ts)）

* 分队：创建/读取/自动填充涉及报名与队伍的 period 过滤（[teams.ts](file:///e:/BattleFilter/backend/src/routes/teams.ts)）

* 赛程：生成/清空/看板查询涉及 period 过滤（[matches.ts](file:///e:/BattleFilter/backend/src/routes/matches.ts)、[board.service.ts](file:///e:/BattleFilter/backend/src/services/board.service.ts)）

* 公告：读取/保存基于 period 的“当期公告”（[announcements.service.ts](file:///e:/BattleFilter/backend/src/services/announcements.service.ts)）

* 缓存：看板缓存 key 维度包含 `:${periodId}`（[board.service.ts](file:///e:/BattleFilter/backend/src/services/board.service.ts) 等）

### 3) 数据库约束现状（与取消周期冲突点）

* registrations 存在：

  * `UNIQUE(battle_tag, period_id, tenant_id)`

  * `UNIQUE(wechat_id, period_id, tenant_id)`
    见 [00\_ultimate\_init.sql](file:///e:/BattleFilter/database/schema/00_ultimate_init.sql#L13-L28)

* announcements 存在 `UNIQUE(period_id, tenant_id)`，会导致“每周期一条公告”的语义。

## Proposed Changes

### A. 后端：取消所有“仅当前周期”的查询过滤

1. 看板服务层（读）

* 修改 [board.service.ts](file:///e:/BattleFilter/backend/src/services/board.service.ts)：

  * `getTeams/getMatches/getRegistrations` 的 SQL 去掉 `period_id = ...` 条件，仅按 `tenant_id` 查询。

  * 将缓存 key 从 `board:*:${tenantId}:${periodId}` 调整为 `board:*:${tenantId}`（去掉 period 维度）。

  * 兼容策略：部署后新版本只读写新 key；旧 key 过期后自然失效（无需额外清理）。

1. 报名路由（写/删/清空/读）

* 修改 [registration.ts](file:///e:/BattleFilter/backend/src/routes/registration.ts)：

  * 报名查重逻辑去掉 `period_id` 条件：同一社区内同一 battle\_tag/wechat\_id 只能存在一条记录。

  * 管理端报名列表查询去掉 `period_id` 条件（展示该社区全部报名）。

  * 清空报名接口从“清空当前周期”改为“清空该社区全部报名”：`DELETE FROM registrations WHERE tenant_id = $1`。

  * 缓存失效逻辑同步改为删除新 key：`board:registrations:${tenantId}`。

  * 插入 registrations 时仍需写入 `period_id`（字段 NOT NULL），统一写死为固定值（例如 `global`），避免继续引入周期含义。

1. 分队路由（写/读/自动填充）

* 修改 [teams.ts](file:///e:/BattleFilter/backend/src/routes/teams.ts)：

  * 所有对 teams/registrations 的查询去掉 `period_id` 过滤，仅按 tenant 查询。

  * 创建队伍插入时仍需写入 `period_id`（字段 NOT NULL），统一写死为固定值（例如 `global`）。

  * 队伍相关缓存失效改为删除新 key：`board:teams:${tenantId}`。

1. 赛程路由（生成/清空/更新/记分）

* 修改 [matches.ts](file:///e:/BattleFilter/backend/src/routes/matches.ts)：

  * 生成赛程时读取 teams 去掉 `period_id` 过滤，仅按 tenant + group\_id 判断。

  * 清空赛程从“清空当前周期”改为“清空该社区全部赛程”：`DELETE FROM matches WHERE tenant_id = $1`。

  * 插入 matches 时仍需写入 `period_id`（字段 NOT NULL），统一写死为固定值（例如 `global`）。

  * 赛程缓存失效改为删除新 key：`board:matches:${tenantId}`。

1. 公告服务（读/写）

* 修改 [announcements.service.ts](file:///e:/BattleFilter/backend/src/services/announcements.service.ts)：

  * `getAnnouncement` 去掉 `period_id` 条件：改为按 tenant 查询最新一条（`ORDER BY created_at DESC LIMIT 1`），确保公告不会因跨周消失。

  * `saveAnnouncement` 改为按 tenant 进行“单条公告覆盖式保存”（同一 tenant 仅保留一条公告记录：存在则 UPDATE，不存在则 INSERT）。

  * 公告缓存 key 从 `announcements:${tenantId}:${periodId}` 改为 `announcements:${tenantId}`。

### B. 数据库：调整唯一约束以匹配“无周期 + 需手动清理”

目标：同一 tenant 下 battle\_tag/wechat\_id 只能存在一条报名记录（清理后才能再次报名）。

1. 新增迁移脚本（建议新增文件而非修改历史脚本）

* 新增 `database/schema/05_remove_period_uniques.sql`（或同等命名）：

  * registrations：

    * DROP 旧的 period 相关 UNIQUE 约束（使用 `DROP CONSTRAINT IF EXISTS`）

    * 新增：

      * `UNIQUE(battle_tag, tenant_id)`

      * `UNIQUE(wechat_id, tenant_id)`

  * announcements：

    * DROP `UNIQUE(period_id, tenant_id)`

    * 新增 `UNIQUE(tenant_id)`

  * 可选：为 `period_id` 增加默认值 `DEFAULT 'global'`（保证未来插入更稳健）

1. 迁移前的数据清理（必须）
   由于历史周期可能导致同一 battle\_tag 在不同 period 下有多条记录；直接加新唯一约束会失败。

* 在迁移脚本中先执行去重：

  * registrations：按 `(tenant_id, battle_tag)` 与 `(tenant_id, wechat_id)` 去重，仅保留 `created_at` 最新的一条，删除其余记录。

  * 删除策略需谨慎，避免误删；以 `created_at` 作为“最新”判定依据。

1. 修改初始化00脚本，做到初始化即可适配后端，无需挨个执行升级脚本。

### C. 前端：无需改动交互，仅验证展示结果

* [BoardView.vue](file:///e:/BattleFilter/frontend/src/views/BoardView.vue) 继续调用 `/board/*` 接口即可，后端返回将不再受周期影响。

* [AdminView.vue](file:///e:/BattleFilter/frontend/src/views/AdminView.vue) 的“清空报名/清空赛程”会变为清空该社区全部数据（行为更符合“临时活动”手动重置）。

## Assumptions & Decisions

* 周期字段 `period_id` 暂不从数据库移除（避免大规模表结构迁移与历史数据改写），但不再参与业务含义与筛选；写入统一使用固定值（如 `global`）。

* 取消周期后，报名记录不允许出现同一社区内的重复 battle\_tag / wechat\_id；若需要再次报名，必须由管理员删除/清空。

* 缓存 key 去掉 period 维度后，旧缓存 key 不主动清理，依赖其自然过期即可。

## Verification Steps

1. 数据库验证

* 执行迁移脚本后，确认 registrations/announcements 新唯一约束已生效（可通过插入重复 battle\_tag 验证会失败）。

1. 功能验证（同一 tenant）

* C 端连续报名两次同一 battle\_tag：

  * 第一次成功；第二次应返回“已报名/重复提交”类错误（后端查重触发）。

* 管理端清空报名后再次报名：

  * 清空成功；再次报名应成功。

1. 看板/公告验证

* 发布公告后跨周/跨天刷新看板：公告仍显示最新一条，不会因为周期变化消失。

* 看板“已报名选手/队伍/赛程”刷新：展示与数据库一致，不再受 period 影响。

