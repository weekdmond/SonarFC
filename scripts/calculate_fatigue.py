"""
SonarFC — 疲劳指数计算脚本 v2
基于运动科学文献的真实疲劳模型。

核心模型:
  1. EWMA-ACWR (Exponentially Weighted Moving Average - Acute:Chronic Workload Ratio)
     - Acute window: 7天, λ_a = 2/8 = 0.25
     - Chronic window: 28天, λ_c = 2/29 ≈ 0.069
     - Sweet spot: 0.80-1.30 (Gabbett 2016)
     - 参考: Williams et al. (2017, BJSM)

  2. Recovery Deficit Model
     - 90分钟比赛完全恢复: 72小时 (Nédélec et al. 2012)
     - 加时赛: 96小时
     - 恢复曲线: 指数衰减, 非线性

  3. Age Recovery Factor
     - 23-27岁为基线(1.0), 30岁后每年下降约4%
     - 参考: Carling et al. (2012)

  4. Position Load Multiplier
     - 基于 Bradley et al. (2009), Bush et al. (2015) 的英超位置跑动数据
     - 边锋(W) > 边后卫(FB) > 中场(CM) > 前锋(ST) > 中后卫(CB) > 门将(GK)

  5. Fixture Congestion Penalty
     - <3天间隔: 受伤风险 2.5-6x (Bengtsson et al. 2013)
     - 参考: Dupont et al. (2010), Dellal et al. (2015)

  6. Competition Load Factor
     - 欧冠/欧联客场: 额外旅行疲劳
     - 参考: Bengtsson et al. (2018)

输出:
  TFI (Team Fatigue Index): 0-100
  PFI (Player Fatigue Index): 0-100
  0=完全恢复, 100=极度疲劳

  Energy = 100 - Fatigue (前端显示用)
"""

import os
import sys
import math
from datetime import datetime, timedelta
from collections import defaultdict

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

SB_REST = f'{SUPABASE_URL}/rest/v1'
sb_headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}

# ─── 运动科学常数 ─────────────────────────────────────────

# EWMA 衰减因子 (Williams et al. 2017)
LAMBDA_ACUTE = 2 / (7 + 1)    # 0.25 (7天窗口)
LAMBDA_CHRONIC = 2 / (28 + 1)  # ~0.069 (28天窗口)

# 恢复时间常数 (Nédélec et al. 2012)
FULL_RECOVERY_HOURS_90MIN = 72   # 90分钟比赛完全恢复
FULL_RECOVERY_HOURS_ET = 96      # 加时赛完全恢复
RECOVERY_TAU = 20                # 恢复指数衰减常数(小时)

# ACWR 阈值 (Gabbett 2016; Blanch & Gabbett 2016)
ACWR_SWEET_LOW = 0.80
ACWR_SWEET_HIGH = 1.30
ACWR_DANGER = 1.50

# 位置负荷权重 (Bradley et al. 2009; Bush et al. 2015)
# 基于 HSR + 总距离 + 加速/减速次数的综合排序
POSITION_LOAD = {
    'GK': 0.35,   # 门将: ~6km, 最低负荷
    'DF': 0.72,   # 后卫(综合): ~10km, 中低负荷
    'MF': 0.88,   # 中场: ~12km, 最高总距离但HSR中等
    'FW': 0.82,   # 前锋: ~10.5km, 高HSR间歇性
}

# 更细分的位置 (如果数据支持)
POSITION_LOAD_DETAILED = {
    'GK': 0.35,
    'CB': 0.68,   # 中后卫
    'FB': 0.92,   # 边后卫: 攻守转换频繁
    'LB': 0.92,
    'RB': 0.92,
    'DM': 0.82,   # 后腰
    'CM': 0.88,   # 中场
    'AM': 0.90,   # 攻击型中场
    'LM': 0.95,   # 边前卫
    'RM': 0.95,
    'LW': 1.00,   # 边锋: 最高HSR和sprint
    'RW': 1.00,
    'ST': 0.80,   # 中锋
    'CF': 0.82,   # 影锋
}

