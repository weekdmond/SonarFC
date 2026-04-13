# SonarFC 技术设计文档（Technical Design）

**版本**：v1.0  
**日期**：2026-04-06  
**作者**：Weekdmond  
**状态**：Draft  
**关联文档**：[SonarFC 产品需求文档（PRD）](./SonarFC-PRD.md)

---

## 1. 文档范围

本文档承接 PRD，聚焦 SonarFC 的技术实现方案，包括：

- 数据来源与采集边界
- 领域模型与数据库设计
- 数据管线与计算流程
- 服务端与前端部署架构
- MVP 成本模型
- 周末验证版的实现约束

产品目标、用户价值、商业模式和功能优先级以 [PRD](./SonarFC-PRD.md) 为准；若两者出现冲突，以 PRD 的产品边界优先，再回写本文档。

---

## 2. 数据架构

### 2.1 数据源

| 数据源 | 用途 | 获取方式 | 成本 |
|--------|------|----------|------|
| API-Football (api-football.com) | 赛程、出场时间、阵容、伤病、赛事信息 | REST API | 免费层 100 次/天，Pro $20/月起 |
| FBref (fbref.com) | 球员出场分钟数、高级统计（xG 等） | 网页爬取 | 免费 |
| Transfermarkt | 伤病记录、球员身价、转会信息 | 网页爬取 / 社区 API | 免费 |
| 城市坐标数据 | 计算旅行距离 | 静态数据集 | 免费 |
| FIFA 官方赛程 | 世界杯赛程、场地信息 | 公开资料 | 免费 |

### 2.2 领域模型

核心实体关系如下：

```
competitions 1──N matches N──1 teams
      │                    │
      │                    ├── match_squads
      │                    └── fatigue_scores / ai_previews
      │
      ├── team_competitions N──1 teams
      └── team_camps N──1 teams

players 1──N player_affiliations N──1 teams
   │
   ├── appearances N──1 matches
   └── injuries
```

### 2.3 关键设计决策

- `competitions` 统一表达联赛、杯赛和国家队赛事，避免俱乐部赛与世界杯使用两套模型。
- `teams` 不直接挂在单一联赛下，而是通过 `team_competitions` 关联到赛季赛事，支持一支球队跨联赛、杯赛和国际赛事被复用。
- `team_type` 区分 `club` 和 `national`，用于页面文案、筛选器、国家队模式和旅行链路计算。
- `player_affiliations` 记录球员在俱乐部和国家队的归属关系，支持世界杯期间的征召与释放。
- `team_camps` 保存国家队集训地和赛事驻地，补齐「俱乐部城市 → 国家队集训地 → 比赛城市」的旅行链路。
- `match_squads` 统一表示首发、替补、伤缺、停赛、国家队征召等可用性状态，直接服务阵容完整度模块。
- `fatigue_scores` 用 `entity_type` + `entity_id` 做多态关联，同时存储球队级和球员级疲劳数据。
- `factors` 字段用 JSONB 存储疲劳因子明细，方便前端展示分项数据而不需要额外查询。
- `user_preferences` 与 Supabase Auth 的 `auth.users` 关联，注册后自动建档，避免首次进入设置页时无记录可写。
- Pro 订阅通过 `user_preferences.is_pro` 控制，API 层据此决定返回 team 级还是 player 级疲劳数据。

### 2.4 数据管线

