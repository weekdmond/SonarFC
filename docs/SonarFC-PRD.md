# SonarFC 产品需求文档（PRD）

**版本**：v1.0  
**日期**：2026-04-06  
**作者**：Weekdmond  
**状态**：Draft

---

## 1. 产品概述

### 1.1 一句话定义

SonarFC 是一款足球赛前状态探测产品，通过可视化球队疲劳指数、阵容完整度、赛程压力和势头趋势，帮助球迷和 Fantasy/博彩用户在比赛开始前精准探测两支球队的真实状态。

### 1.2 产品背景

现有足球信息产品（FotMob、Sofascore、OneFootball 等）在赛前信息呈现上存在明显短板：

- **数据展现偏表格化**：历史交锋、联赛积分、球员数据均以表格呈现，缺乏直觉性
- **只看"过去"不看"现在"**：聚焦已发生的比赛结果和统计，对球队当前的身体和竞技状态几乎没有结构化呈现
- **疲劳维度完全缺失**：球员出场负荷、赛程密度、旅行距离等直接影响比赛结果的变量，没有任何产品做系统化建模和展示

### 1.3 核心洞察

球迷在赛前最想知道的不是"历史上谁赢得多"，而是**"今天这两支球队状态怎么样"**。疲劳、伤病、赛程压力、势头，这些因素叠加在一起，构成了比赛结果的隐性变量。SonarFC 把这些隐性变量显性化。

### 1.4 时机

2026 年 FIFA 世界杯将于 6-7 月在美国、加拿大和墨西哥举行。国家队球员经历完整俱乐部赛季后立即参加世界杯，疲劳度问题将被空前放大（赛季末高强度 + 洲际旅行 + 时差调整）。这是 SonarFC 的最佳市场验证窗口。

---

## 2. 目标用户

### 2.1 用户画像

**P0 - 深度球迷（核心用户）**

- 每周观看 3+ 场比赛
- 关注多个联赛和欧冠
- 赛前主动搜索阵容、伤病、赛程信息
- 会在社交媒体讨论赛前预测
- 痛点：信息分散在多个 App 和网站，需要自己拼凑"球队状态"的全貌

**P1 - Fantasy 玩家**

- 参与 FPL、Sorare 等 Fantasy 联赛
- 每周需要做球员选择和阵容决策
- 关心球员轮换风险、出场时间趋势
- 痛点：缺乏球员疲劳数据辅助选人决策

**P2 - 体育博彩用户**

- 赛前研究盘口和赔率
- 关注影响比赛结果的非技术因素
- 痛点：疲劳和赛程压力是博彩模型中难以量化的变量

### 2.2 用户场景

| 场景 | 用户行为 | SonarFC 价值 |
|------|---------|----------------|
| 周末赛前 | 球迷浏览今天有什么比赛 | 首页直接展示每场比赛的状态卡，一眼看到两队疲劳对比 |
| FPL 选人 | 玩家犹豫是否要上某个高负荷球员 | 球员疲劳值 + 轮换风险提示辅助决策 |
| 赛前讨论 | 球迷在群里讨论比赛预测 | 分享状态对比截图，增加讨论深度 |
| 世界杯小组赛 | 关注某球队两场比赛间的恢复情况 | 旅行距离 + 间隔天数 + 球员赛季累计负荷 |
| 博彩研究 | 用户查看盘口前做功课 | 疲劳指数和赛程密度提供额外决策维度 |

---

## 3. 覆盖范围

### 3.1 联赛与赛事（V1）

**俱乐部赛事**：
- 英超（Premier League）
- 西甲（La Liga）
- 意甲（Serie A）
- 德甲（Bundesliga）
- 法甲（Ligue 1）
- 欧冠（UEFA Champions League）
- 欧联（UEFA Europa League）

**国家队赛事**：
- 2026 FIFA 世界杯（预选赛 + 正赛）
- 欧国联（UEFA Nations League）
- 国际友谊赛

### 3.2 未来扩展（V2+）

- 英冠、荷甲、葡超等二级联赛
- 南美解放者杯
- 女足主要赛事

---

## 4. 核心功能模块

### 4.1 Module 1：Match Feed（比赛流）

**描述**：首页按时间排列即将进行的比赛，每场比赛以状态卡（Match Condition Card）形式展示。

**功能点**：

- 按日期分组展示即将进行的比赛（今天 / 明天 / 本周）
- 用户可按联赛筛选
- 用户可收藏关注的球队，优先展示相关比赛
- 每张卡片直接显示双方核心状态指标（疲劳指数、阵容可用率）的缩略对比
- 点击卡片进入 Match Detail 页面

**状态卡缩略信息**：
- 联赛 Logo + 轮次
- 比赛时间
- 双方队名 + 队徽
- 双方疲劳指数（能量条缩略版）
- 双方阵容可用率百分比
- 一句话 AI 摘要（可选）

### 4.2 Module 2：Match Detail（比赛详情页）

**描述**：单场比赛的完整状态对比页面，是产品的核心体验。

**子模块**：

#### 4.2.1 Fatigue Engine（疲劳引擎）

产品的核心算法差异化模块。为每支球队和关键球员计算疲劳指数。

**球队疲劳指数（Team Fatigue Index, TFI）**

输入变量及权重：

