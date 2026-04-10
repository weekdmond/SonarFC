# Design System — SonarFC

## Product Context
- **What this is:** Football pre-match condition detection product, visualizing team fatigue, squad availability, schedule pressure, and momentum trends
- **Who it's for:** Deep football fans, Fantasy players, sports betting users
- **Space/industry:** Football data & analytics (competitors: FotMob, Sofascore, OneFootball)
- **Project type:** Web app (responsive, mobile-first considerations)
- **Design reference:** High-fidelity FotMob clone + SonarFC-exclusive fatigue/energy modules

## Aesthetic Direction
- **Direction:** Clean utility / FotMob style — information-dense, tool-first
- **Decoration level:** Minimal — only subtle dividers and background color blocks to separate regions. No gradients, shadows, or decorative cards
- **Mood:** Professional data tool. Information IS the interface. Every pixel serves a purpose
- **Reference sites:** https://www.fotmob.com/

## Typography
- **Display/Hero:** `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` — 比分、大数字、fatigue index 等 hero 数据用 Geist，锐利几何感，tabular-nums 天生对齐
- **Body/UI:** `'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` — 英文 body、按钮、标签用 DM Sans，几何感干净，比系统字体更有辨识度
- **Data/Scores:** `'Geist', system-ui, sans-serif` with `font-variant-numeric: tabular-nums` — 所有数字密集区（积分榜、统计表、比分）用 Geist 确保数字等宽对齐
- **Code/ACWR/精确数据:** `'Geist Mono', 'SF Mono', monospace` — ACWR 值、PFI 数值等需要等宽展示的场景
- **中文:** 保持系统字体栈（苹方/思源黑体），不加载中文 web fonts。中文字体文件太大（3-5MB），不值得
- **Loading:** Google Fonts CDN，只加载 latin subset。总增量约 20-30KB
  ```html
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  ```
- **Fallback 策略:** `font-display: swap`，系统字体先渲染，web font 加载后无闪烁切换。数据优先产品不能等字体
- **Scale (updated 2026-04-08, previous version too small across the board):**
  - 11px — captions only (timestamps below match rows, "FT" status badge)
  - 12px — meta text, tertiary labels (venue, referee, matchday label)
  - 13px — secondary text, table headers, stat labels
  - **15px — body text, default. Match row team names, player names in lists**
  - **17px — match scores (inline), section titles, tab labels**
  - **20px — page titles, match detail team names**
  - **28px — hero scores (match detail page, head-to-head center score)**
  - **40px — fatigue index display (Sonar panel hero number)**
  - **Key rule:** Match core info (team names + score) must be the loudest element on the page. If anything else draws the eye first, the hierarchy is broken.

## Color

### Light Mode (Default)
- **Approach:** Restrained — green primary + neutral grays, color reserved for data semantics
- **Primary:** `#1a932e` — FotMob green, works naturally in football context (pitch/grass association)
- **Primary Light:** `#e8f5ea` — selected state backgrounds
- **Primary Dark:** `#14722a` — hover states
- **Background:** `#ffffff`
- **Surface:** `#f5f5f5` — cards, section backgrounds, league group headers
- **Surface 2:** `#ebebeb` — secondary surfaces, progress bar tracks
- **Text:** `#1a1a1a` — primary text
- **Text Muted:** `#666666` — secondary text, labels
- **Text Light:** `#999999` — tertiary text, timestamps, captions
- **Border:** `#e8e8e8` — dividers, card borders

### Dark Mode
- **Background:** `#1a1a1a`
- **Surface:** `#2a2a2a`
- **Surface 2:** `#333333`
- **Text:** `#e0e0e0`
- **Text Muted:** `#999999`
- **Text Light:** `#666666`
- **Border:** `#3a3a3a`
- **Primary:** `#2ecc52` (slightly brighter green for dark bg contrast)

### Semantic Colors
- **Success:** `#22c55e` — win dots, fresh energy, good stats
- **Warning:** `#f59e0b` — draw dots, medium fatigue, caution
- **Error/Danger:** `#dc2626` — loss dots, high fatigue, injuries, absent players
- **Info:** `#3b82f6` — UCL qualification indicator, informational alerts

### Energy/Fatigue System (SonarFC Exclusive)
The energy bar is INVERTED from raw fatigue — this is critical for UX intuition:
- Raw fatigue 72 → Energy 28 (low energy, red)
- Raw fatigue 45 → Energy 55 (moderate, green)
- Raw fatigue 28 → Energy 72 (high energy, green)

Color mapping (by ENERGY value, not fatigue):
- **Fresh (energy > 55):** `#22c55e` green — long bar, good state
- **Tired (energy 35-55):** `#f59e0b` yellow — medium bar, moderate
- **Exhausted (energy < 35):** `#dc2626` red — short bar, depleted

This matches the universal "health bar" mental model: long green = good, short red = bad.

## Spacing
- **Base unit:** 4px
- **Density:** Compact (high information density, FotMob-style)
- **Scale:** 2px / 4px / 6px / 8px / 10px / 12px / 16px / 20px / 24px / 32px / 40px / 48px
- **Common patterns (updated — previous version too tight):**
  - Match row padding: **12px 16px** (was 10px 16px)
  - Match row min-height: **52px**
  - Section gaps: **20-28px** (was 16-24px)
  - Card internal padding: **12-16px** (was 8-12px)
  - League group header: **12px 16px**
  - Match detail header: **24px 16px**
  - Tab content top padding: **16px**
  - **Rule:** If text feels cramped, add 4px. Information density is good, but readability comes first.