```
[自托管采集节点（ECS，可替换）— 数据采集层]（私有环境）
  │
  │  crontab 调度，Python 脚本运行
  │
  ├── 05:30 UTC ── api_football_sync.py
  │     ├── 拉取当日及未来 7 天赛程 → Supabase: matches / competitions
  │     ├── 拉取已结束比赛的出场数据 → Supabase: appearances
  │     └── 拉取球队和球员基础信息 → Supabase: teams / players / team_competitions
  │
  ├── 05:45 UTC ── fbref_scraper.py
  │     └── 爬取球员出场分钟数（补全/校验） → Supabase: appearances
  │
  ├── 05:55 UTC ── transfermarkt_scraper.py
  │     ├── 爬取伤病信息 → Supabase: injuries
  │     └── 校准球员归属关系 → Supabase: player_affiliations
  │
  ├── 06:05 UTC ── tournament_context_sync.py
  │     └── 录入国家队集训地 / 赛事城市 → Supabase: team_camps
  │
  └── 数据写入完成后，调用 Supabase Edge Function webhook 通知计算层
  
[Supabase Edge Functions — 计算层]
  │
  ├── calculate-tfi ── 球队疲劳指数
  │     └── 查询 appearances + matches + team_camps → 加权计算 → 写入 fatigue_scores
  │
  ├── calculate-pfi ── 球员疲劳指数
  │     └── 查询 player_affiliations + appearances + injuries → 计算 → 写入 fatigue_scores
  │
  └── generate-preview ── 赛前分析摘要
        └── 读取 fatigue_scores + injuries + momentum → 模板/规则引擎生成 → 写入 ai_previews

[Cloudflare Workers Cron — 缓存层]
  │
  ├── 06:30 UTC ── cache-refresh Worker
  │     └── 查询 Supabase 即将进行的比赛数据 → 序列化 → 写入 Cloudflare KV
  │
  └── 赛前 2 小时 ── notification Worker（V2）
        └── 查询 user_preferences.followed_teams → 推送 Web Push
```

### 2.5 采集层设计原则

- 爬虫需要长时间运行，FBref/Transfermarkt 单次采集可能 5-10 分钟，不适合放到 Cloudflare Workers。
- 反爬策略需要灵活处理，ECS 上 Python 生态更成熟，便于管理代理、重试和限流。
- 采集节点是可替换的自托管环境，具体主机信息只记录在私有运维文档，不写入公开仓库。
- 采集层与服务层解耦，爬虫异常不应阻塞页面访问。

### 2.6 容错策略

- 每个爬虫脚本独立运行，失败不影响其他任务。
- 采集失败时写入 error log，并通过邮件或即时通信工具告警。
- API-Football 请求失败时，从 Cloudflare KV 读取上次缓存的数据兜底。
- Supabase Edge Functions 超时设为 25s，超时自动重试 1 次。
- 采集节点使用 `supervisor` 或等价方案保证进程稳定运行。

---

## 3. 技术架构

### 3.1 技术栈

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 前端框架 | Next.js 14 + React + Tailwind CSS | SSR/SSG 支持 SEO，Tailwind 便于快速重构原型 |
| 部署平台 | Cloudflare Pages | 全球边缘网络，自动 CI/CD，自带 CDN |
| 后端 API | Cloudflare Workers | 边缘计算，与 Pages 同平台集成 |
| 数据采集（爬虫） | 自托管 ECS + Python | 长时间运行、反爬处理、代理配置更灵活 |
| 定时调度（爬虫） | crontab | 简单可靠 |
| 定时调度（缓存/通知） | Cloudflare Workers Cron Triggers | 轻量任务，免运维 |
| 数据库 | Supabase (PostgreSQL) | 适合强关联查询，内置 Auth、RLS、Edge Functions |
| 计算层 | Supabase Edge Functions (Deno/TS) | 靠近数据库执行 TFI/PFI 计算 |
| 缓存 | Cloudflare KV | 适合赛前数据的高频读取 |
| 用户认证 | Supabase Auth | 邮箱 + OAuth，减少自建成本 |
| 文件存储 | Cloudflare R2 | 球队徽章、分享图片等静态资源 |
| 域名与 DNS | Cloudflare DNS | 与 Pages/Workers 同平台 |

### 3.2 为什么选 Supabase + Cloudflare

**Supabase 的理由**

- 赛程、球队、球员、出场记录之间是强关联关系，PostgreSQL 的 JOIN 查询比文档型数据库更自然。
- 内置 Auth、RLS、Edge Functions，能显著减少 MVP 的基础设施工作量。
- Realtime 可用于未来的动态疲劳或阵容更新能力。

**Cloudflare 的理由**