# 赛程密集度风险系数 (Bengtsson et al. 2013)
CONGESTION_RISK = {
    6: 1.0,   # ≥6天间隔: 基线
    5: 1.1,
    4: 1.4,   # 4天间隔
    3: 2.0,   # 3天间隔
    2: 3.5,   # 2天间隔
    1: 5.0,   # 1天间隔 (几乎不可能但作为上限)
    0: 6.0,
}

# 欧战联赛 API-Football IDs (用于旅行惩罚)
EUROPEAN_COMP_IDS = {2, 3}  # UCL, UEL
INTERNATIONAL_COMP_IDS = {1}  # World Cup


def sb_select(table, select='*', params=None):
    """Supabase REST API select，自动分页加载全量数据。"""
    url = f'{SB_REST}/{table}'
    h = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Range-Unit': 'items',
        'Prefer': 'count=exact',
    }
    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        p = {'select': select, 'limit': str(page_size), 'offset': str(offset)}
        if params:
            p.update(params)
        resp = requests.get(url, headers=h, params=p, timeout=30)
        resp.raise_for_status()
        rows = resp.json()
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    return all_rows


def sb_upsert(table, rows, on_conflict=None):
    if not rows:
        return
    url = f'{SB_REST}/{table}'
    if on_conflict:
        url += f'?on_conflict={on_conflict}'
    resp = requests.post(url, headers=sb_headers, json=rows, timeout=30)
    if resp.status_code not in (200, 201):
        print(f'  ⚠️  upsert {table} 失败: {resp.status_code} {resp.text[:200]}')
    return resp


def clamp(v, lo=0.0, hi=100.0):
    return max(lo, min(hi, v))


def parse_kickoff(kickoff_str):
    """解析 kickoff_at 字符串为 datetime"""
    s = kickoff_str.replace('Z', '').replace('+00:00', '')
    if 'T' in s:
        try:
            return datetime.fromisoformat(s)
        except ValueError:
            return datetime.strptime(s[:19], '%Y-%m-%dT%H:%M:%S')
    return datetime.strptime(s[:10], '%Y-%m-%d')


# ─── 年龄恢复因子 ─────────────────────────────────────────
def age_recovery_factor(age):
    """
    返回恢复速度因子。1.0 = 基线 (23-27岁)。
    值越小恢复越慢，意味着疲劳累积更多。
    参考: Carling et al. (2012), Wisloff et al.
    """
    if age is None:
        return 1.0
    if age <= 22:
        return 1.05   # 年轻球员恢复略快
    elif age <= 27:
        return 1.0    # 基线
    elif age <= 30:
        return 0.88   # 减慢 12%
    elif age <= 33:
        return 0.78   # 减慢 22%
    elif age <= 36:
        return 0.65   # 减慢 35%
    else:
        return 0.50   # 减慢 50%


# ─── 恢复曲线 ──────────────────────────────────────────────
def recovery_curve(hours_since_match, match_minutes, had_extra_time=False, age_factor=1.0):
    """
    计算距比赛 N 小时后的残余疲劳 (0-1)。
    基于指数衰减模型, 参考 Nédélec et al. (2012)。

    返回值: 0.0 = 完全恢复, 1.0 = 刚踢完比赛
    """
    if hours_since_match < 0:
        return 0.0

    # 比赛强度因子: 分钟数越多、加时赛 → 恢复更慢
    intensity = match_minutes / 90.0
    if had_extra_time:
        intensity *= 1.3  # 加时赛额外 30% 负荷 (Carling et al. 2015)

    # 年龄调整恢复速度: age_factor < 1 → tau 变大 → 衰减更慢
    adjusted_tau = RECOVERY_TAU / age_factor

    # 指数衰减: fatigue = intensity * e^(-t/tau)
    residual = intensity * math.exp(-hours_since_match / adjusted_tau)

    return min(residual, 1.0)