## Layout
- **Approach:** Grid-disciplined, FotMob three-column pattern
- **Grid:** Left sidebar (240px) + Main content (fluid) + Right sidebar (280px)
- **Max content width:** 1280px, centered
- **Border radius:** Minimal — 2px (badges), 6px (buttons/cards), 8px (larger cards), 12px (pills/tags), 50% (avatars)
- **Breakpoints:** Collapse sidebars on tablet/mobile (responsive TBD)

## Motion
- **Approach:** Minimal-functional
- **Easing:** ease-out for enters, ease-in for exits
- **Duration:** 150-250ms for tab switches, 300ms for page transitions
- **Rules:** No decorative animation. Energy bars may animate on load (0 → value). No bounce, no spring, no parallax.

## Page Designs
All page prototypes are in `docs/design-preview.html`. Open in browser to view:

### Homepage (Match Feed)
- Three-column FotMob layout
- Left: league navigation with real icons from R2
- Center: date picker + match rows grouped by league
- Right: top stories + mini standings table
- **SonarFC addition:** Energy pill inline in match row (单行设计，不再独占一行)
  - Energy pill 位于队名内侧（主队名左侧，客队名右侧）
  - 颜色编码：green(>55)/orange(35-55)/red(<35)，带浅色背景 10% opacity
  - 字号 11px Geist，font-weight 600，圆角 4px，min-width 28px
  - Grid 结构：`60px 32px 1fr 40px 1fr 32px 40px` (时间|主队能量|主队名|比分|客队名|客队能量|收藏)
- **Match row sizing:**
  - Team names: **15px, font-weight 500** (must be clearly readable at a glance)
  - Score: **17px, font-weight 700, Geist, tabular-nums** (the loudest element in the row)
  - Match time/status: 12px, Geist, muted
  - Energy pill: 11px, Geist, colored background pill
  - Row height: minimum 52px
  - Team badge: 20px
  - Row padding: 12px 16px

### Match Detail
- **Match header (占页面视觉重心，不能弱):**
  - Team badges: **56px** (was 48px)
  - Team names: **20px, font-weight 600**
  - Score: **28px, font-weight 700, tabular-nums** (页面最大最醒目的元素)
  - Match status/time: 13px, muted
  - Venue + referee: 12px, muted, single line below score
  - Half-time score: 13px muted, shown as "(HT 1-0)" next to or below full-time
  - **Header vertical padding: 24px top, 16px bottom** (给比赛信息足够呼吸空间)
- Tab bar: **Facts** | Lineup | Stats | **Sonar** | H2H
  - Tab text: **15px** (was implicit 13px), active tab has green underline 3px

#### Facts Tab / 数据 Tab (FotMob 复刻)
赛后第一个 tab，信息最密集的概览页。从上到下：

- **控球率时间线 (Possession Timeline):**
  - 横轴: 0-90 分钟，纵轴: 控球率百分比
  - 双色面积图: 主队色(红/蓝) 向上，客队色向下
  - 半场分割线标注 "HT"
  - 高度约 60px，宽度撑满内容区

- **比赛势头图 (Momentum Graph):**
  - 横轴: 0-90 分钟，纵轴: 进攻势头强度
  - 上下波动的面积图，主队向上客队向下
  - 进球时间点标注 ⚽ 图标
  - 高度约 80px

- **最佳球员卡片 (Player of the Match):**
  - 球员照片(48px) + 姓名(15px bold) + 球队徽章(16px)
  - 评分大字(28px bold, Rating Badge 颜色)
  - 关键数据: 进球/助攻/射门/过人 等，横排小标签

- **球队统计对比条 (Team Stats):**
  - 每行: 主队值(右对齐) | 统计名(居中, 12px muted) | 客队值(左对齐)
  - 对比条: 双向水平条，主队色左延伸，客队色右延伸，按比例
  - 更大值加粗(600 weight)
  - 统计项(按顺序): 控球率%, 射门, 射正, 角球, 犯规, 黄牌, 传球(准确率%), 越位
  - 条高 4px，圆角 2px，间距 2px

- **简化球场阵容 (Mini Lineup Pitch):**
  - 缩小版球场(约 60% 大小)，两队并排
  - 球员只显示球衣号，点击跳转 Lineup tab

- **事件时间线 (Event Timeline):**
  - 垂直时间线，居中脊柱，事件左右交替
  - 进球 ⚽: 球员名(bold) + 助攻(muted) + 分钟绿色徽章
  - 乌龙球: 红色分钟徽章 + "(OG)"
  - 黄牌 🟨 / 红牌 🟥: 彩色方块 + 球员名 + 原因(11px)
  - 换人 🔄: 绿↑换入 / 红↓换出 + 分钟
  - VAR: 紫色 "VAR" pill
  - 半场分隔线: "HT 1-0" 居中标签

#### Stats Tab / 技术统计 Tab (FotMob 复刻)
不只是球队对比，还有球员个人统计排行：

- **球队统计对比 (顶部):**
  - 同 Facts tab 的对比条格式
  - 完整统计: 控球率, 射门, 射正, 禁区内射门, 禁区外射门, 被封堵射门, 角球, 越位, 犯规, 黄牌, 红牌, 门将扑救, 传球, 准确传球, 传球成功率
  - 双向对比条 + 加粗优势方

- **球员评分排行 (Player Ratings):**
  - 标题: "球员评分" 15px bold
  - 两列: 主队(左) | 客队(右)
  - 每列按评分降序排列
  - 每行: 排名数字 | 球员头像(24px) | 姓名(13px) | 评分徽章(Rating Badge)
  - Top 1 球员高亮: 更大字号(15px)，金色边框
  - 点击球员跳转详情页