- 全球边缘网络对英文用户更友好，适合赛前高并发只读场景。
- Pages + Workers + KV 的平台整合度高，CI/CD 和缓存策略配置简单。
- 免费层足够覆盖 MVP 的初期流量。

### 3.3 系统架构

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
                        │      ├── competitions, teams, matches       │
                        │      ├── player_affiliations, team_camps    │
                        │      ├── appearances, match_squads, injuries│
                        │      ├── fatigue_scores, ai_previews        │
                        │      └── user_preferences                   │
                        │  [Auth] ── 用户认证 (Email + OAuth)          │
                        │  [Edge Functions] ── 疲劳计算 + 摘要生成      │
                        │  [Realtime] ── 实时推送（V2）                │
                        └──────────────────┬──────────────────────────┘
                                           ▲
                                           │ Supabase SDK 写入
                                           │
                        ┌──────────────────┴──────────────────────────┐
                        │     自托管采集节点（ECS，可替换）            │
                        │     ── 数据采集层（爬虫）                     │
                        │                                             │
                        │  [crontab] 每日调度                          │
                        │      ├── api_football_sync.py               │
                        │      ├── fbref_scraper.py                   │
                        │      ├── transfermarkt_scraper.py           │
                        │      └── trigger_compute.py                 │
                        │  [supervisor] 进程管理                       │
                        │  [已配置代理] 海外数据源直连                   │
                        └─────────────────────────────────────────────┘
```

### 3.4 三层分离设计理念

- **采集层**：处理长时间运行的爬虫、反爬、代理和重试。
- **计算层**：在靠近数据库的位置执行疲劳计算和结构化摘要生成。
- **服务层**：面向用户提供全球边缘访问能力和缓存。

---

## 4. 数据库 Schema（Supabase PostgreSQL）

```sql
-- 赛事（联赛 / 杯赛 / 国家队赛事）
CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,                  -- 'Premier League' / 'FIFA World Cup'
  short_name TEXT NOT NULL,            -- 'PL' / 'WC'
  competition_type TEXT NOT NULL,      -- 'league' | 'cup' | 'international'
  region TEXT,
  season_label TEXT NOT NULL,          -- '2026'
  api_football_id INT UNIQUE,          -- API-Football 赛事 ID
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 球队
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,            -- 'LIV'
  team_type TEXT NOT NULL DEFAULT 'club', -- 'club' | 'national'
  api_football_id INT UNIQUE,
  badge_url TEXT,
  primary_color TEXT,                  -- '#C8102E'
  country TEXT,
  home_city TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 球队与赛事的赛季关系
CREATE TABLE team_competitions (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL REFERENCES teams(id),
  competition_id INT NOT NULL REFERENCES competitions(id),
  season_label TEXT NOT NULL,
  stage TEXT,                          -- 'Group A' / 'Round of 16'
  is_active BOOLEAN DEFAULT true,
  UNIQUE(team_id, competition_id, season_label)
);

-- 球员基础信息
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  api_football_id INT UNIQUE,
  position TEXT,                       -- 'FW', 'MF', 'DF', 'GK'
  age INT,
  nationality TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 球员归属关系（俱乐部 / 国家队）
CREATE TABLE player_affiliations (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL REFERENCES players(id),
  team_id INT NOT NULL REFERENCES teams(id),
  affiliation_type TEXT NOT NULL,      -- 'club' | 'national'
  starts_at DATE NOT NULL,
  ends_at DATE,
  is_primary BOOLEAN DEFAULT false,
  UNIQUE(player_id, team_id, affiliation_type, starts_at)
);

-- 国家队集训地 / 赛事驻地
CREATE TABLE team_camps (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL REFERENCES teams(id),
  competition_id INT REFERENCES competitions(id),
  city TEXT NOT NULL,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ
);

