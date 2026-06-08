# 新增页脚信息栏与打赏管理功能计划

## 1. 现状分析

当前项目前端包含用户端（报名、看板）和管理员端。用户端缺少统一的 Footer，且没有鸣谢名单、运营团队展示以及打赏通道。管理员端缺乏对应数据的管理界面。此外，管理员的报名列表和分队页面的选手池缺乏根据游戏ID和微信名称的模糊查询功能。后端数据库目前没有存储这些信息的表。

## 2. 改造方案 (Proposed Changes)

### 2.1 数据库结构新增

创建新的 SQL 迁移文件 `database/schema/06_add_footer_tables.sql`，包含以下三张表：

* `donators`: 打赏人员（id, tenant\_id, name, amount, created\_at）

* `operators`: 运营团队（id, tenant\_id, name, created\_at）

* `admin_contacts`: 管理员打赏联系方式（id, tenant\_id, contact\_type, contact\_value, created\_at）

并且创建新的SQL初始化文件`database/schema/00_ultimate_init_v2.sql`

新的SQL初始化文件根据原有的`00_ultimate_init.sql`生成，并加上新表。

### 2.2 后端接口新增

新建 `backend/src/routes/footer.ts`：

* 提供公共的 `GET /api/footer` 接口，返回降序排列后的 `donators`、`operators` 和 `admin_contacts` 数据。

* 提供管理员增删改 `POST/PUT/DELETE` 接口用于管理这三项数据。
  在 `backend/src/app.ts` 中注册 `/api/footer` 和 `/api/admin/footer` 路由。

### 2.3 提取并改造名片动效组件

将 `e:\BattleFilter\文档\名片动效\SponsorFooter.vue` 提取并迁移到 `frontend/src/components/SponsorFooter.vue`。

* 修改其为接受 `donators`, `operators`, `adminContacts` 等 props 的通用组件。

* 移除原页面的全屏背景限制，使其可以自然嵌入在页面底部。

* 实现打赏联系通道模块，固定显示作者 QQ，并根据 `adminContacts` 渲染管理员的联系方式。

* 前三名打赏者应用原动效的 Top1-Top3 样式，第四名及以后应用普通样式。所有运营团队应用运营者特效。

### 2.4 用户端页面接入

在 `frontend/src/views/RegistrationView.vue` 和 `frontend/src/views/BoardView.vue` 中引入 `<SponsorFooter />`，并在 `onMounted` 时调用 `/api/footer` 接口获取数据并传入组件。

### 2.5 管理员后台新增打赏管理菜单与页面

在 `frontend/src/views/AdminView.vue` 中：

* 左侧导航栏增加“打赏管理”（使用 Gift 图标）。

* 对应的内容区域增加打赏人员（名称、金额）、运营团队（名称）和联系方式（类型、值）的增删改查表格及表单逻辑。

* 联系方式增加上限 5 个的校验。

### 2.6 管理员报名信息模糊查询优化

在 `AdminView.vue` 中：

* “报名大厅”模块增加 `searchRegistrationText` 搜索框，更新 `filteredPlayers` 的计算属性，实现对 `gameId` 和 `wechatId` 的大小写不敏感模糊匹配。

* “分队管理”模块未分配选手池增加 `searchPlayerPoolText` 搜索框，同步更新 `filteredPlayerPool` 计算属性。

## 3. 假设与决策

* **决策**：模糊查询采用纯前端实现，利用 Vue 的 `computed` 过滤已加载的列表数据，不额外增加后端查询接口，保证响应速度且符合要求。

* **决策**：名片动效组件中的原生 CSS 动画与页面响应式设计完美保留，通过 `flex-wrap` 保证在移动端下的自适应换行。

* **假设**：数据库执行需用户手动将 `06_add_footer_tables.sql` 导入数据库，会在计划交付时提示用户。

## 4. 验证步骤

1. 确认数据库表结构是否创建成功。
2. 登录管理员后台，检查能否添加打赏人员、运营人员和打赏联系方式，测试数量限制。
3. 检查后台报名大厅和分队管理的模糊查询是否生效。
4. 前往报名页和看板页，检查页面底部是否正确渲染名片动效，且前三名打赏人员显示特殊动效。
5. 检查打赏金额是否被正确隐藏，只用于排序。