# ─── EWMA 计算 ─────────────────────────────────────────────
def compute_ewma_loads(daily_loads):
    """
    计算 EWMA acute/chronic load 序列。
    daily_loads: dict {date_str: load_value} (连续日期)
    返回: (ewma_acute, ewma_chronic) 最新值
    """
    if not daily_loads:
        return 0.0, 0.0

    sorted_dates = sorted(daily_loads.keys())
    ewma_a = daily_loads[sorted_dates[0]]
    ewma_c = daily_loads[sorted_dates[0]]

    for date_str in sorted_dates[1:]:
        load = daily_loads[date_str]
        ewma_a = load * LAMBDA_ACUTE + (1 - LAMBDA_ACUTE) * ewma_a
        ewma_c = load * LAMBDA_CHRONIC + (1 - LAMBDA_CHRONIC) * ewma_c

    return ewma_a, ewma_c


# ─── 赛程压力因子（球队层面） ─────────────────────────────────
def calculate_schedule_pressure(team_id, matches, league_map, now=None):
    """
    计算球队层面的赛程压力因子。
    这不是完整的 TFI，而是 TFI 的一个组成部分。
    完整的 TFI 由球员 PFI 聚合 + 赛程压力共同决定。

    组成:
      1. 赛程密集度 (match density + min interval)   40%
      2. 恢复时间 (距上场多久)                        25%
      3. 欧战/国际旅行惩罚                            20%
      4. 加时赛惩罚                                   15%
    """
    if now is None:
        now = datetime.utcnow()

    window_28d = now - timedelta(days=28)
    window_14d = now - timedelta(days=14)

    # 该球队过去28天的所有finished比赛
    team_matches = []
    for m in matches:
        if m['home_team_id'] != team_id and m['away_team_id'] != team_id:
            continue
        if m['status'] != 'finished':
            continue
        kt = parse_kickoff(m['kickoff_at'])
        if kt > window_28d:
            team_matches.append((m, kt))

    team_matches.sort(key=lambda x: x[1])

    # ── 1. EWMA-ACWR ──
    # 构建每日负荷 (比赛日=90-120, 非比赛日=0)
    daily_loads = {}
    start = (now - timedelta(days=35)).date()  # 多取7天用于EWMA初始化
    for d in range(42):
        date = start + timedelta(days=d)
        daily_loads[date.isoformat()] = 0.0

    for m, kt in team_matches:
        date_str = kt.date().isoformat()
        minutes = 120 if m.get('has_extra_time') else 90
        # 客场比赛额外 10% 负荷
        is_away = m['away_team_id'] == team_id
        load = minutes * (1.1 if is_away else 1.0)
        daily_loads[date_str] = max(daily_loads.get(date_str, 0), load)

    # ── 1. Recovery Deficit (残余疲劳) ──
    if team_matches:
        last_m, last_kt = team_matches[-1]
        hours_since = (now - last_kt).total_seconds() / 3600
        had_et = last_m.get('has_extra_time', False)
        residual = recovery_curve(hours_since, 120 if had_et else 90, had_et)
        recovery_score = residual * 100
    else:
        recovery_score = 0

    # ── 2. 赛程密集度 ──
    matches_14d = [(m, kt) for m, kt in team_matches if kt > window_14d]
    match_count_14d = len(matches_14d)
    density_score = clamp(match_count_14d / 6 * 100)  # 6场/14天 = 100

    # 最短间隔惩罚
    congestion_mult = 1.0
    intervals = []
    if len(matches_14d) >= 2:
        for i in range(1, len(matches_14d)):
            gap = (matches_14d[i][1] - matches_14d[i-1][1]).total_seconds() / 86400
            intervals.append(gap)
        min_gap = min(intervals) if intervals else 7
        gap_days = int(min_gap)
        congestion_mult = CONGESTION_RISK.get(gap_days, CONGESTION_RISK.get(min(6, gap_days), 1.0))
        density_score = clamp(density_score * (congestion_mult / 2))

    # ── 3. 欧战/国际旅行惩罚 ──
    travel_score = 0
    for m, kt in matches_14d:
        league_api_id = league_map.get(m.get('league_id'))
        is_away = m['away_team_id'] == team_id
        if league_api_id in EUROPEAN_COMP_IDS and is_away:
            travel_score += 35
        elif league_api_id in EUROPEAN_COMP_IDS:
            travel_score += 15
        elif league_api_id in INTERNATIONAL_COMP_IDS:
            travel_score += 25
    travel_score = clamp(travel_score)

    # ── 4. 加时赛惩罚 ──
    extra_time_count = sum(1 for m, _ in matches_14d if m.get('has_extra_time'))
    et_score = clamp(extra_time_count * 45)

    # ── 加权汇总 → 赛程压力分数 (0-100) ──
    schedule_score = (
        density_score * 0.40 +
        recovery_score * 0.25 +
        travel_score * 0.20 +
        et_score * 0.15
    )

    factors = {
        'schedule_score': round(clamp(schedule_score), 1),
        'recovery_deficit': round(recovery_score, 1),
        'match_density': round(density_score, 1),
        'matches_in_14d': match_count_14d,
        'min_interval_days': round(min(intervals, default=7), 1) if intervals else None,
        'congestion_risk_mult': round(congestion_mult, 1),
        'travel_load': round(travel_score, 1),
        'extra_time_penalty': round(et_score, 1),
    }

    return round(clamp(schedule_score), 1), factors