| 变量 | 说明 | 权重 |
|------|------|------|
| `match_density` | 过去 14 天比赛数 | 25% |
| `avg_player_minutes` | 首发 11 人平均出场分钟数（过去 14 天） | 25% |
| `rest_days` | 距上一场比赛的天数（越少越疲劳） | 20% |
| `travel_load` | 过去 14 天客场旅行总距离（km） | 15% |
| `extra_time_penalty` | 是否经历加时赛/点球大战 | 5% |
| `intl_duty_load` | 国家队征召球员比例 × 旅行距离修正 | 10% |

输出：0-100 分数（0 = 完全恢复，100 = 极度疲劳）

**球员疲劳指数（Player Fatigue Index, PFI）**

在 TFI 基础上增加个人维度：

| 变量 | 说明 |
|------|------|
| `total_minutes_14d` | 过去 14 天累计出场分钟数 |
| `total_minutes_season` | 赛季累计出场分钟数 |
| `age_modifier` | 30+ 岁球员恢复速度降低（每岁 +3%） |
| `injury_history` | 本赛季伤病记录（有伤病史的球员疲劳敏感度更高） |
| `position_load` | 位置负荷修正（中场跑动量 > 前锋 > 后卫 > 门将） |

输出：低 / 中 / 高 三级标签 + 具体分数

**可视化设计**：
- 球队疲劳：动画能量条，颜色分级（绿 ≤ 40，黄 41-65，红 > 65）
- 球员疲劳：列表卡片，左侧圆点颜色指示级别，右侧显示具体分钟数和年龄

#### 4.2.2 Squad Availability（阵容可用性）

**功能点**：

- 阵容完整度百分比（可用球员 / 一线队注册球员）
- 缺阵球员列表：区分伤病、停赛、国家队征召中
- 阵型图可视化：在 4-3-3 或其他阵型图上标注每个位置可用状态
  - 绿色：主力可用
  - 黄色：主力状态存疑 / 可能轮换
  - 红色：主力确认缺阵
  - 灰色：替补实力评估
- 伤病预计恢复时间（如有数据）

#### 4.2.3 Schedule Pressure（赛程压力）

**功能点**：

- 时间轴可视化：展示双方过去 14 天和未来 7 天的比赛分布
- 每个节点标注：对手、主客场、赛事类型（联赛/杯赛/欧战）
- 密度高亮：比赛间隔 < 3 天标红
- 对比模式：双方时间轴上下排列，直观对比赛程松紧

**赛程密度指标**：
- 过去 7 天比赛数
- 过去 14 天比赛数
- 过去 14 天旅行总距离
- 下一场比赛间隔天数

#### 4.2.4 Momentum Curve（势头曲线）

**功能点**：

- 近 5 场比赛结果以柱状图展示（胜 = 高柱绿色，平 = 中柱黄色，负 = 低柱红色）
- 每场标注对手和主客场
- 综合势头分数：基于比分差、xG 表现差、主客场加权
- 趋势箭头：上升 / 平稳 / 下滑

#### 4.2.5 AI Match Preview（AI 赛前分析）

**功能点**：

- 为每支球队生成一段 2-3 句的中文状态分析摘要
- 综合疲劳引擎、阵容、赛程、势头数据
- 突出最关键的 1-2 个状态因素
- 语气：简洁客观，像一位专业解说员的赛前分析
- 实现方式：基于结构化数据模板生成，后续可接入 LLM 增强

### 4.3 Module 3：Player Workload（球员负荷页）

**描述**：单个球员的赛季负荷追踪页面。

**功能点**：

- 赛季出场分钟数时间线（按比赛周排列的柱状图）
- 累计出场分钟数曲线
- 疲劳趋势：近 30 天的 PFI 变化曲线
- 轮换预测：基于负荷数据预测下一场是否可能被轮换
- 与同位置球员的负荷对比
- 伤病历史时间线

### 4.4 Module 4：World Cup Mode（世界杯模式）

**描述**：2026 世界杯专属功能。

**功能点**：

- 每支国家队球员的俱乐部赛季累计负荷看板
- 球员旅行轨迹：俱乐部城市 → 国家队集训地 → 世界杯赛区城市的旅行距离和时差
- 小组赛恢复分析：两场小组赛之间的间隔天数 + 城市间距离 + 时区变化
- 阵容深度评估：如果某位球员因疲劳下降，替补选项的实力差距

### 4.5 Module 5：用户系统

**功能点**：

- 注册/登录（邮箱 + Google OAuth）
- 关注球队（至多 10 支）
- 关注联赛
- 推送通知设置（赛前 2 小时推送状态报告）
- 深色/浅色主题切换
- 语言设置（V1 支持中文和英文）

---

## 5. 信息架构

```
SonarFC
├── 首页（Match Feed）
│   ├── 日期选择器（今天/明天/本周/自定义）
│   ├── 联赛筛选器
│   └── Match Condition Card × N
│       ├── 缩略状态对比
│       └── → 点击进入 Match Detail
├── Match Detail（比赛详情页）
│   ├── 比赛元信息（联赛、时间、场地）
│   ├── 双栏状态对比
│   │   ├── Fatigue Engine
│   │   ├── Squad Availability
│   │   ├── Schedule Pressure Timeline
│   │   ├── Momentum Curve
│   │   └── Key Player Workload Cards
│   └── AI Match Preview（弹窗）
├── Player Page（球员负荷页）
│   ├── 赛季出场时间线
│   ├── 疲劳趋势曲线
│   ├── 伤病历史
│   └── 轮换预测
├── World Cup Hub（世界杯中心）— 赛事期间
│   ├── 国家队负荷看板
│   ├── 旅行疲劳地图
│   └── 小组赛恢复分析
├── 我的
│   ├── 关注球队/联赛管理
│   ├── 推送通知设置
│   └── 账户设置
└── 设置
    ├── 语言（中文/英文）
    └── 主题（深色/浅色）
```