- **单项数据排行 (Top Players by Stat):**
  - 射门排行: 球员名 + 射门数(总/射正) 柱状条
  - 传球排行: 球员名 + 传球数 + 准确率
  - 抢断排行: 球员名 + 抢断数
  - 过人排行: 球员名 + 成功/尝试
  - 每项用水平柱状图，最大值撑满，其他按比例

#### Lineup Tab (FotMob 高度复刻)
- **整体布局:** 单一球场视图，两队阵型左右并排显示在同一块球场上
- **球场上方头部:**
  - 左: 主队平均评分(圆形徽章) + 球队名 + 阵型文字(如 "4-4-2")
  - 右: 客队平均评分(圆形徽章) + 球队名 + 阵型文字(如 "4-2-3-1")
  - 评分徽章用 Rating Badge 颜色规则
- **球场可视化:**
  - 背景: 深绿渐变 (`#1a5c2a` → `#1d6b30`)，圆角 12px
  - 球场线: 白色 15% 透明度，包含中圈、禁区、球门区、中线
  - 球场分左右两半: 主队占左半场（门将在最左），客队占右半场（门将在最右）
  - 球员节点 (每个节点包含):
    - 球员头像圆形 (28px)，白色边框 2px
    - 评分: 节点左上角小圆(18px)，背景色按评分等级着色，白色字
    - 球衣号 + 姓名: 节点下方，12px 白色文字，居中
    - 被换下标记: 分钟数 + 绿色↑箭头(换上球员) 或 红色↓箭头(被换下)
    - 进球标记: ⚽ 小图标在名字旁
    - 黄/红牌标记: 小方块图标
  - 节点按阵型位置排列: GK→DF→MF→FW，间距均匀分布
- **视图切换按钮行:** 球场下方，灰色圆角按钮组
  - 默认 | 距离 | 速度 | 转会价值 | 年龄 | 国家
  - 切换后球场上的数字显示对应数据（我们暂时只实现默认/年龄）
- **替补球员区:**
  - 球场下方，两列布局（主队左，客队右）
  - 标题: "替补" 12px muted
  - 每行: 头像(24px) + 球衣号(12px muted) + 姓名(13px) + 评分徽章
  - 上场的替补显示换入分钟 (绿色文字)
- **教练:**
  - 替补区下方，单行: "教练" 标签 + 教练名字
- **球员点击** → 跳转到球员详情页

#### H2H Tab / 对决 Tab (FotMob 复刻)
历史交锋和近期战绩对比：

- **历史交锋统计 (Head-to-Head Summary):**
  - 顶部三列: 主队胜场数 | 平局数 | 客队胜场数
  - 数字用 28px bold，下方标签 12px muted
  - 中间平局数用 `var(--text-muted)`，两边用各自球队色

- **历史交锋列表 (Previous Meetings):**
  - 每行: 日期(12px muted) | 赛事标签(Competition Tag) | 主队名 | 比分(15px bold) | 客队名
  - 胜方球队名加粗
  - 最多显示 10 场，"查看更多" 链接

- **近期战绩对比 (Recent Form):**
  - 两列: 主队(左) | 客队(右)
  - 每列显示最近 5 场: 对手徽章(16px) + 比分 + W/D/L 彩色方块
  - W = 绿色 `#22c55e` | D = 灰色 `var(--surface-2)` | L = 红色 `#dc2626`
  - 底部汇总: "5场: 3胜1平1负" 文字

- **联赛排名对比:**
  - 两列: 主队联赛排名 + 积分 | 客队联赛排名 + 积分
  - 简单文字显示

#### Sonar Tab (SonarFC Exclusive)
- Two-column (home vs away), containing:
  - Team header with badge
  - Energy bar (wide, with "Fatigue: XX" text inside, "YY/100" label outside)
  - Quick Stats cards (Squad %, 14d Matches, Travel km)
  - Recent Form momentum bar chart (W/D/L heights, opponent labels)
  - Key Player Load list (colored border-left, name, age, minutes, load level, **role tag**)
  - Role tags: "主力" green pill, "轮换" yellow pill, "板凳" gray pill
  - Absent players (red tag chips)
  - VS Badge center column (shows which team has energy advantage)
- Below two-column: Team Status Comparison bars (centered, full-width)
- Schedule Density timeline (dots on a line)
- AI Pre-match Analysis (green left-border card)

#### Player Performance Cards (in Lineup/Stats)
Each player's match performance shown as a compact card:
- **Header row:** Photo (24px circle) | Name (13px) | Rating pill | Position badge
- **Stat row:** Goals ⚽ | Assists 🅰️ | Shots (on/total) | Passes (acc%) | Tackles | Dribbles
- **Style:** 11px for stat values, icons/emojis for labels, `var(--surface)` background
- **Cards used in:** Lineup tab (expanded view), Player page (match history)

### Player Page (FotMob 复刻 + SonarFC 独有)
- **Header:**
  - 球员照片 (72px 圆形)，球队主色背景渐变（半透明）
  - 姓名 (20px bold) + 球队徽章(20px) + 球队名(13px muted)
  - 球衣号 + 位置 + 国籍旗帜
  - 平均评分 (Rating Badge, 大号 36px)
  - **SonarFC 独有:** Energy 分数 + Role Tag (主力/轮换/板凳)
- Tab bar: 概览 | 数据统计 | 比赛 | **体能** (SonarFC)