# ─── 球员疲劳指数 (PFI) ────────────────────────────────────
def calculate_player_fatigue(player, player_appearances, matches_by_id, schedule_pressure=0, now=None):
    """
    PFI v3 — 自底向上的球员疲劳模型（不依赖 TFI）。

    球员疲劳是独立计算的，球队疲劳由球员聚合而来。

    组成:
      1. 个人残余疲劳累积          40%  — 基于恢复曲线的多场比赛叠加
      2. 个人 ACWR                 25%  — 个人急性/慢性负荷比
      3. 年龄恢复因子修正           15%  — 30岁以上恢复减慢
      4. 位置负荷修正               10%  — 位置特异性负荷
      5. 赛程压力（球队层面）        10%  — 密集度+旅行+加时

    关键设计:
    - 球员疲劳完全由个人出场数据驱动
    - 恢复曲线是非线性的（指数衰减，72h完全恢复）
    - 球队 TFI 由球员 PFI 自底向上聚合
    """
    if now is None:
        now = datetime.utcnow()

    age = player.get('age') or 25
    position = player.get('position', 'MF')
    recovery_factor = age_recovery_factor(age)
    pos_load = POSITION_LOAD.get(position, 0.80)

    window_14d = now - timedelta(days=14)

    # ── 0. 角色分类: 主力 / 轮换 / 冷板凳 ──
    # 基于28天内的出场模式判断
    starts_28d = 0
    sub_ins_28d = 0
    total_apps_28d = 0
    total_mins_28d = 0

    for app in player_appearances:
        match = matches_by_id.get(app['match_id'])
        if not match:
            continue
        kt = parse_kickoff(match['kickoff_at'])
        if (now - kt).total_seconds() > 28 * 86400:
            continue
        total_apps_28d += 1
        total_mins_28d += app['minutes_played']
        if app.get('is_starter'):
            starts_28d += 1
        else:
            sub_ins_28d += 1

    # 角色判定
    #   主力 (starter): 28天内首发 ≥ 3 次，或首发率 > 60%
    #   轮换 (rotation): 有出场但不满足主力条件
    #   冷板凳 (bench): 28天内 0 出场
    if total_apps_28d == 0:
        role = 'bench'
    elif starts_28d >= 3 or (total_apps_28d >= 2 and starts_28d / total_apps_28d > 0.6):
        role = 'starter'
    else:
        role = 'rotation'

    # ── 1. 个人残余疲劳累积 ──
    total_residual = 0.0
    daily_loads = {}
    start = (now - timedelta(days=35)).date()
    for d in range(42):
        date = start + timedelta(days=d)
        daily_loads[date.isoformat()] = 0.0

    for app in player_appearances:
        match = matches_by_id.get(app['match_id'])
        if not match:
            continue
        kt = parse_kickoff(match['kickoff_at'])
        hours_since = (now - kt).total_seconds() / 3600
        if hours_since < 0 or hours_since > 28 * 24:
            continue

        minutes = app['minutes_played']
        had_et = match.get('has_extra_time', False)
        is_starter = app.get('is_starter', False)

        # 首发强度修正: 首发球员有完整热身 + 赛前准备 + 全场高强度跑动
        # 替补球员虽然也消耗体力，但没有前半段的累积
        # 首发 90 分钟 ≈ 比替补 90 分钟(理论上不会发生)多 15% 的负荷
        starter_multiplier = 1.15 if is_starter else 1.0

        # 残余疲劳叠加
        residual = recovery_curve(
            hours_since, minutes * starter_multiplier, had_et, recovery_factor
        )
        total_residual += residual

        # 记录每日负荷用于 ACWR
        date_str = kt.date().isoformat()
        effective_load = minutes * pos_load * starter_multiplier
        daily_loads[date_str] = max(daily_loads.get(date_str, 0), effective_load)

    residual_score = clamp(total_residual * 60)

    # ── 2. 个人 ACWR ──
    ewma_a, ewma_c = compute_ewma_loads(daily_loads)
    if ewma_c > 0.5:
        personal_acwr = ewma_a / ewma_c
    elif total_apps_28d > 0:
        personal_acwr = 0.3
    else:
        personal_acwr = 1.0

    if ACWR_SWEET_LOW <= personal_acwr <= ACWR_SWEET_HIGH:
        acwr_score = max(0, (personal_acwr - ACWR_SWEET_LOW) / (ACWR_SWEET_HIGH - ACWR_SWEET_LOW) * 25)
    elif personal_acwr > ACWR_SWEET_HIGH:
        acwr_score = 25 + (personal_acwr - ACWR_SWEET_HIGH) / (ACWR_DANGER - ACWR_SWEET_HIGH) * 75
        acwr_score = min(acwr_score, 100)
    else:
        acwr_score = max(0, (ACWR_SWEET_LOW - personal_acwr) / ACWR_SWEET_LOW * 30)

    # ── 3. 年龄修正 ──
    age_score = clamp((1.0 - recovery_factor) * 200)

    # ── 4. 位置修正 ──
    position_score = pos_load * 100

    # ── 5. 赛程压力（球队层面） ──
    schedule_score = schedule_pressure

    # ── 加权汇总（按角色调整权重） ──
    # 主力: 残余疲劳权重最高（因为数据充分）
    # 轮换: ACWR 权重高（替补突然上场 = ACWR spike 风险）
    # 冷板凳: 位置+年龄为主（无出场数据，疲劳低但比赛节奏差）
    if role == 'starter':
        pfi = (
            residual_score * 0.40 +
            acwr_score * 0.20 +
            age_score * 0.15 +
            position_score * 0.10 +
            schedule_score * 0.15
        )
    elif role == 'rotation':
        # 轮换球员的 ACWR 更重要: 出场不规律容易造成急性负荷跳升
        pfi = (
            residual_score * 0.30 +
            acwr_score * 0.30 +
            age_score * 0.15 +
            position_score * 0.10 +
            schedule_score * 0.15
        )
    else:  # bench
        # 冷板凳: 无出场数据，疲劳接近 0，但用年龄和位置给一个基线
        pfi = (
            residual_score * 0.10 +
            acwr_score * 0.10 +
            age_score * 0.20 +
            position_score * 0.15 +
            schedule_score * 0.10
        )
        # 冷板凳球员疲劳本身就该低（他们没踢球）
        # 但标记出来让前端可以显示 "缺乏比赛节奏"

    # 14天内总出场分钟
    mins_14d = sum(
        a['minutes_played'] for a in player_appearances
        if matches_by_id.get(a['match_id']) and
        parse_kickoff(matches_by_id[a['match_id']]['kickoff_at']) > window_14d
    )

    # 14天内首发次数
    starts_14d = sum(
        1 for a in player_appearances
        if a.get('is_starter') and matches_by_id.get(a['match_id']) and
        parse_kickoff(matches_by_id[a['match_id']]['kickoff_at']) > window_14d
    )

    factors = {
        'role': role,
        'starts_28d': starts_28d,
        'sub_ins_28d': sub_ins_28d,
        'total_mins_28d': total_mins_28d,
        'residual_fatigue': round(residual_score, 1),
        'personal_acwr': round(personal_acwr, 2),
        'acwr_score': round(acwr_score, 1),
        'age': age,
        'age_recovery_factor': round(recovery_factor, 2),
        'age_score': round(age_score, 1),
        'position': position,
        'position_load': round(pos_load, 2),
        'position_score': round(position_score, 1),
        'schedule_pressure': round(schedule_score, 1),
        'minutes_14d': mins_14d,
        'starts_14d': starts_14d,
        'appearances_28d': total_apps_28d,
    }

    return round(clamp(pfi), 1), factors