---

## 6. 数据架构

### 6.1 数据源

| 数据源 | 用途 | 获取方式 | 成本 |
|--------|------|----------|------|
| API-Football (api-football.com) | 赛程、出场时间、阵容、伤病、赛事信息 | REST API | 免费层 100 次/天，Pro $20/月起 |
| FBref (fbref.com) | 球员出场分钟数、高级统计（xG 等） | 网页爬取 | 免费 |
| Transfermarkt | 伤病记录、球员身价、转会信息 | 网页爬取 / 社区 API | 免费 |
| 城市坐标数据 | 计算旅行距离 | 静态数据集 | 免费 |
| FIFA 官方赛程 | 世界杯赛程、场地信息 | 公开资料 | 免费 |

### 6.2 数据模型

详见 7.4 节「数据库 Schema（Supabase PostgreSQL）」，核心实体关系如下：

```
leagues 1──N teams 1──N players
                │              │
                │              ├── appearances N──1 matches
                │              └── injuries
                │
                └── matches (home_team_id, away_team_id)
                        │
                        ├── fatigue_scores (team 级 + player 级)
                        └── ai_previews
```

**关键设计决策**：
- `fatigue_scores` 用 `entity_type` + `entity_id` 做多态关联，同时存储球队级和球员级疲劳数据
- `factors` 字段用 JSONB 存储各因子明细，便于前端展示分项数据而不需要额外查询
- 用户偏好通过 Supabase Auth 的 `auth.users` 关联，RLS 控制访问权限
- Pro 订阅通过 `user_preferences.is_pro` 控制，API 层据此决定返回 team 级还是 player 级疲劳数据

### 6.3 数据管线

```
[阿里云 ECS — 数据采集层] (47.84.140.167, CentOS 7)
  │
  │  crontab 调度，Python 脚本运行
  │
  ├── 05:30 UTC ── api_football_sync.py
  │     ├── 拉取当日及未来 7 天赛程 → Supabase: matches
  │     ├── 拉取已结束比赛的出场数据 → Supabase: appearances
  │     └── 拉取阵容和球员信息 → Supabase: players
  │
  ├── 05:45 UTC ── fbref_scraper.py
  │     └── 爬取球员出场分钟数（补全/校验） → Supabase: appearances
  │
  ├── 05:55 UTC ── transfermarkt_scraper.py
  │     └── 爬取伤病信息 → Supabase: injuries
  │
  └── 数据写入完成后，调用 Supabase Edge Function webhook 通知计算层
  
[Supabase Edge Functions — 计算层]
  │
  ├── calculate-tfi ── 球队疲劳指数
  │     └── 查询 appearances + matches → 加权计算 → 写入 fatigue_scores
  │
  ├── calculate-pfi ── 球员疲劳指数
  │     └── 查询 players + appearances + injuries → 计算 → 写入 fatigue_scores
  │
  └── generate-preview ── AI 赛前分析
        └── 读取 fatigue_scores + injuries → Anthropic API → 写入 ai_previews

[Cloudflare Workers Cron — 缓存层]
  │
  ├── 06:30 UTC ── cache-refresh Worker
  │     └── 查询 Supabase 即将进行的比赛数据 → 序列化 → 写入 Cloudflare KV
  │
  └── 赛前 2 小时 ── notification Worker（V2）
        └── 查询 user_preferences.followed_teams → 推送 Web Push
```

**为什么爬虫放 ECS**：
- 爬虫需要长时间运行（FBref/Transfermarkt 单次爬取可能 5-10 分钟），Cloudflare Workers 有 CPU 时间限制
- 反爬策略需要灵活处理（代理、重试、rate limiting），ECS 上 Python 生态更成熟
- 现有阿里云 ECS 已配置代理，可直连海外数据源
- 爬虫是离线任务，不面向用户，不需要边缘部署

**容错设计**：
- 每个爬虫脚本独立运行，失败不影响其他任务
- 爬虫失败时写入 error log，通过钉钉/邮件告警
- API-Football 请求失败时，从 Cloudflare KV 读取上次缓存的数据兜底
- Supabase Edge Functions 超时设为 25s，超时自动重试 1 次
- ECS 上部署 supervisor 保证爬虫进程稳定运行

---

## 7. 技术架构

### 7.1 技术栈

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 前端框架 | Next.js 14 + React + Tailwind CSS | SSR/SSG 支持 SEO，Tailwind 快速开发 |
| 部署平台 | Cloudflare Pages | 全球边缘网络，自动 CI/CD，免费层慷慨（无限请求），自带 CDN |
| 后端 API | Cloudflare Workers | 边缘计算，冷启动 < 5ms，与 Pages 同平台零延迟调用 |
| 数据采集（爬虫） | 阿里云 ECS + Python (requests/beautifulsoup/playwright) | 长时间运行、反爬处理、代理配置，现有服务器直接复用 |
| 定时调度（爬虫） | crontab (ECS) | 简单可靠，爬虫脚本按时触发 |
| 定时调度（缓存/通知） | Cloudflare Workers Cron Triggers | 轻量任务，免运维 |
| 数据库 | Supabase (PostgreSQL) | 关系型数据天然适合赛程/球员/出场记录的关联查询，内置 Auth + Realtime + Edge Functions |
| 计算层 | Supabase Edge Functions (Deno/TS) | TFI/PFI 计算靠近数据库执行，减少网络延迟 |
| 缓存 | Cloudflare KV | 全球边缘键值缓存，赛前数据高频读取场景理想，免费层 10 万次读/天 |
| 用户认证 | Supabase Auth | 内置邮箱 + Google/GitHub OAuth，JWT 自动管理，RLS 行级安全 |
| 文件存储 | Cloudflare R2 | 球队徽章、分享图片等静态资源 |
| 域名 + DNS | Cloudflare DNS | 与 Pages/Workers 同平台，SSL 自动配置 |
| 域名 | sonarfc.com | 待注册 |

