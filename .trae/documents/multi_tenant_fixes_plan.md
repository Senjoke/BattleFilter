# 多租户报名通道与登录问题修复计划

## 1. 现状分析与问题定位

### 1.1 报名通道共用问题 (Issue 1)
- **现状**：目前后端的报名通道状态（`registrationStatusMap`）存储在 Node.js 进程的内存对象中。
- **问题根源**：
  1. 内存存储在后端服务重启时会丢失状态。
  2. 如果后端使用了多进程模式（如 PM2 Cluster），内存对象在不同进程间不共享，会导致状态不可预测。
  3. 这种机制在遇到并发或前端传参问题时容错率极低。
- **解决方案**：将报名通道的状态重构为**基于 Redis 的持久化存储**。利用 Redis 的 `registration:status:{tenantId}` 键值对进行存取，既能保证多租户的绝对隔离，又能确保状态在服务重启和多进程间的持久一致性。

### 1.2 多社区管理员密码登录失败 (Issue 2)
- **现状**：后端 `auth.ts` 中已经实现了通过 `ADMIN_PASSWORDS` 环境变量解析 JSON 键值对的逻辑。
- **问题根源**：
  1. 当前 `backend/.env` 中并未配置您实际使用的租户 ID（`ameili` 和 `ameili1`），只配置了 `community_a` 等测试数据。这导致您的社区在登录时匹配不到专属密码，系统直接回退使用了 `default` 的默认密码，导致您用自己的密码无法登录。
  2. `JSON.parse` 对格式要求极其严格（必须使用双引号 `"`）。如果手动修改 `.env` 时使用了单引号（`'`），会导致解析失败，系统会将其视为空对象 `{}`，进而触发登录报错。
- **解决方案**：
  1. 在 `auth.ts` 中增加严格的 JSON 解析错误拦截与前端提示。当格式配错时，直接向前端返回“管理员密码配置格式错误，必须为合法的 JSON 字符串”，避免静默失败导致难以排查。
  2. 帮您修正 `backend/.env` 配置，加入 `ameili` 和 `ameili1` 的专属键值对。

## 2. 拟修改文件及具体方案

### 2.1 重构 `backend/src/routes/registration.ts`
- 移除顶层的内存变量 `registrationStatusMap`。
- 引入 `redis` 实例。
- **GET /registrations/status**：从 Redis 异步读取 `registration:status:${tenantId}`，若不存在则默认为开启。
- **POST /admin/registrations/status**：将管理员设置的状态持久化写入 Redis。
- **POST /registrations**：在允许用户提交报名前，增加从 Redis 读取状态的拦截逻辑。

### 2.2 增强 `backend/src/routes/auth.ts`
- 在 `JSON.parse(adminPasswordsStr)` 捕获异常的 `catch` 块中，阻断请求并返回状态码 `500` 和具体的报错提示，帮助以后在修改环境变量时能够立刻发现语法错误。

### 2.3 更新配置与编译
- 更新 `backend/.env`，将 `ADMIN_PASSWORDS` 替换为包含您两个社区的合法 JSON 字符串。
- 重新编译后端代码并重启服务，使修改生效。

## 3. 验证步骤
1. 使用 `ameili1` 对应的前端，登录后台并关闭报名通道。
2. 访问 `ameili` 对应的前端，确认其报名通道依然保持开启，证明多租户隔离完全生效。
3. 使用 `ameili` 和 `ameili1` 分别配合各自的密码尝试登录，验证 JSON 键值对密码匹配成功。