# ─── 球队疲劳指数 (TFI) — 自底向上 ────────────────────────
def aggregate_team_fatigue(player_pfis, schedule_factors):
    """
    TFI v3 — 由球员 PFI 自底向上聚合。

    算法:
      1. 取最近出场的首发球员（或出场分钟最多的 Top 14 人）
      2. 加权平均: 出场越多的球员权重越高
      3. 叠加球队层面的赛程压力因子（密集度、旅行、加时）

    组成:
      球员 PFI 加权平均              70%  — 核心：球员实际疲劳
      赛程压力因子                    30%  — 密集度 + 旅行 + 加时

    为什么 30% 赛程压力？
    - 没有出场数据的球员 PFI 会偏低，赛程压力弥补这个信息缺失
    - 赛程压力对整队有影响（备战、旅行），不只是上场球员
    """
    if not player_pfis:
        return schedule_factors.get('schedule_score', 0), schedule_factors

    # 按角色分组
    starters = [p for p in player_pfis if p.get('role') == 'starter']
    rotation = [p for p in player_pfis if p.get('role') == 'rotation']
    bench = [p for p in player_pfis if p.get('role') == 'bench']

    # 球队疲劳主要由主力和轮换球员决定
    # 主力: 权重 = 出场分钟 × 3 (他们是球队的核心)
    # 轮换: 权重 = 出场分钟 × 1.5
    # 冷板凳: 不参与聚合（他们没踢球，不影响球队整体疲劳）
    ROLE_WEIGHT_MULT = {'starter': 3.0, 'rotation': 1.5, 'bench': 0.0}

    total_weight = 0
    weighted_sum = 0
    for p in player_pfis:
        role_mult = ROLE_WEIGHT_MULT.get(p.get('role', 'bench'), 0)
        if role_mult == 0:
            continue
        # 权重 = 角色系数 × 出场分钟 (至少 1 分钟避免零权重)
        weight = role_mult * max(p.get('minutes_14d', 0), 1)
        weighted_sum += p['pfi'] * weight
        total_weight += weight

    avg_pfi = weighted_sum / total_weight if total_weight > 0 else 0
    schedule_score = schedule_factors.get('schedule_score', 0)

    tfi = avg_pfi * 0.70 + schedule_score * 0.30

    # 找出最累的主力球员
    active_players = starters + rotation
    active_players.sort(key=lambda x: x['pfi'], reverse=True)
    top_player = active_players[0] if active_players else None

    factors = {
        'avg_squad_pfi': round(avg_pfi, 1),
        'starters_count': len(starters),
        'rotation_count': len(rotation),
        'bench_count': len(bench),
        'highest_pfi_player': top_player['name'] if top_player else None,
        'highest_pfi': top_player['pfi'] if top_player else 0,
        'highest_pfi_role': top_player.get('role') if top_player else None,
        'schedule_score': round(schedule_score, 1),
        **{k: v for k, v in schedule_factors.items() if k != 'schedule_score'},
    }

    return round(clamp(tfi), 1), factors