### 7.2 为什么选 Supabase + Cloudflare

**Supabase 替代 MongoDB 的理由**：

- 赛程、球队、球员、出场记录之间是强关联关系，PostgreSQL 的 JOIN 查询比 MongoDB 的聚合管道更自然高效（如"查询某球队过去14天所有球员的出场分钟数"）
- 内置 Auth 省去自建用户系统的工作量
- Row Level Security (RLS) 可以控制 Pro 用户和免费用户的数据访问权限
- Realtime 订阅可用于未来的实时数据推送
- Edge Functions 可在靠近数据库的位置运行计算逻辑
- 免费层：500MB 数据库、5GB 带宽、50,000 MAU Auth

**Cloudflare 用于前端和 API 服务层的理由**：

- 全球边缘网络，面向海外用户（英文球迷）零延迟
- Pages + Workers 免运维，不需要管理服务器
- 免费层极为慷慨：Pages 无限请求、Workers 10 万次/天、KV 10 万次读/天
- 自带 DDoS 防护和 SSL
- CI/CD 与 GitHub 集成，push 即部署

**阿里云 ECS 保留用于数据采集（爬虫）的理由**：

- 现有服务器（47.84.140.167）已配置代理，可直连海外数据源
- 爬虫需要长时间运行（单次 5-10 分钟），不受 Workers CPU 限制约束
- Python 反爬生态成熟（requests、beautifulsoup4、playwright、fake-useragent）
- crontab + supervisor 简单可靠，免额外成本
- 采集层与服务层解耦：爬虫挂了不影响用户访问

### 7.3 系统架构

```
                        ┌─────────────────────────────────────────────┐
                        │         Cloudflare Edge Network             │
[用户浏览器] ──────────▶│                                             │
                        │  [Pages] ── Next.js SSR/SSG 前端            │
                        │  [Workers] ── API 层                        │
                        │      ├── /api/matches                       │
                        │      ├── /api/match/:id                     │
                        │      ├── /api/player/:id                    │
                        │      └── /api/ai-preview                    │
                        │  [KV] ── 边缘缓存（赛前数据）                │
                        │  [R2] ── 静态资源（徽章、分享图片）           │
                        │  [Cron] ── 缓存刷新 + 通知调度               │
                        └──────────────────┬──────────────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────────────┐
                        │            Supabase Cloud                   │
                        │                                             │
                        │  [PostgreSQL] ── 持久化存储                  │
                        │      ├── teams, players, matches            │
                        │      ├── appearances, injuries              │
                        │      ├── fatigue_scores, ai_previews        │
                        │      └── user_preferences                   │
                        │  [Auth] ── 用户认证 (Email + OAuth)          │
                        │  [Edge Functions] ── 疲劳计算 + AI 生成      │
                        │  [Realtime] ── 实时推送（V2）                │
                        └──────────────────┬──────────────────────────┘
                                           ▲
                                           │ Supabase SDK 写入
                                           │
                        ┌──────────────────┴──────────────────────────┐
                        │     阿里云 ECS (47.84.140.167, CentOS 7)    │
                        │     ── 数据采集层（爬虫）                     │
                        │                                             │
                        │  [crontab] 每日调度                          │
                        │      ├── api_football_sync.py               │
                        │      │     └── API-Football REST API        │
                        │      ├── fbref_scraper.py                   │
                        │      │     └── FBref 网页爬取                │
                        │      ├── transfermarkt_scraper.py           │
                        │      │     └── Transfermarkt 网页爬取        │
                        │      └── trigger_compute.py                 │
                        │            └── 通知 Supabase Edge Functions  │
                        │  [supervisor] 进程管理                       │
                        │  [已配置代理] 海外数据源直连                   │
                        └─────────────────────────────────────────────┘
```

**三层分离设计理念**：
- **采集层（ECS）**：脏活累活放这里——长时间爬虫、反爬对抗、代理管理、重试逻辑，对稳定性和灵活性要求高
- **计算层（Supabase Edge Functions）**：靠近数据库执行 TFI/PFI 计算和 AI 生成，减少数据传输延迟
- **服务层（Cloudflare）**：面向用户的全球边缘服务，从 KV 缓存直接返回数据，响应极快

### 7.4 数据库 Schema（Supabase PostgreSQL）