#### 概览 Tab (FotMob 复刻)
- **能力雷达图 (Radar Chart):**
  - SVG 六边形雷达图，6 个维度
  - 前锋: 进球/射门/助攻/过人/速度/做球
  - 中场: 传球/助攻/抢断/盘带/远射/关键传球
  - 后卫: 抢断/拦截/头球/传球/对抗/封堵
  - 门将: 扑救/出击/传球/反应/制空
  - 填充色: 球队主色 20% 透明度，边线: 球队主色
  - 大小: 200×200px，居中显示
  - 背景: 同心六边形参考线 (3 层, `var(--border)` 颜色)

- **赛季统计柱状条 (Season Stats Bars):**
  - FotMob 标志性的绿色水平柱状条
  - 每行: 统计名(左, 13px) | 柱状条(绿色 `#22c55e`, 按比例) | 数值(右, 13px bold)
  - 统计项 (按位置不同):
    - 通用: 出场, 首发, 进球, 助攻, 黄牌, 红牌
    - 攻击: 射门/场, 射正/场, 过人成功/场
    - 传球: 传球/场, 关键传球/场, 传球成功率
    - 防守: 抢断/场, 拦截/场, 对抗胜率
  - 柱状条高度 8px, 圆角 4px, 背景 `var(--surface-2)`
  - 超过联赛同位置平均值的条用更亮绿色

- **评分趋势折线图 (Rating Trend):**
  - SVG 折线图, 横轴: 最近 10 场比赛, 纵轴: 评分 (5.0-10.0)
  - 线色: `var(--primary)`, 数据点: 实心圆(4px)
  - 背景区域: 7.0 以上浅绿, 6.0 以下浅红
  - X 轴标签: 对手徽章(12px) + 日期

- **近期比赛 (Recent Matches, 最近5场):**
  - 每行: 日期 | 对手徽章+名 | 比分 | 评分徽章 | 出场分钟 | 进球/助攻图标
  - 点击跳转比赛详情

#### 数据统计 Tab (FotMob 复刻)
- **全赛季统计表格:**
  - 按赛事分组 (联赛/杯赛/欧战/国际)
  - 列: 赛事 | 出场 | 首发 | 进球 | 助攻 | 黄牌 | 红牌 | 评分
  - 底部汇总行 (bold)

- **详细统计柱状条 (同概览 Tab 的绿色条):**
  - 分组: 进攻 | 传球 | 防守 | 纪律
  - 每组 4-6 项统计，绿色水平条 + 数值

#### 比赛 Tab
- **完整比赛历史:**
  - 每行: 日期 | 赛事标签(Competition Tag) | 主队 vs 客队 | 比分 | 出场分钟 | 评分徽章 | 进球⚽/助攻🅰️
  - 颜色编码: 胜(绿色左边框) / 平(灰色) / 负(红色)
  - 筛选: 全部 | 联赛 | 杯赛 | 欧战 | 国际
  - 分页或无限滚动

#### 体能 Tab (SonarFC Exclusive)
- Season Minutes by Matchweek (bar chart, 34 bars, red for high-fatigue week)
- Summary stats grid (6 cards):
  - Season Total Minutes | Last 14 Days Minutes | Appearances (starts/subs)
  - Rotation Risk | ACWR | Recovery Factor
- 30-Day Fatigue Trend (SVG sparkline with danger zone shading)
- Injury History timeline (colored dot + description + status)

### League Page (FotMob 复刻 + SonarFC 独有)
- **Header:**
  - 联赛图标 (48px) + 联赛名 (20px bold) + 国家标签
  - 赛季选择器 (pill 样式，左右箭头切换)
  - **SonarFC 独有:** League Fatigue Overview mini bar (联赛平均疲劳)
- Tab bar: 积分榜 | 赛程 | 射手榜 | 统计 | **体能排行** (SonarFC)

#### 积分榜 Tab (FotMob 复刻)
- **积分榜表格:**
  - 列: # | 球队徽章+名 | 赛(P) | 胜(W) | 平(D) | 负(L) | 进(GF) | 失(GA) | 净(GD) | 积分(Pts) | 近况(Form)
  - 字号: 球队名 15px medium, 数据 13px mono
  - 行高: 44px, 交替行背景 #F8F8F8 / white (dark: #1A1A1A / #111)
  - **近况 (Form) 列:** 最近 5 场彩色方块(12px)
    - W = `#00C853` | D = `#9E9E9E` | L = `#FF1744` 
    - 圆角 2px, 间距 3px
    - 悬浮显示: "vs 对手 比分"
  - **排名区间色条 (左边框 3px):**
    - 欧冠区 = `#2979FF` (蓝) | 欧联区 = `#FF9800` (橙)
    - 附加赛区 = `#7C4DFF` (紫) | 降级区 = `#FF1744` (红)
  - 当前选中球队行高亮: 背景 `rgba(0, 200, 83, 0.08)`
  - **SonarFC 独有:** Energy 列 (最后一列)
    - 列头: ⚡ Energy, 绿色 accent
    - 值: 0-100 数字 + 颜色编码 (同 fatigue 分级)

#### 赛程 Tab (FotMob 复刻)
- **按轮次分组 (Matchday):**
  - 标题: "第 X 轮" + 日期范围
  - 每场比赛一行:
    - 主队徽章(20px) + 主队名 | 比分(17px bold mono) | 客队名 + 客队徽章(20px)
    - 未踢比赛: 显示开球时间 + 日期
    - 已踢比赛: 比分, FT 标记
    - 进行中: 绿色脉冲圆点 + 当前时间
  - 点击进入比赛详情页
- **筛选:** 全部轮次 | 下一轮 | 上一轮

