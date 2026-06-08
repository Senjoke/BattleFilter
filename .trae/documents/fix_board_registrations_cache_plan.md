# 赛事看板“已报名选手”为空的修复计划

## 1. 现状分析与问题定位
- **问题现象**：在赛事看板页面，已报名选手区域数据为空，但接口请求成功（返回 200）。
- **问题根源**：
  在 `backend/src/services/board.service.ts` 中，获取“已报名选手”时，使用了 Redis 缓存，缓存键为 `board:registrations:${tenantId}:${periodId}`，有效期为 1 小时。
  然而，在 `backend/src/routes/registration.ts` 中，当：
  1. 用户成功提交新的报名 (`POST /registrations`)
  2. 管理员删除单条报名 (`DELETE /admin/registrations/:id`)
  3. 管理员清空本周报名 (`DELETE /admin/registrations/clear`)
  这三个涉及数据变动的操作发生时，**均遗漏了清除对应 Redis 缓存的逻辑**。
  
  因此，如果在没有任何人报名时访问了看板，Redis 会将空数组 `[]` 缓存 1 小时。后续即使有新玩家报名成功，看板接口仍然会直接返回缓存中的 `[]`，导致数据看起来是空的。

## 2. 拟修改文件及具体方案

### 2.1 修改 `backend/src/routes/registration.ts`
在所有会改变报名表数据的操作后，补充缓存失效（删除缓存）的代码。

1. **`POST /registrations`** (用户报名)：
   在 `INSERT INTO registrations` 语句执行成功后，添加：
   `redis.del(\`board:registrations:${req.tenantId}:${periodId}\`).catch(() => {});`
   
2. **`DELETE /admin/registrations/:id`** (删除单条报名)：
   在 `DELETE FROM registrations WHERE id = ...` 成功后，添加：
   `redis.del(\`board:registrations:${req.tenantId}:${getPeriodId()}\`).catch(() => {});`
   
3. **`DELETE /admin/registrations/clear`** (清空报名)：
   在清空表数据成功后，添加：
   `redis.del(\`board:registrations:${req.tenantId}:${periodId}\`).catch(() => {});`

### 2.2 重新编译后端
修改完成后，需要在 `backend` 目录下执行 `npm run build` 重新编译 TypeScript 代码，使修复生效。

## 3. 验证步骤
1. 在 C 端或管理后台模拟添加一条新的报名记录。
2. 刷新 C 端的“赛事看板”页面。
3. 验证页面底部的“已报名选手”区域能够立刻展示出刚刚报名的玩家战网 ID，证明缓存失效机制已正常工作。