```sql
-- 联赛
CREATE TABLE leagues (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,              -- 'Premier League'
  short_name TEXT NOT NULL,        -- 'PL'
  country TEXT,
  api_football_id INT UNIQUE,      -- API-Football 联赛 ID
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 球队
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,        -- 'LIV'
  league_id INT REFERENCES leagues(id),
  api_football_id INT UNIQUE,
  badge_url TEXT,
  primary_color TEXT,              -- '#C8102E'
  city TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 球员
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  team_id INT REFERENCES teams(id),
  api_football_id INT UNIQUE,
  position TEXT,                   -- 'FW', 'MF', 'DF', 'GK'
  age INT,
  nationality TEXT,
  photo_url TEXT,
  season_total_minutes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 比赛
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  league_id INT REFERENCES leagues(id),
  home_team_id INT REFERENCES teams(id),
  away_team_id INT REFERENCES teams(id),
  api_football_id INT UNIQUE,
  matchday TEXT,                   -- 'Matchday 34'
  kickoff_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  city TEXT,
  status TEXT DEFAULT 'upcoming',  -- upcoming / live / finished
  home_score INT,
  away_score INT,
  has_extra_time BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 出场记录
CREATE TABLE appearances (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  match_id INT REFERENCES matches(id),
  minutes_played INT NOT NULL,
  is_starter BOOLEAN DEFAULT false,
  subbed_in_at INT,                -- 替补上场分钟
  subbed_out_at INT,               -- 被换下分钟
  UNIQUE(player_id, match_id)
);

-- 伤病
CREATE TABLE injuries (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  type TEXT,                       -- 'Muscle Injury', 'Knee Injury' 等
  started_at DATE,
  expected_return DATE,
  status TEXT DEFAULT 'out',       -- out / doubtful / available
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 疲劳指数（计算结果表）
CREATE TABLE fatigue_scores (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,       -- 'team' | 'player'
  entity_id INT NOT NULL,          -- team.id 或 player.id
  match_id INT REFERENCES matches(id),
  score DECIMAL(5,2) NOT NULL,     -- 0-100
  level TEXT,                      -- 'low' | 'medium' | 'high'
  factors JSONB,                   -- 各因子明细
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, match_id)
);

-- AI 赛前分析
CREATE TABLE ai_previews (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id),
  team_id INT REFERENCES teams(id),
  content TEXT NOT NULL,            -- 中文分析摘要
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, team_id)
);

-- 用户偏好（利用 Supabase Auth 的 auth.users）
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  followed_teams INT[] DEFAULT '{}',
  followed_leagues INT[] DEFAULT '{}',
  language TEXT DEFAULT 'zh',
  theme TEXT DEFAULT 'dark',
  notification_enabled BOOLEAN DEFAULT true,
  is_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略：用户只能读写自己的偏好
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prefs" ON user_preferences
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own prefs" ON user_preferences
  FOR UPDATE USING (auth.uid() = id);

-- Pro 用户访问控制视图
CREATE VIEW pro_fatigue_details AS
  SELECT fs.*, p.name as player_name, p.age, p.position
  FROM fatigue_scores fs
  JOIN players p ON fs.entity_id = p.id
  WHERE fs.entity_type = 'player';
-- 通过 RLS 或 API 层控制：免费用户只能看 team 级别，Pro 用户可看 player 级别

-- 常用索引
CREATE INDEX idx_matches_kickoff ON matches(kickoff_at);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_appearances_player ON appearances(player_id);
CREATE INDEX idx_appearances_match ON appearances(match_id);
CREATE INDEX idx_fatigue_entity ON fatigue_scores(entity_type, entity_id);
CREATE INDEX idx_injuries_player ON injuries(player_id);
CREATE INDEX idx_injuries_status ON injuries(status);
```

### 7.5 运营成本估算

| 项目 | 免费层额度 | 预估月成本（MVP 阶段） | 预估月成本（万级用户） |
|------|-----------|----------------------|---------------------|
| Cloudflare Pages | 无限请求 | $0 | $0 |
| Cloudflare Workers | 10 万次/天 | $0（足够） | $5（Paid 层） |
| Cloudflare KV | 10 万次读/天 | $0（足够） | $0（足够） |
| Cloudflare R2 | 10GB 存储 | $0（足够） | $0（足够） |
| Supabase | 500MB DB / 50k MAU | $0（足够） | $25（Pro 层） |
| 阿里云 ECS | 现有服务器 | $0（已有） | $0（已有） |
| API-Football | 100 次/天（免费） | $0 - $20 | $20 |
| Anthropic API | 按量付费 | ~$5（每日生成 20 场分析） | ~$15 |
| 域名 | — | $12/年 | $12/年 |
| **合计** | | **$0 - $26/月** | **$65/月** |

**核心优势：MVP 阶段几乎零成本启动，全 Serverless 架构按需扩展。**

---

### 8.1 设计理念

**"情报面板，不是数据表格"**

- 用颜色编码替代数字：绿/黄/红 直觉传达状态好坏
- 用图形替代文字：能量条、时间轴、趋势柱状图
- 对比优先：所有信息以双栏对比形式呈现
- 信息分层：首屏看结论（疲劳指数），下滑看细节（球员负荷）

### 8.2 视觉风格

- 主题：深色背景（#06060f 至 #0a0a1a）
- 强调色：紫色渐变（#6366F1 → #8B5CF6）用于品牌元素和 AI 功能
- 球队色彩：每支球队使用其官方主色作为状态指标的辅助色
- 字体：SF Pro Display / 系统默认无衬线字体
- 动效：关键数值使用动画计数器，能量条使用过渡动画
- 移动适配：卡片式布局，双栏在窄屏切换为上下堆叠

### 8.3 分享设计

- 每场比赛的状态对比可导出为图片卡片
- 图片包含品牌水印和 URL
- 针对微信/Twitter/Instagram 的最佳尺寸预设
- 社交传播是核心增长引擎

---

## 9. 商业模式

### 9.1 收入模型

**免费层（Free）**：
- 当日比赛状态卡（缩略版）
- 球队疲劳指数
- 基础赛程时间轴

