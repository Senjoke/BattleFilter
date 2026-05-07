# 守望先锋赛事自动组队系统 (BattleFilter) - 运行指南

本项目包含三个主要部分：前端（Vue 3 + Vite）、后端（Node.js + Express）和数据库（PostgreSQL）。以下是完整的配置与运行说明。

---

## 1. 数据库配置与运行

本项目依赖 PostgreSQL 数据库，已通过 Docker Compose 实现了“一键启动并自动建表”的功能。

### 1.1 配置文件位置
- Docker Compose 配置：`docker-compose.yml` (位于项目根目录)
- 初始化 SQL 建表脚本：`database/schema/01_init.sql`

### 1.2 核心配置参数
```yaml
# docker-compose.yml 中的数据库配置
POSTGRES_USER: admin
POSTGRES_PASSWORD: password
POSTGRES_DB: battlefilter
# 映射端口为 5433 (防止与本地默认 5432 冲突)
PORTS: 5433:5432
```

### 1.3 运行命令
请确保你的电脑已安装并启动了 **Docker Desktop**。
在项目根目录（`e:\BattleFilter`）下执行：
```bash
docker-compose up -d
```
*这会在后台启动数据库容器，并自动执行 `01_init.sql` 创建所有需要的业务表。*

---

## 2. 后端配置与运行

后端采用 Node.js + Express + TypeScript 构建，负责处理报名、分队逻辑与鉴权。

### 2.1 配置文件位置
- 环境变量配置：`backend/.env`
- 数据库连接代码：`backend/src/config/db.ts`

### 2.2 核心配置参数
在 `backend/.env` 中包含以下必要配置：
```env
# 后端服务运行的端口
PORT=3000
# 数据库连接字符串（对应 Docker 中配置的账号密码和 5433 端口）
DATABASE_URL=postgresql://admin:password@localhost:5433/battlefilter
# JWT 鉴权密钥
JWT_SECRET=battlefilter_super_secret_2026
```

### 2.3 运行命令
在终端中进入 `backend` 目录，执行以下命令：
```bash
cd backend
# 首次运行需要安装依赖
npm install
# 启动热重载开发服务器
npm run dev
```
*后端服务将成功运行在 `http://localhost:3000`。*

---

## 3. 前端配置与运行

前端采用 Vue 3 + TypeScript + Tailwind CSS 构建，负责提供用户界面与后台管理。

### 3.1 配置文件位置
- 环境变量配置：`frontend/.env`
- 接口请求封装（Axios）：`frontend/src/api/request.ts`

### 3.2 核心配置参数
在 `frontend/.env` 中包含以下配置，用于指向后端接口地址：
```env
# 后端 API 基础路径，必须带 /api 后缀
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3.3 运行命令
在终端中进入 `frontend` 目录，执行以下命令：
```bash
cd frontend
# 首次运行需要安装依赖
npm install
# 启动 Vite 开发服务器
npm run dev
```
*前端服务通常会运行在 `http://localhost:5173` 或 `5174`（具体看控制台输出）。*

---

## 4. 访问与测试指南

当你按照顺序成功启动了**数据库**、**后端**和**前端**后：

1. **C端玩家报名页**：
   - 访问地址：`http://localhost:5174/`
   - 测试方法：填入战网ID（如：玩家A#1234）和职责，点击确认报名。

2. **B端赛事管理后台**：
   - 访问地址：`http://localhost:5174/admin`
   - 登录账号：`admin`
   - 登录密码：`123456`
   - 测试方法：在“报名大厅”可查看刚才报名的玩家；在“分队管理”可添加队伍组，进行 1T 2C 2S 的自动职责填充及手动增删队员测试。

3. **C端赛事看板页**：
   - 访问地址：`http://localhost:5174/board`
   - 测试方法：在这里可以实时查看到管理员在后台发布的最新的队伍与赛程。