#### 射手榜 Tab (FotMob 复刻)
- **双列布局:**
  - 左: 射手榜 (Goals) | 右: 助攻榜 (Assists)
  - 切换 tab: 射手 | 助攻 | 评分 | 净胜球
- **每行:**
  - 排名(14px) | 球员照片(32px 圆) | 球员名(15px) + 球队名(12px muted) | 数值(17px bold)
  - Top 3 排名数字用金/银/铜色
  - 行间距 8px, 行高 48px
- **射手榜额外信息:**
  - 点击展开: 进球明细 (左脚/右脚/头球, 点球, 助攻数)
  - 进球趋势 mini sparkline (宽 60px)

#### 统计 Tab (FotMob 复刻)
- **联赛统计卡片网格 (2列):**
  - 场均进球 | 场均控球 | 场均射门 | 场均传球
  - 场均角球 | 场均犯规 | 场均红黄牌 | 场均扑救
  - 每张卡片: 统计名(12px) + 数值(24px bold) + 趋势箭头
- **球队统计排名 (可切换):**
  - 进攻: 进球 | 射门 | 射正 | xG | 控球率
  - 防守: 失球 | 扑救 | 抢断 | 拦截 | 净胜球
  - 传球: 传球数 | 传球成功率 | 关键传球
  - 每行: 排名 | 球队徽章+名 | 数值 | 水平进度条(max=联赛最高值)
  - 进度条颜色: 绿色渐变 (越高越深)

#### 体能排行 Tab (SonarFC Exclusive)
- **球队体能排行:**
  - 按 Team Fatigue Index (TFI) 排序
  - 每行: 排名 | 球队徽章+名 | TFI 分数(大字) | Energy Bar | 趋势箭头
  - Energy Bar: 120px 宽, 渐变色 (红→黄→绿)
  - 趋势: 对比上一轮 TFI, ↑↓ 箭头 + 变化值
- **疲劳热力图:**
  - X 轴: 最近 10 轮, Y 轴: 20 支球队
  - 单元格颜色: 红(高疲劳) → 绿(低疲劳)
  - 悬浮显示: "球队名 第X轮 TFI: XX"
- **主力球员疲劳排行:**
  - 全联赛球员按 PFI 排序 (仅显示主力)
  - Top 20 最疲劳球员
  - 每行: 排名 | 球员照片 | 名字 | 球队 | PFI | 近 7 天分钟数 | ACWR

### Team Page (FotMob 复刻 + SonarFC 独有)
- **Header:**
  - 球队徽章 (56px) + 球队名 (20px bold) + 联赛标签
  - 关注按钮 (绿色 pill)
  - **SonarFC 独有:** Team Energy 分数 + level 标签
- Tab bar: 概览 | 阵容 | 赛程 | **体能** (SonarFC) | 统计 | 转会

#### 概览 Tab (FotMob 复刻)
- **赛季战绩日历 (Form Calendar):**
  - 网格布局，每场比赛一个小方块(20px)
  - W=绿色 | D=灰色 | L=红色 | 未踢=白色边框
  - 悬浮显示: 对手+比分
  - 按时间从左到右排列，每行约 10 场

- **积分榜摘要:**
  - 当前排名、积分、胜平负
  - 与上一名和下一名的分差

- **近期赛程 (Next Matches):**
  - 最近 5 场已结束 + 未来 3 场
  - 每行: 日期 | 赛事标签 | 对手徽章+名 | 比分/时间 | 主/客标记

- **最佳射手/助攻 (Top Scorers/Assists):**
  - 两列: 射手榜(左) | 助攻榜(右)
  - 每行: 排名 | 球员照片(24px) | 名字 | 数值

- **新闻摘要:** 最新 3-4 条相关新闻 (如有)

#### 阵容 Tab (FotMob 复刻)
- **迷你阵型图:**
  - 球场俯视图，首选阵型，球员头像定位
  - 点击球员跳转球员页

- **球员列表 (按位置分组):**
  - 门将 / 后卫 / 中场 / 前锋
  - 每行: 照片(32px) | 球衣号 | 姓名(15px) | 国旗 | 年龄 | 出场数 | 进球 | 助攻 | 评分徽章
  - 点击跳转球员页
  - **SonarFC 独有:** 最右列显示 Energy 分数 + mini energy bar

#### 赛程 Tab
- **完整赛季赛程:**
  - 按月分组
  - 每行: 日期 | 赛事标签 | 对手徽章+名 | 比分/时间 | 主/客 | 结果色条(左边框)
  - 筛选: 全部 | 联赛 | 杯赛 | 欧战