**Pro 订阅（$4.99/月 或 $39.99/年）**：
- 完整球员级疲劳数据
- AI 赛前分析摘要
- 轮换预测
- 世界杯模式完整功能
- 历史趋势数据
- 无广告

**内容分发**：
- 赛前状态报告自动生成，可同步到 Auston 微信公众号
- 增加 Auston 内容频率和差异化

### 9.2 增长策略

**阶段一：世界杯冷启动（2026.05-07）**

- 世界杯模式作为引爆点功能
- 每日发布状态报告到社交媒体（Twitter、小红书、微信）
- 赛前状态截图自带品牌水印，鼓励自然传播
- 目标：10,000 注册用户

**阶段二：联赛赛季运营（2026.08-2027.05）**

- 五大联赛每轮赛前状态报告
- Fantasy 玩家社区运营（FPL 选人建议）
- SEO 优化：针对"球队状态""赛前分析"等关键词
- 目标：50,000 注册用户，1,000 付费用户

**阶段三：数据产品化（2027+）**

- 开放 API 给第三方开发者
- B端合作：为体育媒体提供状态数据嵌入
- 博彩平台数据合作

---

## 10. 里程碑与排期

### Phase 0：数据验证（2 周）

| 任务 | 时间 |
|------|------|
| 注册 API-Football，验证数据可用性 | Day 1-2 |
| ECS 上搭建 Python 爬虫环境，编写 api_football_sync.py | Day 3-4 |
| 编写 fbref_scraper.py + transfermarkt_scraper.py | Day 5-7 |
| Supabase 项目创建，PostgreSQL Schema 建表 | Day 8-9 |
| 爬虫数据写入 Supabase 联调，验证数据完整性 | Day 10-11 |
| 实现 TFI 计算模型 V1（Supabase Edge Function） | Day 12-13 |
| 用 3-5 场真实比赛验证模型输出是否合理 | Day 14 |

### Phase 1：MVP 上线（4 周）

| 任务 | 时间 |
|------|------|
| Next.js 项目初始化 + 基础页面框架 | Week 1 |
| Match Feed 首页 + Match Detail 页面开发 | Week 1-2 |
| 疲劳引擎前后端集成 | Week 2 |
| 赛程时间轴 + 势头曲线组件 | Week 3 |
| AI 赛前分析生成（模板 + Anthropic API） | Week 3 |
| 用户系统（Supabase Auth 集成 + 关注球队） | Week 4 |
| 部署到 Cloudflare Pages + Workers + KV 缓存 | Week 4 |
| **MVP 上线：覆盖英超 + 欧冠** | **Week 4 末** |

### Phase 2：世界杯就绪（4 周）

| 任务 | 时间 |
|------|------|
| 扩展至五大联赛全覆盖 | Week 5 |
| 球员负荷页面开发 | Week 5-6 |
| 世界杯模式开发（国家队负荷看板 + 旅行地图） | Week 6-7 |
| 分享功能（图片导出 + 社交优化） | Week 7 |
| Pro 订阅支付集成 | Week 7 |
| 推送通知系统 | Week 8 |
| 性能优化 + Bug 修复 | Week 8 |
| **世界杯版本上线** | **Week 8 末（约 2026 年 5 月底）** |

### Phase 3：赛季运营（持续）

- Auston 内容自动同步管线
- SEO 优化和内容营销
- 用户反馈迭代
- B 端合作探索

---

## 11. 关键指标（KPI）

### 产品指标

| 指标 | 定义 | 目标（上线 3 个月） |
|------|------|-------------------|
| 注册用户数 | 完成注册的用户 | 10,000 |
| DAU | 每日活跃用户 | 1,500 |
| 赛前页面浏览量 | Match Detail 页面 PV | 50,000/月 |
| 平均停留时长 | 单次会话时长 | > 3 分钟 |
| 分享率 | 使用分享功能的用户占比 | > 8% |
| Pro 转化率 | 注册用户 → 付费用户 | > 3% |

### 数据质量指标

| 指标 | 目标 |
|------|------|
| 数据更新延迟 | < 6 小时（比赛结束后出场数据更新） |
| TFI 计算覆盖率 | 100%（所有即将进行的五大联赛 + 欧冠比赛） |
| 伤病信息准确率 | > 90%（与官方公告对比） |

---

## 12. 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| API-Football 免费额度不足 | 数据拉取受限 | 启用 Cloudflare KV 缓存策略 + 付费升级（$20/月可接受） |
| FBref/Transfermarkt 反爬 | 数据源中断 | 多数据源备份 + 降低爬取频率 + 尊重 robots.txt |
| 疲劳模型不准确 | 用户信任度下降 | 持续用比赛结果回测校准 + 透明展示算法逻辑 |
| 世界杯前开发周期不足 | 错过时机窗口 | 优先 MVP 核心功能，世界杯模式可简化为静态数据展示 |
| Cloudflare Workers CPU 限制 | 复杂计算超时 | 爬虫已移至 ECS；Workers 仅处理轻量 API 和缓存刷新，免费层足够 |
| Supabase 免费层数据库 500MB 限制 | 赛季数据量增长后不足 | 定期归档历史赛季数据；Pro 层 8GB 仅 $25/月 |
| 中国用户访问 Cloudflare 速度 | 国内用户体验下降 | V1 先面向海外英文用户；国内通过 Auston 公众号分发内容而非直接访问 Web |
| 版权/数据使用合规 | 法律风险 | 仅使用公开统计数据，不展示赛事视频/图片，标注数据来源 |

---

## 13. 竞品差异化总结