-- 比赛
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  competition_id INT REFERENCES competitions(id),
  home_team_id INT REFERENCES teams(id),
  away_team_id INT REFERENCES teams(id),
  api_football_id INT UNIQUE,
  stage TEXT,                          -- 'Matchday 34' / 'Quarter-final'
  kickoff_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  city TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  status TEXT DEFAULT 'upcoming',      -- upcoming / live / finished
  home_score INT,
  away_score INT,
  has_extra_time BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 比赛名单 / 可用性
CREATE TABLE match_squads (
  id SERIAL PRIMARY KEY,
  match_id INT NOT NULL REFERENCES matches(id),
  team_id INT NOT NULL REFERENCES teams(id),
  player_id INT NOT NULL REFERENCES players(id),
  squad_status TEXT NOT NULL,          -- 'starter' | 'bench' | 'out' | 'doubtful' | 'suspended' | 'national_duty'
  availability_reason TEXT,
  expected_return DATE,
  UNIQUE(match_id, team_id, player_id)
);

-- 出场记录
CREATE TABLE appearances (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  team_id INT REFERENCES teams(id),
  match_id INT REFERENCES matches(id),
  minutes_played INT NOT NULL,
  is_starter BOOLEAN DEFAULT false,
  subbed_in_at INT,
  subbed_out_at INT,
  UNIQUE(player_id, match_id)
);

-- 伤病
CREATE TABLE injuries (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id),
  type TEXT,                           -- 'Muscle Injury', 'Knee Injury' 等
  started_at DATE,
  expected_return DATE,
  status TEXT DEFAULT 'out',           -- out / doubtful / available
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 疲劳指数（计算结果表）
CREATE TABLE fatigue_scores (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,           -- 'team' | 'player'
  entity_id INT NOT NULL,              -- team.id 或 player.id
  match_id INT REFERENCES matches(id),
  score DECIMAL(5,2) NOT NULL,         -- 0-100
  level TEXT,                          -- 'low' | 'medium' | 'high'
  factors JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, match_id)
);

-- 赛前分析摘要
CREATE TABLE ai_previews (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id),
  team_id INT REFERENCES teams(id),
  content TEXT NOT NULL,
  generation_method TEXT DEFAULT 'template_v1',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, team_id)
);

-- 用户偏好
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  followed_teams INT[] DEFAULT '{}',
  followed_competitions INT[] DEFAULT '{}',
  language TEXT DEFAULT 'zh',
  theme TEXT DEFAULT 'dark',
  notification_enabled BOOLEAN DEFAULT true,
  is_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prefs" ON user_preferences
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own prefs" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own prefs" ON user_preferences
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users delete own prefs" ON user_preferences
  FOR DELETE USING (auth.uid() = id);

CREATE FUNCTION public.handle_new_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();

CREATE VIEW pro_fatigue_details AS
  SELECT fs.*, p.name as player_name, p.age, p.position
  FROM fatigue_scores fs
  JOIN players p ON fs.entity_id = p.id
  WHERE fs.entity_type = 'player';

