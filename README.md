# SonarFC App

SonarFC 是一个围绕“赛前状态情报”构建的足球产品原型实现，当前版本基于 Next.js App Router 和 mock 数据，覆盖：

- Match Feed 首页
- Match Detail 比赛详情页
- Player Workload 球员负荷页
- World Cup Hub 世界杯中心
- 我的 / 设置页
- 深色 / 浅色主题
- 中文 / 英文界面切换

## 本地运行

1. 安装 Node.js 20+
2. 安装依赖

```bash
npm install
```

3. 如果要接 Supabase，先复制环境变量模板

```bash
cp .env.example .env.local
```

然后把 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 填进去。当前偏好同步层默认会尝试匿名登录，如果你不想启用匿名登录，可以把 `NEXT_PUBLIC_SUPABASE_USE_ANON_AUTH=false`。

4. 在 Supabase SQL Editor 或 migration 流程中执行：

`supabase/migrations/0001_user_preferences.sql`

这会创建 `user_preferences` 表、RLS 策略和注册后自动建档触发器。

5. 启动开发环境

```bash
npm run dev:fresh
```

6. 打开 [http://localhost:3000](http://localhost:3000)

## 稳定预览流程

为了避免 Next.js 开发模式热更新导致的 chunk 丢失报错，后续建议把“开发”和“给别人看”拆开：

```bash
npm run verify
npm run review
```

- `npm run verify`：清缓存 + 类型检查 + production build
- `npm run review`：重新校验后，用 `next start` 在 `3001` 启动稳定预览

给别人看页面时，优先发：

- [http://localhost:3001](http://localhost:3001)

完整流程见 [docs/DEVELOPMENT-WORKFLOW.md](/Users/auston/.codex/worktrees/47c6/SonarFC/docs/DEVELOPMENT-WORKFLOW.md)。

## 目录结构

- `app/`：Next.js 页面和布局
- `components/`：页面组件、Provider 和 UI 组件
- `lib/`：mock 数据、类型和业务 helper
- `docs/`：PRD、技术设计、UI 设计和原型参考

## 当前实现说明

- 这一版以前端 MVP 为主，数据来自仓库内 mock 数据
- 主题、语言、关注球队和通知偏好会保存在浏览器本地
- 配好 Supabase 后，偏好层会自动切到 `user_preferences` 表同步
- 比赛、球队、新闻等主体内容目前仍然来自 mock 数据
- 还没有接入 Cloudflare Workers 或真实采集链路

后续可以在现有页面基础上继续接入真实数据和认证体系。