| 维度 | FotMob | Sofascore | OneFootball | **SonarFC** |
|------|--------|-----------|-------------|--------------|
| 实时比分 | ✅ 核心功能 | ✅ 核心功能 | ✅ 核心功能 | ❌ 不做 |
| 赛后统计 | ✅ 详细 | ✅ 详细 | ⚠️ 基础 | ❌ 不做 |
| 新闻/视频 | ✅ 有 | ⚠️ 少 | ✅ 核心功能 | ❌ 不做 |
| 疲劳指数 | ❌ 无 | ❌ 无 | ❌ 无 | ✅ **核心差异** |
| 赛程压力可视化 | ❌ 无 | ❌ 无 | ❌ 无 | ✅ **核心功能** |
| 球员负荷追踪 | ⚠️ 仅跑动数据 | ❌ 无 | ❌ 无 | ✅ **核心功能** |
| AI 赛前分析 | ❌ 无 | ❌ 无 | ❌ 无 | ✅ **核心功能** |
| 状态对比可视化 | ❌ 表格化 | ❌ 表格化 | ❌ 无 | ✅ **图形化** |
| 世界杯旅行疲劳 | ❌ 无 | ❌ 无 | ❌ 无 | ✅ **专属功能** |

**SonarFC 不做实时比分、赛后统计和新闻——这些是红海。SonarFC 只做赛前状态情报——这是蓝海。**

---

## 附录

### A. 名称候选

| 名称 | 域名 | 状态 |
|------|------|------|
| **SonarFC** | sonarfc.com | ✅ 首选（DNS 无记录，待注册商确认） |
| SonarFC | sonarfc.io | ✅ 备选 |
| SonarFC | sonarfc.app | ✅ 备选 |

### B. 参考产品链接

- FotMob: https://www.fotmob.com
- Sofascore: https://www.sofascore.com
- OneFootball: https://onefootball.com
- API-Football: https://www.api-football.com
- FBref: https://fbref.com
- StatsBomb Open Data: https://github.com/statsbomb/open-data

---

*本文档为 SonarFC 产品的初始版本 PRD，将随产品迭代持续更新。*

---

## 14. 极速验证设计方案（Design Doc）

**状态**：APPROVED  
**日期**：2026-04-06  
**模式**：Builder — 极速周末验证

### 14.1 验证目标

一个周末内完成一场比赛（优先欧冠）的完整状态对比页面，验证核心产品假设：球迷赛前想看"情报面板式"的球队状态对比，并且会截图分享。

### 14.2 市场验证

市场扫描确认产品空白真实存在：
- **预测类 App**（Forebet、NerdyTips）聚焦胜平负概率，无赛前状态分析
- **疲劳监测**仅有 B2B 方案（KINEXON、GPS 背心），面向球迷的疲劳产品不存在
- **学术研究**证实疲劳作为预测变量有效（连续第三场比赛 xG 下降约 12%）

### 14.3 周末版约束

- 使用真实数据（API-Football + 手动在 Supabase Dashboard 录入伤病数据到 `injuries` 表）
- 简化架构：Next.js 14 + Tailwind + Supabase + Cloudflare Pages（不用 Workers/KV/ECS，前端直连 Supabase）
- 爬虫暂不自动化，`api_football_sync.py` 手动运行一次拉取数据
- 不包含用户系统、比赛列表、世界杯模式等 MVP 功能

### 14.4 疲劳引擎（周末版）

使用 4.2.1 节定义的 6 个变量，加权公式：

```
TFI = match_density × 0.25
    + avg_player_minutes × 0.25
    + rest_days_penalty × 0.20
    + travel_load × 0.15
    + extra_time_penalty × 0.05
    + intl_duty_load × 0.10
```

归一化逻辑：

| 变量 | 归一化方式 | 0 分 | 100 分 |
|------|-----------|------|--------|
| `match_density` | 过去 14 天比赛数 | 1 场 | 6+ 场 |
| `avg_player_minutes` | 首发 11 人平均出场分钟 (14d) | ≤ 180' | ≥ 450' |
| `rest_days_penalty` | 距上一场天数（反向） | ≥ 7 天 | ≤ 2 天 |
| `travel_load` | 14 天客场旅行总距离 | 0 km | ≥ 4000 km |
| `extra_time_penalty` | 14 天内是否有加时 | 无 | 有（固定 80 分） |
| `intl_duty_load` | (国脚人数/11) × 旅行修正系数 | 0% 征召 | 60%+ 征召 |

旅行修正系数：国内 1.0，洲内（如欧洲内）1.3，跨洲（如南美→欧洲）1.6。

输出：0-100 分（0=完全恢复，100=极度疲劳）。颜色编码：绿 ≤ 40，黄 41-65，红 > 65。

周末版暂不计算球员级 PFI，只做球队级 TFI。球员负荷数据直接用出场分钟数展示。

**计算流程：** 数据同步后手动运行 `npx tsx compute-tfi.ts` → 从 Supabase 查询 appearances + matches → 加权计算 → 写入 `fatigue_scores` 表 → Next.js 页面读取渲染。部署前执行一次即可。

**`fatigue_scores` 表 schema（周末版）：**
```sql
fatigue_scores(id SERIAL, entity_type TEXT, entity_id INT, match_id INT,
  score DECIMAL(5,2), level TEXT, factors JSONB, calculated_at TIMESTAMPTZ)
```

### 14.5 裁判情报模块（新增）

比赛详情页新增裁判信息模块，展示执法裁判的关键倾向数据：