# ─── 主入口 ───────────────────────────────────────────────
def main():
    print('🧮 SonarFC 疲劳指数计算 v3 (自底向上模型)', flush=True)
    print('  球员 PFI → 聚合 → 球队 TFI', flush=True)
    print('  基于: EWMA-ACWR, 指数恢复曲线, 年龄/位置修正\n', flush=True)

    # 加载数据
    print('  📥 加载数据...', flush=True)
    teams = sb_select('teams', 'id,name,api_football_id,league_id')
    players = sb_select('players', 'id,name,team_id,api_football_id,position,age')
    leagues = sb_select('leagues', 'id,api_football_id')

    league_map = {l['id']: l['api_football_id'] for l in leagues}

    cutoff = (datetime.utcnow() - timedelta(days=42)).strftime('%Y-%m-%dT00:00:00Z')
    matches = sb_select('matches', '*', {'kickoff_at': f'gte.{cutoff}'})
    matches_by_id = {m['id']: m for m in matches}
    match_ids = set(matches_by_id.keys())

    appearances = sb_select('appearances', '*')
    appearances = [a for a in appearances if a['match_id'] in match_ids]

    player_apps_map = defaultdict(list)
    for a in appearances:
        player_apps_map[a['player_id']].append(a)

    print(f'  球队: {len(teams)}, 球员: {len(players)}, 比赛: {len(matches)}, 出场: {len(appearances)}', flush=True)

    teams_with_matches = set()
    for m in matches:
        if m.get('home_team_id'):
            teams_with_matches.add(m['home_team_id'])
        if m.get('away_team_id'):
            teams_with_matches.add(m['away_team_id'])

    active_teams = [t for t in teams if t['id'] in teams_with_matches]
    print(f'  有比赛的球队: {len(active_teams)}\n', flush=True)

    # ═══ Step 1: 计算每个球队的赛程压力 ═══
    print('📅 Step 1: 计算赛程压力...', flush=True)
    schedule_map = {}  # team_id → (score, factors)
    for team in active_teams:
        sp_score, sp_factors = calculate_schedule_pressure(
            team['id'], matches, league_map
        )
        schedule_map[team['id']] = (sp_score, sp_factors)

    # ═══ Step 2: 计算每个球员的 PFI（自底向上） ═══
    print('👤 Step 2: 计算球员疲劳指数 (PFI)...', flush=True)
    player_rows = []
    team_player_pfis = defaultdict(list)  # team_id → [{name, pfi, minutes_14d, ...}]
    high_fatigue_players = []

    for team in active_teams:
        team_players = [p for p in players if p['team_id'] == team['id']]
        sp_score = schedule_map.get(team['id'], (0, {}))[0]

        team_matches_sorted = sorted(
            [m for m in matches if m['home_team_id'] == team['id'] or m['away_team_id'] == team['id']],
            key=lambda m: m['kickoff_at'], reverse=True
        )
        if not team_matches_sorted:
            continue

        target_match = team_matches_sorted[0]

        for player in team_players:
            p_apps = player_apps_map.get(player['id'], [])
            pfi, factors = calculate_player_fatigue(
                player, p_apps, matches_by_id, schedule_pressure=sp_score
            )

            player_rows.append({
                'entity_type': 'player',
                'entity_id': player['id'],
                'match_id': target_match['id'],
                'score': pfi,
                'level': 'high' if pfi > 65 else ('medium' if pfi > 40 else 'low'),
                'factors': factors,
                'calculated_at': datetime.utcnow().isoformat() + 'Z',
            })

            team_player_pfis[team['id']].append({
                'name': player['name'],
                'pfi': pfi,
                'role': factors['role'],
                'minutes_14d': factors['minutes_14d'],
                'position': factors['position'],
                'age': factors['age'],
            })

            if pfi > 65:
                high_fatigue_players.append((player['name'], team['name'], pfi, factors))

    if player_rows:
        batch_size = 200
        for i in range(0, len(player_rows), batch_size):
            batch = player_rows[i:i + batch_size]
            sb_upsert('fatigue_scores', batch, on_conflict=None)
        print(f'  ✅ 写入 {len(player_rows)} 条球员疲劳记录', flush=True)

    # ═══ Step 3: 聚合球员 PFI → 球队 TFI ═══
    print('\n🏟️  Step 3: 聚合球队疲劳指数 (TFI = 球员PFI加权平均 + 赛程压力)...', flush=True)
    team_fatigue_map = {}
    team_rows = []

    for team in active_teams:
        pfis = team_player_pfis.get(team['id'], [])
        sp_score, sp_factors = schedule_map.get(team['id'], (0, {}))

        tfi, tfi_factors = aggregate_team_fatigue(pfis, sp_factors)
        team_fatigue_map[team['id']] = tfi

        team_matches_sorted = sorted(
            [m for m in matches if m['home_team_id'] == team['id'] or m['away_team_id'] == team['id']],
            key=lambda m: m['kickoff_at'], reverse=True
        )

        target_matches = [m for m in team_matches_sorted if m['status'] == 'upcoming'][:3]
        if not target_matches and team_matches_sorted:
            target_matches = [team_matches_sorted[0]]

        for m in target_matches:
            team_rows.append({
                'entity_type': 'team',
                'entity_id': team['id'],
                'match_id': m['id'],
                'score': tfi,
                'level': 'high' if tfi > 65 else ('medium' if tfi > 40 else 'low'),
                'factors': tfi_factors,
                'calculated_at': datetime.utcnow().isoformat() + 'Z',
            })

        energy = 100 - tfi
        level = '🟢' if energy > 55 else '🟡' if energy >= 35 else '🔴'
        avg_pfi = tfi_factors.get('avg_squad_pfi', 0)
        sp = tfi_factors.get('schedule_score', 0)
        density = tfi_factors.get('matches_in_14d', 0)
        top_player = tfi_factors.get('highest_pfi_player', '-')
        top_pfi = tfi_factors.get('highest_pfi', 0)
        n_starters = tfi_factors.get('starters_count', 0)
        n_rotation = tfi_factors.get('rotation_count', 0)
        n_bench = tfi_factors.get('bench_count', 0)
        print(f'  {level} {team["name"]:<25} TFI={tfi:>5} Energy={round(energy):>3} | '
              f'avgPFI={avg_pfi} {density}场/14天 '
              f'[主力{n_starters}/轮换{n_rotation}/板凳{n_bench}] '
              f'top: {top_player}({top_pfi})', flush=True)

    if team_rows:
        sb_upsert('fatigue_scores', team_rows, on_conflict=None)
        print(f'\n  ✅ 写入 {len(team_rows)} 条球队疲劳记录', flush=True)

    # ─── 打印报告 ───
    print(f'\n{"="*60}', flush=True)
    print(f'📊 疲劳指数报告 v3 (自底向上)', flush=True)
    print(f'{"="*60}', flush=True)

    print('\n🏟️  球队疲劳排行 (Top 20):')
    team_name_map = {t['id']: t['name'] for t in teams}
    sorted_teams = sorted(team_fatigue_map.items(), key=lambda x: x[1], reverse=True)
    for i, (tid, tfi) in enumerate(sorted_teams[:20], 1):
        energy = 100 - tfi
        bar = '█' * int(tfi / 5) + '░' * (20 - int(tfi / 5))
        print(f'  {i:>2}. {team_name_map.get(tid, "?"):<25} {bar} TFI={tfi:>5} Energy={round(energy):>3}')

    if high_fatigue_players:
        print(f'\n🔴 高疲劳球员 (PFI > 65, Top 20):')
        high_fatigue_players.sort(key=lambda x: x[2], reverse=True)
        for name, team_name, pfi, factors in high_fatigue_players[:20]:
            print(f'  {name:<22} ({team_name:<15}) PFI={pfi:>5} | age={factors["age"]} '
                  f'pos={factors["position"]} mins_14d={factors["minutes_14d"]} '
                  f'ACWR={factors["personal_acwr"]:.2f}')

    print(f'\n✅ 完成! 球队: {len(team_rows)} 条, 球员: {len(player_rows)} 条', flush=True)


if __name__ == '__main__':
    main()