#### 体能 Tab (SonarFC Exclusive)
- Squad Energy grid (每张卡片):
  - **球员头像** (36px 圆形，R2 CDN) + **Energy badge** (18px 圆形，叠在头像右下角，颜色编码背景+白色数字，2px surface 边框)
  - 姓名 (13px bold) + 球衣号码 (#XX, 10px muted) + 角色标签 (right-aligned)
  - 位置 + 14日出场分钟 + 年龄 (10px muted)
  - Mini energy bar (3px, 颜色编码)
  - 左边框 3px 颜色编码 (red/yellow/green)
  - Grid: `repeat(auto-fill, minmax(200px, 1fr))`
- **缺阵球员** (每行):
  - 球员头像 (40px 圆形，`grayscale(60%) opacity(0.8)` 表示不可用)
  - 伤病/警告图标叠在头像右上角
  - 姓名 + 球衣号码 + 位置
  - 伤情描述 (11px muted)
  - 状态 pill: 伤停(红色) / 存疑(橙色) / 停赛(蓝色)
- 角色分布饼图: 主力/轮换/板凳比例
- 赛程密集度时间线: 未来 30 天赛程密度可视化

### 球员显示规范（全局）
所有涉及球员信息展示的地方，必须包含球员头像。具体规格：
- **评分排行列表** (Stats Tab): 24px 圆形头像 + 排名 + 姓名 + 评分 badge。Top 1 球员金色边框高亮
- **替补球员列表** (Lineup Tab): 24px 圆形头像 + 球衣号 + 姓名 + 评分 badge
- **射手/助攻榜**: 32px 圆形头像 + 排名 + 姓名 + 球队 + 数值
- **疲劳排行**: 32px 圆形头像 + 排名 + 姓名 + 球队 + Energy 值 + 时间统计
- **头像来源**: `https://pub-37e90a160b6842ac9ab60cf44b39b380.r2.dev/players/{api_football_player_id}.png`
- **头像 fallback**: 加载失败时显示 `var(--surface-2)` 圆形 + 球衣号码文字

### World Cup Hub
- Dark red gradient header (#56042c → #8a1538) with tournament stats
- Tab bar: Squad Load | Travel Map | Recovery | Groups | Matches
- National Team Season Workload rankings (country flag, UCL player %, avg minutes, energy score)
- Group Stage Recovery Analysis: match-to-match timeline showing days gap, travel distance, timezone shift
- AI analysis of logistics impact
- Travel Distance comparison cards

## Data Display Components

### Rating Badge
Player match rating displayed as a colored pill:
- **Size:** 28px × 20px, border-radius: 10px
- **Colors by value:**
  - ≥ 9.0: `#1a932e` background, white text (exceptional)
  - 8.0-8.9: `#22c55e` background, white text (great)
  - 7.0-7.9: `var(--surface-2)` background, `var(--text)` text (good)
  - 6.0-6.9: `#f59e0b` background, white text (average)
  - < 6.0: `#dc2626` background, white text (poor)
- **Font:** 12px, bold, tabular-nums

### Competition Tag
Small pill showing which competition a match belongs to:
- **Style:** 10px text, 2px border-radius, 4px 6px padding
- **Colors:**
  - PL/LL/SA/BL/L1 (league): `var(--primary)` border, `var(--primary-light)` background
  - UCL/UEL (European): `#1e3a8a` border, `#dbeafe` background
  - FAC/CDR/CI/DFB/CDF (cup): `#7c3aed` border, `#ede9fe` background
  - UNL/FRI/WCQ (international): `#ea580c` border, `#fff7ed` background
  - WC (World Cup): `#8a1538` border, `#fce4ec` background

### Role Tag
Player role classification displayed as a mini pill:
- **Starter (主力):** `#22c55e` background, white text, "主力"
- **Rotation (轮换):** `#f59e0b` background, white text, "轮换"
- **Bench (板凳):** `var(--surface-2)` background, `var(--text-muted)` text, "板凳"
- **Size:** 10px text, 2px border-radius, 3px 6px padding

### Stat Comparison Bar
Used in match stats tab for two-team stat comparison:
- **Height:** 4px, border-radius: 2px
- **Home portion:** `var(--primary)`, right-aligned
- **Away portion:** `var(--text-light)`, left-aligned
- **Gap:** 2px between home and away portions
- **Total width:** 100% of column, proportional to values

### Event Timeline Spine
Vertical line connecting match events:
- **Line:** 2px wide, `var(--border)` color
- **Event dot:** 8px circle on the spine, colored by event type
  - Goal: `#22c55e` | Card: `#f59e0b` / `#dc2626` | Substitution: `#3b82f6` | VAR: `#8b5cf6`
- **Connector:** Horizontal 16px line from spine to event card

### Formation Pitch
Mini pitch visualization for lineup display:
- **Aspect ratio:** 3:4 (width:height)
- **Background:** `#1a5c2a` (dark pitch green)
- **Lines:** 1px white, 20% opacity (center circle, penalty box, halfway line)
- **Player dots:** 28px circles, white border, jersey number inside (11px)
- **Home team:** Positioned top-to-bottom (GK at bottom)

## Loading & Skeleton States

数据产品的加载体验直接影响感知性能。空白页面 = 用户流失。

### Skeleton Screen 规范
- **颜色:** `var(--surface-2)` 背景，`var(--surface)` 上层，形成微妙对比
- **动画:** 从左到右的 shimmer 光泽扫过，`background-size: 200%`，动画 1.5s ease-in-out infinite
- **圆角:** 与实际组件一致（文字行 4px，头像 50%，卡片 6px）
- **不要:** 用 spinner。数据产品用 skeleton 模拟布局结构，用户知道内容要来了

### 各页面 Skeleton
- **Match Feed 首页:**
  - 联赛分组标题: 12px 高灰条（宽 120px）
  - 每个比赛行: 左侧 20px 圆 + 100px 灰条 | 中间 40px 灰条 | 右侧 20px 圆 + 100px 灰条
  - Energy bar 区: 两条 8px 高灰条，中间 "Energy" 标签保持不变
  - 默认显示 8 行 skeleton 比赛行
- **Match Detail:**
  - Header: 两个 56px 圆 + 中间 28px 高灰条（比分位置）
  - Tab 内容区: 根据 active tab 显示对应 skeleton
  - Facts tab skeleton: 60px 高矩形（控球率图位置）+ 6 行对比条 skeleton
- **积分榜:**
  - 表头保持真实文字
  - 每行: 20px 序号 + 20px 圆(徽章) + 100px 灰条(队名) + 6 个 30px 灰条(数据列)
  - 显示 20 行
- **球员页:**
  - Header: 72px 圆(照片) + 两行灰条(姓名+球队)
  - 雷达图区: 200px 灰色六边形轮廓

### 页面切换
- Tab 切换: 立即显示 skeleton，数据到达后 fade-in 替换（150ms opacity transition）
- 页面跳转: 新页面直接 skeleton，不显示上一页残影

## Empty States

无数据时的占位设计。不要空白，要告诉用户为什么没数据、什么时候会有。

### 通用样式
- **容器:** 居中，max-width 280px，padding 40px 0
- **图标:** 32px，`var(--text-light)` 颜色，用简单 line icon（不用插画）
- **标题:** 15px，`var(--text)` 颜色，font-weight 500
- **描述:** 13px，`var(--text-muted)` 颜色，居中对齐
- **CTA 按钮（如有）:** 绿色 pill 按钮，13px

### 具体场景
- **无比赛日:** ⚽ 图标 + "今天没有比赛" + "试试切换日期查看其他比赛日" + 日期选择器 CTA
- **联赛休赛期:** 📅 图标 + "联赛暂未开赛" + "预计 {start_date} 开始新赛季"
- **球员无数据:** 📊 图标 + "暂无统计数据" + "该球员本赛季尚未出场"
- **伤病信息缺失:** 🏥 图标 + "暂无伤病信息" + "数据来源更新后将自动展示"
- **搜索无结果:** 🔍 图标 + "未找到 '{query}'" + "试试换个关键词"
- **Sonar Tab 无数据:** 📡 图标 + "体能数据计算中" + "新赛季开始后将自动生成"

## Search UI

全局搜索，快速找到球队、球员、联赛。

### 搜索入口
- **位置:** 顶部导航栏右侧，收起状态显示 🔍 图标按钮
- **展开:** 点击后 input 从右侧滑出，宽度 280px，autofocus
- **快捷键:** `/` 触发搜索（数据产品标配）
- **输入框样式:** `var(--surface)` 背景，`var(--border)` 边框，13px 文字，圆角 6px，padding 8px 12px

### 搜索结果
- **触发:** 输入 2+ 字符后 debounce 300ms 开始搜索
- **下拉面板:** 固定宽度 360px，max-height 400px，`var(--background)` 背景，`var(--border)` 边框，圆角 8px，box-shadow: `0 4px 12px rgba(0,0,0,0.1)`
- **结果分组:**
  - "球队" 组标题 (11px, `var(--text-light)`, uppercase)
  - "球员" 组标题
  - "联赛" 组标题
- **每条结果:**
  - 球队: 徽章(20px) + 球队名(15px) + 联赛标签(11px muted)
  - 球员: 头像(20px 圆) + 球员名(15px) + 球队名(12px muted) + 位置(12px muted)
  - 联赛: 联赛图标(20px) + 联赛名(15px) + 国家(12px muted)
- **高亮:** 匹配文字用 `<mark>` 标签，背景 `var(--primary-light)`
- **键盘导航:** ↑↓ 选择，Enter 跳转，Esc 关闭
- **行高:** 40px，hover 背景 `var(--surface)`

## Share / 分享截图

赛前状态截图是 SonarFC 的核心传播载体。每张截图都是一次品牌曝光。

### 分享按钮
- **位置:** Match Detail 页右上角，🔗 图标按钮，与其他操作按钮同行
- **Sonar Tab:** 额外的 "分享 Sonar 报告" 绿色 pill 按钮，在 tab 内容底部

### 截图生成（Canvas/html2canvas）
- **尺寸:** 1080×1920px（9:16 竖屏，适配微信/小红书/Instagram Story）
- **备选:** 1080×1080px（1:1 正方形，适配微博/Twitter）
- **背景:** `var(--background)` + 顶部 80px 品牌区
- **品牌区:**
  - 左: SonarFC logo + 文字标识，`var(--primary)` 绿色
  - 右: 日期 + 赛事标签
  - 底部细线: `var(--primary)` 1px
- **内容区:** 复用 Sonar Tab 的两列布局，但字号放大 20%（截图缩小后仍可读）
- **底部水印:**
  - "SonarFC — Pre-match Condition Intelligence" 11px `var(--text-light)`
  - 二维码（可选，链接到该比赛的 Sonar 页）
  - 高度 60px

### 分享流程
1. 用户点击分享按钮 → 弹出底部 sheet
2. 选择格式: 竖屏(9:16) / 正方形(1:1)
3. 预览截图 → 点击"保存图片"或"复制到剪贴板"
4. 底部 sheet 高度 auto，圆角 12px top，backdrop blur

## Match Feed 首页交互

### 日期选择器
- **位置:** 内容区顶部，横向滚动日期条
- **当前样式:** 每天一个 pill，宽 60px，高 44px
  - 上方: 星期几(11px, `var(--text-light)`)
  - 下方: 日期数字(15px, font-weight 500)
- **选中状态:** `var(--primary)` 背景，白色文字，圆角 8px
- **今天标记:** 日期数字下方有 4px 绿色圆点
- **滚动:** 可左右滑动，默认居中显示今天，左侧 3 天 + 右侧 7 天可见
- **无比赛日期:** 文字颜色 `var(--text-light)`，选中后仍显示空状态

### 联赛筛选
- **位置:** 左侧栏（desktop）或日期选择器下方可折叠（mobile）
- **列表项:** 联赛图标(20px) + 联赛名(13px)，行高 36px
- **选中状态:** 左边框 3px `var(--primary)`，背景 `var(--primary-light)`
- **"全部联赛":** 列表顶部，默认选中
- **关注的联赛:** 单独分组置顶，标题 "My Leagues"(11px uppercase muted)

### 比赛列表滚动
- **策略:** 单日数据量有限（通常 20-50 场），一次性加载，不需要无限滚动
- **分组:** 按联赛分组，每组标题 sticky 在顶部
- **分组标题:** 联赛图标(16px) + 联赛名(13px medium) + 比赛数(12px muted)，背景 `var(--surface)`，padding 8px 16px
- **Live 比赛:** 置顶分组 "LIVE"，绿色脉冲圆点 + 绿色文字

### 下拉刷新
- **触发:** 下拉 60px 触发刷新
- **指示器:** 绿色 spinner（仅此处用 spinner，因为是用户主动触发）
- **文字:** "松开刷新" → "加载中..." → "已更新"

## Pro 付费墙 UI

免费用户可以看球队级 TFI（Team Fatigue Index），Pro 用户解锁球员级 PFI（Player Fatigue Index）。

### 模糊锁定
- **适用区域:** Player 体能 Tab、Sonar Tab 的 Key Player Load 详细数据、球员页的 Energy 分数
- **模糊效果:** `filter: blur(6px)` + `pointer-events: none`
- **叠加层:** 半透明白色 `rgba(255,255,255,0.7)` (dark mode: `rgba(0,0,0,0.5)`)
- **锁定图标:** 🔒 24px 居中
- **CTA 文字:** "升级 Pro 查看球员体能数据" 15px `var(--text)` font-weight 500
- **按钮:** "升级 Pro" 绿色 pill 按钮，13px，padding 8px 20px

### 免费预览
- **策略:** 每场比赛的 Sonar Tab 显示前 2 名关键球员的数据（诱饵），其余模糊
- **提示:** 模糊区域上方显示 "还有 {n} 名球员的体能数据" 12px muted

### Pro 标记
- **位置:** Tab 名称旁边，如 "体能 PRO"
- **样式:** "PRO" 小标签，10px，`#f59e0b` 背景，白色文字，圆角 2px，padding 1px 4px

## Asset URLs
- **R2 Public Domain:** `https://pub-37e90a160b6842ac9ab60cf44b39b380.r2.dev/`
- **Teams:** `teams/{api_football_team_id}.png` (e.g., `teams/40.png` for Liverpool)
- **Leagues:** `leagues/{api_football_league_id}.png` (e.g., `leagues/39.png` for Premier League)
- **Players:** `players/{api_football_player_id}.png` (e.g., `players/28.png` for Salah)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | High-fidelity FotMob clone as base | User wants to replicate proven UX, add SonarFC modules on top |
| 2026-04-07 | Green #1a932e as primary | FotMob green, natural football association |
| 2026-04-07 | System font stack, no web fonts | ~~Fastest load, matches FotMob's clean utility feel~~ **Superseded 2026-04-10** |
| 2026-04-10 | Geist + DM Sans for EN/numbers, system fonts for CN | Geist tabular-nums 让比分/统计数字更锐利对齐，DM Sans 给英文 UI 品牌辨识度，中文保持系统字体避免 3-5MB 字体文件 |
| 2026-04-10 | Added Loading/Skeleton states spec | 数据产品不能空白加载，skeleton screen 模拟布局结构提升感知性能 |
| 2026-04-10 | Added Empty states spec | 无比赛日、无数据等场景需要告诉用户为什么没数据、什么时候会有 |
| 2026-04-10 | Added Search UI spec | 全局搜索是数据产品的基础交互，球队/球员/联赛快速查找 |
| 2026-04-10 | Added Share screenshot spec | 赛前状态截图是核心传播载体，9:16 竖屏 + 品牌水印，每张截图都是品牌曝光 |
| 2026-04-10 | Added Match Feed interaction details | 日期选择器、联赛筛选、比赛分组、Live 置顶等首页交互细节 |
| 2026-04-10 | Added Pro paywall UI spec | 免费看 TFI / Pro 解锁 PFI，模糊锁定 + 预览诱饵 + CTA 按钮 |
| 2026-04-10 | Energy bar → inline Energy pill | 独立 energy bar 行信息密度低，改为 11px 色块 pill 嵌入 match row 同行。Grid 从 5 列变 7 列 |
| 2026-04-07 | Energy bar inverted from fatigue | Long bar = good state is universal "health bar" intuition. Fatigue-up = confusing |
| 2026-04-07 | Two-column Sonar Tab layout | Matches prototype design, enables side-by-side team comparison |
| 2026-04-07 | World Cup page with dark red header | Visual differentiation for tournament mode, FIFA brand association |
| 2026-04-08 | Match Detail expanded to 4 tabs (Facts/Lineup/Stats/Sonar) | New data: events timeline, team stats, player ratings, formations |
| 2026-04-08 | Competition-colored tags for cups/international | Visual distinction between league, cup, European, international matches |
| 2026-04-08 | Role tags (主力/轮换/板凳) in Sonar and Player pages | Fatigue algorithm v3 classifies player roles, surface this to users |
| 2026-04-08 | Rating badge with 5-tier color scale | FotMob-style player ratings now available from API-Football |
| 2026-04-08 | Player Stats tab with attacking/passing/defending/discipline grid | Full per-match player statistics now synced |
| 2026-04-08 | Player Matches tab with competition filter chips | Players now have cup + international match data, need filtering |
| 2026-04-08 | Typography scale bumped up across the board | User feedback: fonts too small, match core info visually weak. Body 13→15px, scores 15→17/28px, page titles 18→20px |
| 2026-04-08 | Match row min-height 52px, padding increased | Previous version too compact, core match info (teams + score) didn't pop |