**数据点：**
- 裁判姓名 + 照片
- 本赛季场均黄牌数 / 红牌数
- 场均犯规吹罚数
- 场均点球判罚率
- 对主队/客队的犯规吹罚倾向（主客场偏差比）
- 与本场两队的历史执法记录（如有）

**数据来源：** API-Football 的 `/fixtures?id=xxx` 返回裁判信息。如 API 未覆盖详细裁判统计，手动从 Transfermarkt 裁判页面补录。

**可视化设计：**
- 裁判卡片放在 AI 分析上方
- 紧凑设计：裁判名 + 3-4 个关键数据小标签（场均黄牌、场均犯规、点球率）
- 颜色编码：严格裁判（红/高频）vs 宽松裁判（绿/低频）
- 如裁判数据显示明显偏向（如主场犯规吹罚比客场低 20%+），加一句简短提示

**周末版范围：** 如果 API-Football 免费层能获取裁判数据就加上，否则手动录入基础信息（姓名 + 场均黄牌 + 场均犯规）。

### 14.6 边界情况

- **API-Football 调用失败**：脚本失败时用上次写入 Supabase 的数据兜底。Demo 阶段数据只拉一次，不需要实时更新
- **伤病数据缺失**：缺阵球员列表显示"数据更新中"，不影响 TFI 计算（TFI 不依赖伤病数据）
- **出场数据不完整**：对缺失球员的出场记录按 0 分钟处理，TFI 取可用数据计算

### 14.7 移动端布局

移动端（< 768px）采用单栏堆叠布局：
- 主队面板在上，VS Badge 居中，客队面板在下
- 原型 JSX 已有 flex 布局基础，加 `@media (max-width: 768px) { flex-direction: column }` 即可
- 分享截图在移动端裁切为 9:16 竖屏比例（1080x1920px 隐藏容器 + html2canvas）

### 14.8 验证前提

1. **公开数据疲劳模型够用** — 用赛程、出场分钟数、旅行距离推算的疲劳指数，对球迷来说足够有参考价值
2. **赛前状态需求真实存在** — 球迷赛前确实想知道"今天两队状态怎么样"，现有 App 没满足
3. **世界杯是最佳冷启动窗口** — 跨赛季疲劳在世界杯被放大
4. **技术栈能 2 天内支撑极速验证** — Next.js + Cloudflare Pages + Supabase 直连足够
5. **社交截图是核心增长引擎** — 状态卡截图转发是传播核心

### 14.9 Cross-Model 第二意见

独立 AI 子代理审视项目后提出的关键建议：

1. **"比赛天气"动态疲劳（V1.5）** — 把疲劳从静态快照变成实时变动指标，当阵容公告出来时自动更新。利用 Supabase Realtime 实现
2. **回测准确率作为产品功能（V1.5）** — 赛后公开模型预测准确率，建立信任。"SonarFC 本赛季正确识别更疲劳一方输球的比例：68%"
3. **50% 开源路径** — Open Football（比赛数据）+ Tremor（仪表盘组件）+ understat（xG）能走一半。需自建：疲劳引擎、社交图片导出、双栏对比 UX、数据管线编排
4. **周末原型时间分配** — 周六上午搭库拉数据，周六下午疲劳引擎，周日上午页面，周日下午分享+部署

### 14.10 方案选择

| 方案 | 摘要 | 工作量 | 风险 |
|------|------|--------|------|
| **A: 极速周末验证 ✅** | 一场比赛，一个页面，先做欧冠 | S（2天） | 低 |
| B: MVP 首版 | Match Feed + Detail + 疲劳引擎，覆盖英超 | L（4周） | 中 |
| C: 渐进式 A→B | 先 Demo 验证，再决定推进 MVP | S→L | 低 |

选择方案 A。已有完整 JSX 原型（`docs/sonarfc-prototype.jsx`），组件结构可直接复用，替换 mock 数据为 Supabase 真实数据即可。

### 14.11 待决问题

1. 选择哪场欧冠比赛作为第一个 Demo？建议选择赛程密度差异最大的对决
2. **API-Football 调用预算**：Demo 需要约 15 次调用，免费层 100 次/天足够
3. 旅行距离用 Haversine 公式 + 本地坐标 JSON 文件（~40 行），手动填入即可
4. 分享图片导出用 html2canvas（快速上手，渐变可能渲染不完美，降级方案：纯色背景或改用 Satori）
5. 回测准确率功能推迟到 V1.5

### 14.12 成功标准

- [ ] 一场欧冠比赛的完整状态对比页面上线
- [ ] 疲劳引擎输出通过嗅觉测试 — 赛程密度差 ≥ 2 场的两队，TFI 差值应 ≥ 15 分
- [ ] 页面在手机端可正常浏览（移动优先）
- [ ] 分享截图功能可用，带品牌水印（右下角 SonarFC logo + URL，40% 透明度）
- [ ] 发到一个球迷群，至少有人截图转发

### 14.13 执行步骤

1. **选定一场欧冠比赛** — 查看最近欧冠赛程，选择疲劳差异最大的对决
2. **搭建 Supabase 数据库** — 用 7.4 节的 Schema 建表
3. **写 api_football_sync.py** — 只拉目标两队 14 天数据，写入 Supabase
4. **实现 TFI 计算** — `npx tsx compute-tfi.ts`，跑数据验证合理性
5. **Next.js 项目初始化** — 把原型 JSX 组件迁入，接入真实数据
6. **加分享功能** — html2canvas 截图 + 品牌水印
7. **部署 Cloudflare Pages** — 推到群里测试社交反馈