CREATE INDEX idx_matches_kickoff ON matches(kickoff_at);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_match_squads_match_team ON match_squads(match_id, team_id);
CREATE INDEX idx_appearances_player ON appearances(player_id);
CREATE INDEX idx_appearances_match ON appearances(match_id);
CREATE INDEX idx_player_affiliations_player ON player_affiliations(player_id);
CREATE INDEX idx_player_affiliations_team ON player_affiliations(team_id);
CREATE INDEX idx_team_competitions_competition ON team_competitions(competition_id);
CREATE INDEX idx_team_camps_team ON team_camps(team_id);
CREATE INDEX idx_fatigue_entity ON fatigue_scores(entity_type, entity_id);
CREATE INDEX idx_injuries_player ON injuries(player_id);
CREATE INDEX idx_injuries_status ON injuries(status);
```

---

## 5. 运营成本估算

| 项目 | 免费层额度 | 预估月成本（MVP 阶段） | 预估月成本（万级用户） |
|------|-----------|----------------------|---------------------|
| Cloudflare Pages | 无限请求 | $0 | $0 |
| Cloudflare Workers | 10 万次/天 | $0（足够） | $5（Paid 层） |
| Cloudflare KV | 10 万次读/天 | $0（足够） | $0（足够） |
| Cloudflare R2 | 10GB 存储 | $0（足够） | $0（足够） |
| Supabase | 500MB DB / 50k MAU | $0（足够） | $25（Pro 层） |
| 自托管采集节点 | 已有 | $0（已有） | $0（已有） |
| API-Football | 100 次/天（免费） | $0 - $20 | $20 |
| LLM API（V1.5 可选增强） | 按量付费 | $0（V1 不启用） | ~$15 |
| 域名 | — | $12/年 | $12/年 |
| **合计（不含可选 LLM）** | | **$0 - $20/月 + $12/年** | **$50/月 + $12/年** |

**原则**：MVP 默认不依赖外部 LLM，先验证模板摘要和疲劳模型是否有真实用户价值，再决定是否增加可选 AI 成本。

---

## 6. 极速验证设计方案

### 6.1 验证目标

一个周末内完成一场比赛的完整状态对比页面，验证核心产品假设：

- 球迷赛前愿意看“情报面板式”的球队状态对比
- 疲劳、赛程和阵容信息比传统表格更容易被感知
- 用户有截图分享意愿

### 6.2 周末版约束

- 使用真实数据，伤病允许手动录入到 `injuries` 表。
- 简化架构：Next.js 14 + Tailwind + Supabase + Cloudflare Pages。
- 不使用 Workers/KV/ECS 自动管线，前端可直接读取 Supabase。
- AI 摘要沿用 V1 路线，使用模板/规则引擎生成，不接外部 LLM。
- 不包含用户系统、比赛列表和世界杯模式。

### 6.3 疲劳引擎（周末版）

使用 PRD 中定义的 6 个变量：

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

旅行修正系数：国内 1.0，洲内 1.3，跨洲 1.6。

输出：0-100 分（0=完全恢复，100=极度疲劳）。颜色编码：绿 ≤ 40，黄 41-65，红 > 65。

周末版只做球队级 TFI；球员负荷直接展示出场分钟数，不做完整 PFI。

### 6.4 裁判情报模块

裁判模块是 Stretch Goal，不纳入周末版 baseline。只有在以下内容都稳定后再补：

- 核心对比页
- 移动端可用性
- 分享截图功能

若 API-Football 免费层能稳定获取裁判信息，最多补一个精简卡片：

- 裁判姓名
- 场均黄牌
- 场均犯规

否则整体延后到 MVP。

### 6.5 边界情况

- API-Football 调用失败时，用 Supabase 中上次写入的数据兜底。
- 伤病数据缺失时，缺阵球员列表显示“数据更新中”，不影响 TFI 计算。
- 出场数据不完整时，对缺失球员按 0 分钟处理，并在页面上标记置信度较低。

### 6.6 移动端与分享

- 移动端采用单栏堆叠布局：主队在上，客队在下，VS Badge 居中。
- 现有原型以内联 style 为主，不能只补一个 `@media`；需要先把关键容器抽到 Tailwind/className。
- 周末版只保证核心详情页在手机端可用，弹窗和分享海报允许轻量降级。
- 分享截图使用 `html2canvas`，移动端裁切为 9:16 竖屏比例。

### 6.7 成功标准

- 一场比赛的完整状态对比页面上线
- 疲劳引擎输出通过嗅觉测试：赛程密度差 ≥ 2 场的两队，TFI 差值应 ≥ 15 分
- 页面在手机端可正常浏览
- 分享截图功能可用，带品牌水印
- 发到一个球迷群后，至少有人愿意转发或讨论

### 6.8 待决问题

1. 选择哪场比赛作为第一个 Demo，优先选赛程密度差异最大的对决。
2. Demo 需要约 15 次 API-Football 调用，免费层 100 次/天足够。
3. 旅行距离采用 Haversine 公式 + 本地坐标 JSON 文件。
4. 分享图先用 `html2canvas`，若渐变渲染不理想，再考虑 Satori。
5. 回测准确率功能推迟到 V1.5。
