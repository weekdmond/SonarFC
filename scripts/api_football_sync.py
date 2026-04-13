"""
SonarFC — API-Football 数据同步脚本
从 API-Football (v3) 拉取联赛、球队、球员、赛程、出场记录，写入 Supabase。

用法：
    python3 api_football_sync.py --step leagues      # 同步联赛
    python3 api_football_sync.py --step teams        # 同步球队
    python3 api_football_sync.py --step players      # 同步球员
    python3 api_football_sync.py --step matches      # 同步赛程（过去14天 + 未来7天）
    python3 api_football_sync.py --step appearances  # 同步出场记录
    python3 api_football_sync.py --step injuries     # 同步伤病
    python3 api_football_sync.py --step cups         # 同步杯赛（足总杯/国王杯/德国杯等）
    python3 api_football_sync.py --step international # 同步国际比赛（友谊赛/预选赛/UNL）
    python3 api_football_sync.py --step all          # 全部同步
"""

import argparse
import os
import sys
import time
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

API_KEY = os.getenv('API_FOOTBALL_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

API_BASE = 'https://v3.football.api-sports.io'
SB_REST = f'{SUPABASE_URL}/rest/v1'
SEASON = 2025  # 2025-26 赛季（Pro 订阅）

# PRD V1 覆盖的联赛 — API-Football league IDs
LEAGUES = {
    39: {'name': 'Premier League', 'short_name': 'PL', 'country': 'England'},
    140: {'name': 'La Liga', 'short_name': 'LL', 'country': 'Spain'},
    135: {'name': 'Serie A', 'short_name': 'SA', 'country': 'Italy'},
    78: {'name': 'Bundesliga', 'short_name': 'BL', 'country': 'Germany'},
    61: {'name': 'Ligue 1', 'short_name': 'L1', 'country': 'France'},
    2: {'name': 'UEFA Champions League', 'short_name': 'UCL', 'country': None},
    3: {'name': 'UEFA Europa League', 'short_name': 'UEL', 'country': None},
    1: {'name': 'FIFA World Cup 2026', 'short_name': 'WC', 'country': None},
}

api_headers = {'x-apisports-key': API_KEY}
sb_headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}


def api_get(endpoint, params=None):
    """调用 API-Football，带 rate limit 保护。"""
    url = f'{API_BASE}/{endpoint}'
    resp = requests.get(url, headers=api_headers, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    remaining = int(resp.headers.get('x-ratelimit-remaining', 10))
    if remaining <= 1:
        print('  ⏳ Rate limit 接近，等待 60 秒...')
        time.sleep(60)
    return data.get('response', [])


def sb_upsert(table, rows, on_conflict='api_football_id'):
    """Supabase REST API upsert。"""
    if not rows:
        return
    url = f'{SB_REST}/{table}'
    if on_conflict:
        url += f'?on_conflict={on_conflict}'
    data = rows if isinstance(rows, list) else [rows]
    resp = requests.post(url, headers=sb_headers, json=data, timeout=30)
    if resp.status_code not in (200, 201):
        print(f'  ⚠️  upsert {table} 失败: {resp.status_code} {resp.text[:200]}')
    return resp


def sb_select(table, select='*', params=None):
    """Supabase REST API select，自动分页。"""
    url = f'{SB_REST}/{table}'
    h = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
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


# ─── 同步联赛 ─────────────────────────────────────────────
def sync_leagues():
    print('📋 同步联赛...')
    for api_id, info in LEAGUES.items():
        sb_upsert('leagues', {
            'api_football_id': api_id,
            'name': info['name'],
            'short_name': info['short_name'],
            'country': info['country'],
            'is_active': True,
        })
        print(f'  ✓ {info["name"]}')
    print(f'  共 {len(LEAGUES)} 个联赛\n')


# ─── 同步球队 ─────────────────────────────────────────────
def sync_teams():
    print('🏟️  同步球队...')
    leagues = sb_select('leagues', 'id,api_football_id')
    league_map = {l['api_football_id']: l['id'] for l in leagues}

    # 已存在的球队 api_football_id 集合，用于防止欧冠/欧联覆盖国内联赛归属
    existing_teams = {t['api_football_id'] for t in sb_select('teams', 'api_football_id')}
    # 国内联赛 ID（优先级高于欧战）
    domestic_league_ids = {39, 140, 135, 78, 61}

    count = 0
    for api_league_id in LEAGUES:
        results = api_get('teams', {'league': api_league_id, 'season': SEASON})
        rows = []
        for item in results:
            team = item['team']
            venue = item.get('venue', {})
            row = {
                'api_football_id': team['id'],
                'name': team['name'],
                'short_name': (team.get('code') or team['name'][:3]).upper(),
                'badge_url': team.get('logo'),
                'city': venue.get('city'),
            }
            # 只有国内联赛或新球队才设置 league_id，避免欧战覆盖
            if api_league_id in domestic_league_ids or team['id'] not in existing_teams:
                row['league_id'] = league_map.get(api_league_id)
            rows.append(row)
        if rows:
            sb_upsert('teams', rows)
        count += len(rows)
        print(f'  ✓ {LEAGUES[api_league_id]["name"]}: {len(rows)} 支球队')
    print(f'  共 {count} 支球队\n')


# ─── 同步球员 ─────────────────────────────────────────────
def sync_players():
    print('👤 同步球员...')
    # 只同步五大联赛球队的球员（节省 API 额度）
    league_ids = [l['id'] for l in sb_select('leagues', 'id,api_football_id')
                  if l['api_football_id'] in (39, 140, 135, 78, 61)]
    all_teams = sb_select('teams', 'id,api_football_id,league_id')
    teams = [t for t in all_teams if t.get('league_id') in league_ids]
    team_map = {t['api_football_id']: t['id'] for t in teams}

    count = 0
    for api_team_id, db_team_id in team_map.items():
        results = api_get('players/squads', {'team': api_team_id})
        if not results:
            continue
        players = results[0].get('players', [])
        pos_map = {'Goalkeeper': 'GK', 'Defender': 'DF', 'Midfielder': 'MF', 'Attacker': 'FW'}
        rows = []
        for p in players:
            rows.append({
                'api_football_id': p['id'],
                'name': p['name'],
                'team_id': db_team_id,
                'position': pos_map.get(p.get('position'), p.get('position')),
                'age': p.get('age'),
                'photo_url': p.get('photo'),
            })
        if rows:
            sb_upsert('players', rows)
        count += len(rows)
        print(f'  ✓ Team {api_team_id}: {len(players)} 名球员')
    print(f'  共 {count} 名球员\n')


# ─── 同步赛程 ─────────────────────────────────────────────
def sync_matches():
    print('⚽ 同步赛程（过去14天 + 未来7天）...')
    leagues = sb_select('leagues', 'id,api_football_id')
    league_map = {l['api_football_id']: l['id'] for l in leagues}

    teams = sb_select('teams', 'id,api_football_id')
    team_map = {t['api_football_id']: t['id'] for t in teams}

    # Pro 订阅：拉取完整赛季剩余数据
    # 分段拉取避免单次请求过大
    date_from = '2025-08-01'
    date_to = '2026-06-30'

    status_map = {
        'NS': 'upcoming', 'TBD': 'upcoming',
        '1H': 'live', '2H': 'live', 'HT': 'live', 'ET': 'live', 'P': 'live',
        'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
    }

    count = 0
    for api_league_id in LEAGUES:
        # 世界杯用 2026 赛季，其他用 SEASON (2025)
        season = 2026 if api_league_id == 1 else SEASON
        results = api_get('fixtures', {
            'league': api_league_id,
            'season': season,
            'from': date_from,
            'to': date_to,
        })
        rows = []
        for item in results:
            fixture = item['fixture']
            teams_data = item['teams']
            goals = item['goals']
            league_data = item['league']
            short_status = fixture['status']['short']

            round_str = league_data.get('round', '')
            matchday = None
            if round_str:
                parts = round_str.split(' - ')
                matchday = f'Matchday {parts[-1]}' if len(parts) > 1 else round_str

            rows.append({
                'api_football_id': fixture['id'],
                'league_id': league_map.get(api_league_id),
                'home_team_id': team_map.get(teams_data['home']['id']),
                'away_team_id': team_map.get(teams_data['away']['id']),
                'matchday': matchday,
                'kickoff_at': fixture['date'],
                'venue': fixture['venue']['name'] if fixture.get('venue') else None,
                'city': fixture['venue']['city'] if fixture.get('venue') else None,
                'status': status_map.get(short_status, 'upcoming'),
                'home_score': goals.get('home'),
                'away_score': goals.get('away'),
                'has_extra_time': short_status in ('AET', 'PEN'),
            })
        if rows:
            sb_upsert('matches', rows)
        count += len(rows)
        print(f'  ✓ {LEAGUES[api_league_id]["name"]}: {len(rows)} 场比赛')
    print(f'  共 {count} 场比赛\n')


# ─── 同步出场记录 ──────────────────────────────────────────
def sync_appearances():
    print('📊 同步出场记录（已结束比赛，最新优先）...')
    finished = sb_select('matches', 'id,api_football_id', {
        'status': 'eq.finished',
        'kickoff_at': 'gte.2025-08-01T00:00:00Z',
        'order': 'kickoff_at.desc',  # 最新比赛优先
    })
    players_db = sb_select('players', 'id,api_football_id')
    player_map = {p['api_football_id']: p['id'] for p in players_db}

    count = 0
    for match in finished:
        existing = sb_select('appearances', 'id', {
            'match_id': f'eq.{match["id"]}',
            'limit': '1',
        })
        if existing:
            continue

        results = api_get('fixtures/players', {'fixture': match['api_football_id']})
        rows = []
        for team_data in results:
            for p in team_data.get('players', []):
                stats = p['statistics'][0] if p.get('statistics') else {}
                games = stats.get('games', {})
                minutes = games.get('minutes')
                if not minutes:
                    continue
                db_player_id = player_map.get(p['player']['id'])
                if not db_player_id:
                    continue
                subs = stats.get('substitutes', {})
                rows.append({
                    'player_id': db_player_id,
                    'match_id': match['id'],
                    'minutes_played': minutes,
                    'is_starter': not games.get('substitute', True),
                    'subbed_in_at': subs.get('in') if isinstance(subs.get('in'), int) else None,
                    'subbed_out_at': subs.get('out') if isinstance(subs.get('out'), int) else None,
                })
        if rows:
            sb_upsert('appearances', rows, on_conflict='player_id,match_id')
            count += len(rows)
        print(f'  ✓ Match {match["api_football_id"]}: {len(rows)} 条出场记录')
    print(f'  共 {count} 条出场记录\n')


# ─── 同步比赛详细数据（统计+事件+阵容+球员详细） ──────────
def sync_match_details():
    """一次调用 fixtures/{id} 拉取完整比赛数据: 统计、事件、阵容、球员详细统计"""
    print('📊 同步比赛详细数据...', flush=True)

    finished = sb_select('matches', 'id,api_football_id', {
        'status': 'eq.finished',
        'kickoff_at': 'gte.2025-08-01T00:00:00Z',
        'order': 'kickoff_at.desc',  # 最新比赛优先
    })
    # 只处理还没有 match_stats 的比赛
    existing_stats = {r['match_id'] for r in sb_select('match_stats', 'match_id')}
    todo = [m for m in finished if m['id'] not in existing_stats]
    print(f'  待处理: {len(todo)} 场 (已有详细数据: {len(existing_stats)} 场)', flush=True)

    players_db = sb_select('players', 'id,api_football_id')
    player_map = {p['api_football_id']: p['id'] for p in players_db}

    teams_db = sb_select('teams', 'id,api_football_id')
    team_map = {t['api_football_id']: t['id'] for t in teams_db}

    count = 0
    for match in todo:
        fix_id = match['api_football_id']
        db_match_id = match['id']

        # 一次 API 调用拿全部数据
        url = f'{API_BASE}/fixtures'
        resp = requests.get(url, headers=api_headers, params={'id': fix_id}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        remaining = int(resp.headers.get('x-ratelimit-remaining', 10))
        if remaining <= 1:
            print('  ⏳ Rate limit 接近，等待 60 秒...')
            time.sleep(60)

        items = data.get('response', [])
        if not items:
            continue
        item = items[0]

        fixture = item.get('fixture', {})
        score = item.get('score', {})
        events = item.get('events', [])
        lineups = item.get('lineups', [])
        statistics = item.get('statistics', [])
        players_data = item.get('players', [])

        # ── 更新 matches 表: 裁判、半场比分、点球比分 ──
        match_update = {'api_football_id': fix_id}
        if fixture.get('referee'):
            match_update['referee'] = fixture['referee']
        ht = score.get('halftime', {})
        if ht.get('home') is not None:
            match_update['halftime_home'] = ht['home']
            match_update['halftime_away'] = ht.get('away')
        pen = score.get('penalty', {})
        if pen.get('home') is not None:
            match_update['penalty_home'] = pen['home']
            match_update['penalty_away'] = pen.get('away')
        sb_upsert('matches', match_update)

        # ── 球队统计 (match_stats) — 批量写入 ──
        stat_rows = []
        for team_stat in statistics:
            api_team_id = team_stat.get('team', {}).get('id')
            db_team_id = team_map.get(api_team_id)
            if not db_team_id:
                continue
            stats = {}
            for s in team_stat.get('statistics', []):
                stype = s['type']
                val = s['value']
                if isinstance(val, str) and val.endswith('%'):
                    val = float(val.replace('%', ''))
                stats[stype] = val
            stat_rows.append({
                'match_id': db_match_id,
                'team_id': db_team_id,
                'possession': stats.get('Ball Possession'),
                'shots_total': stats.get('Total Shots'),
                'shots_on': stats.get('Shots on Goal'),
                'shots_off': stats.get('Shots off Goal'),
                'shots_blocked': stats.get('Blocked Shots'),
                'shots_inside_box': stats.get('Shots insidebox'),
                'shots_outside_box': stats.get('Shots outsidebox'),
                'corner_kicks': stats.get('Corner Kicks'),
                'offsides': stats.get('Offsides'),
                'fouls': stats.get('Fouls'),
                'yellow_cards': stats.get('Yellow Cards'),
                'red_cards': stats.get('Red Cards') if stats.get('Red Cards') else 0,
                'goalkeeper_saves': stats.get('Goalkeeper Saves'),
                'passes_total': stats.get('Total passes'),
                'passes_accurate': stats.get('Passes accurate'),
                'passes_pct': stats.get('Passes %'),
            })
        if stat_rows:
            sb_upsert('match_stats', stat_rows, on_conflict='match_id,team_id')

        # ── 事件时间线 (match_events) — 已经是批量 ──
        event_rows = []
        for evt in events:
            evt_team_id = team_map.get(evt.get('team', {}).get('id'))
            evt_player_id = player_map.get(evt.get('player', {}).get('id'))
            evt_assist_id = player_map.get(evt.get('assist', {}).get('id')) if evt.get('assist', {}).get('id') else None
            event_rows.append({
                'match_id': db_match_id,
                'team_id': evt_team_id,
                'player_id': evt_player_id,
                'assist_player_id': evt_assist_id,
                'event_type': evt.get('type', ''),
                'detail': evt.get('detail', ''),
                'minute': evt.get('time', {}).get('elapsed', 0),
                'extra_minute': evt.get('time', {}).get('extra'),
                'comments': evt.get('comments'),
            })
        if event_rows:
            sb_upsert('match_events', event_rows, on_conflict=None)

        # ── 阵容 (match_lineups) — 批量写入 ──
        lineup_rows = []
        for lineup in lineups:
            api_team_id = lineup.get('team', {}).get('id')
            db_team_id = team_map.get(api_team_id)
            if db_team_id:
                lineup_rows.append({
                    'match_id': db_match_id,
                    'team_id': db_team_id,
                    'formation': lineup.get('formation'),
                })
        if lineup_rows:
            sb_upsert('match_lineups', lineup_rows, on_conflict='match_id,team_id')

        # ── 球员详细统计 (更新 appearances) — 批量写入 ──
        app_rows = []
        for team_data in players_data:
            for p in team_data.get('players', []):
                api_player_id = p['player']['id']
                db_player_id = player_map.get(api_player_id)
                if not db_player_id:
                    continue
                stats = p['statistics'][0] if p.get('statistics') else {}
                games = stats.get('games', {})
                minutes = games.get('minutes')
                if not minutes:
                    continue
                goals = stats.get('goals', {})
                shots = stats.get('shots', {})
                passes = stats.get('passes', {})
                tackles = stats.get('tackles', {})
                duels = stats.get('duels', {})
                dribbles = stats.get('dribbles', {})
                fouls = stats.get('fouls', {})
                cards = stats.get('cards', {})
                penalty = stats.get('penalty', {})
                subs = stats.get('substitutes', {})

                pass_acc = passes.get('accuracy')
                if isinstance(pass_acc, str):
                    pass_acc = int(pass_acc.replace('%', '')) if pass_acc.replace('%', '').isdigit() else None

                rating_str = games.get('rating')
                rating = float(rating_str) if rating_str else None

                app_rows.append({
                    'player_id': db_player_id,
                    'match_id': db_match_id,
                    'minutes_played': minutes,
                    'is_starter': not games.get('substitute', True),
                    'subbed_in_at': subs.get('in') if isinstance(subs.get('in'), int) else None,
                    'subbed_out_at': subs.get('out') if isinstance(subs.get('out'), int) else None,
                    'rating': rating,
                    'goals': goals.get('total') or 0,
                    'assists': goals.get('assists') or 0,
                    'shots_total': shots.get('total'),
                    'shots_on': shots.get('on'),
                    'passes_total': passes.get('total'),
                    'passes_key': passes.get('key'),
                    'passes_accuracy': pass_acc,
                    'tackles': tackles.get('total'),
                    'interceptions': tackles.get('interceptions'),
                    'blocks': tackles.get('blocks'),
                    'duels_total': duels.get('total'),
                    'duels_won': duels.get('won'),
                    'dribbles_attempts': dribbles.get('attempts'),
                    'dribbles_success': dribbles.get('success'),
                    'fouls_drawn': fouls.get('drawn'),
                    'fouls_committed': fouls.get('committed'),
                    'yellow_cards': cards.get('yellow') or 0,
                    'red_cards': cards.get('red') or 0,
                    'penalty_scored': penalty.get('scored') or 0,
                    'penalty_missed': penalty.get('missed') or 0,
                    'penalty_saved': penalty.get('saved') or 0,
                    'saves': goals.get('saves'),
                    'is_captain': games.get('captain', False),
                    'jersey_number': games.get('number'),
                    'position_played': games.get('position'),
                })
        if app_rows:
            sb_upsert('appearances', app_rows, on_conflict='player_id,match_id')

        # 每场比赛现在只有 4 次 Supabase 写入 (was ~30)
        count += 1
        if count % 50 == 0:
            print(f'  ✅ 已处理 {count}/{len(todo)} 场', flush=True)

    print(f'  共处理 {count} 场比赛详细数据\n', flush=True)


# ─── 同步伤病 ─────────────────────────────────────────────
def sync_injuries():
    print('🏥 同步伤病...')
    players_db = sb_select('players', 'id,api_football_id')
    player_map = {p['api_football_id']: p['id'] for p in players_db}

    count = 0
    for api_league_id in LEAGUES:
        results = api_get('injuries', {'league': api_league_id, 'season': SEASON})
        rows = []
        for item in results:
            db_player_id = player_map.get(item['player']['id'])
            if not db_player_id:
                continue
            rows.append({
                'player_id': db_player_id,
                'type': item['player'].get('type'),
                'started_at': item['fixture'].get('date', '')[:10] if item.get('fixture') else None,
                'status': 'out',
            })
        if rows:
            sb_upsert('injuries', rows, on_conflict=None)
            count += len(rows)
        print(f'  ✓ {LEAGUES[api_league_id]["name"]}: {len(rows)} 条伤病')
    print(f'  共 {count} 条伤病记录\n')


# ─── 同步球队全赛事（杯赛等） ─────────────────────────────
# 五大联赛对应的国内杯赛
CUP_LEAGUES = {
    45:  {'name': 'FA Cup', 'short_name': 'FAC', 'country': 'England'},
    48:  {'name': 'EFL Cup', 'short_name': 'EFL', 'country': 'England'},
    528: {'name': 'Community Shield', 'short_name': 'CS', 'country': 'England'},
    143: {'name': 'Copa del Rey', 'short_name': 'CDR', 'country': 'Spain'},
    556: {'name': 'Supercopa de España', 'short_name': 'SCE', 'country': 'Spain'},
    137: {'name': 'Coppa Italia', 'short_name': 'CI', 'country': 'Italy'},
    547: {'name': 'Supercoppa Italiana', 'short_name': 'SCI', 'country': 'Italy'},
    81:  {'name': 'DFB Pokal', 'short_name': 'DFB', 'country': 'Germany'},
    529: {'name': 'DFL Supercup', 'short_name': 'DSC', 'country': 'Germany'},
    66:  {'name': 'Coupe de France', 'short_name': 'CDF', 'country': 'France'},
    526: {'name': 'Trophée des Champions', 'short_name': 'TDC', 'country': 'France'},
    531: {'name': 'UEFA Super Cup', 'short_name': 'USC', 'country': None},
    15:  {'name': 'FIFA Club World Cup', 'short_name': 'CWC', 'country': None},
}

# 国际赛事 — 覆盖主要国家队友谊赛和预选赛
INTL_LEAGUES = {
    5:   {'name': 'UEFA Nations League', 'short_name': 'UNL', 'country': None},
    10:  {'name': 'Friendlies', 'short_name': 'FRI', 'country': None},
    32:  {'name': 'WC Qualifiers Europe', 'short_name': 'WCQ-EU', 'country': None},
    34:  {'name': 'WC Qualifiers South America', 'short_name': 'WCQ-SA', 'country': None},
    30:  {'name': 'WC Qualifiers Africa', 'short_name': 'WCQ-AF', 'country': None},
    31:  {'name': 'WC Qualifiers Asia', 'short_name': 'WCQ-AS', 'country': None},
    33:  {'name': 'WC Qualifiers North America', 'short_name': 'WCQ-NA', 'country': None},
}


def sync_cup_matches():
    """同步五大联赛球队参加的所有杯赛比赛"""
    print('🏆 同步杯赛比赛...', flush=True)

    # 先确保杯赛联赛在 leagues 表中
    for api_id, info in CUP_LEAGUES.items():
        sb_upsert('leagues', {
            'api_football_id': api_id,
            'name': info['name'],
            'short_name': info['short_name'],
            'country': info['country'],
            'is_active': True,
        })

    leagues = sb_select('leagues', 'id,api_football_id')
    league_map = {l['api_football_id']: l['id'] for l in leagues}

    teams = sb_select('teams', 'id,api_football_id')
    team_map = {t['api_football_id']: t['id'] for t in teams}

    status_map = {
        'NS': 'upcoming', 'TBD': 'upcoming',
        '1H': 'live', '2H': 'live', 'HT': 'live', 'ET': 'live', 'P': 'live',
        'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
    }

    count = 0
    for api_league_id, info in CUP_LEAGUES.items():
        results = api_get('fixtures', {
            'league': api_league_id,
            'season': SEASON,
        })
        rows = []
        for item in results:
            fixture = item['fixture']
            teams_data = item['teams']
            goals = item['goals']
            league_data = item['league']
            short_status = fixture['status']['short']

            home_id = team_map.get(teams_data['home']['id'])
            away_id = team_map.get(teams_data['away']['id'])
            # 只保留至少有一方是我们数据库中球队的比赛
            if not home_id and not away_id:
                continue

            round_str = league_data.get('round', '')

            rows.append({
                'api_football_id': fixture['id'],
                'league_id': league_map.get(api_league_id),
                'home_team_id': home_id,
                'away_team_id': away_id,
                'matchday': round_str or None,
                'kickoff_at': fixture['date'],
                'venue': fixture['venue']['name'] if fixture.get('venue') else None,
                'city': fixture['venue']['city'] if fixture.get('venue') else None,
                'status': status_map.get(short_status, 'upcoming'),
                'home_score': goals.get('home'),
                'away_score': goals.get('away'),
                'has_extra_time': short_status in ('AET', 'PEN'),
            })
        if rows:
            sb_upsert('matches', rows)
        count += len(rows)
        print(f'  ✓ {info["name"]}: {len(rows)} 场比赛', flush=True)
    print(f'  共 {count} 场杯赛比赛\n', flush=True)


def sync_international_matches():
    """同步国际比赛（友谊赛、预选赛、Nations League）的出场记录
    通过球员的国籍关联到国家队比赛"""
    print('🌍 同步国际比赛...', flush=True)

    # 先确保国际赛事联赛在 leagues 表中
    for api_id, info in INTL_LEAGUES.items():
        sb_upsert('leagues', {
            'api_football_id': api_id,
            'name': info['name'],
            'short_name': info['short_name'],
            'country': info['country'],
            'is_active': True,
        })

    leagues = sb_select('leagues', 'id,api_football_id')
    league_map = {l['api_football_id']: l['id'] for l in leagues}

    # 获取我们数据库中球员的国籍分布，找出主要国家队
    players_db = sb_select('players', 'id,api_football_id,nationality')
    nationality_count = {}
    for p in players_db:
        nat = p.get('nationality')
        if nat:
            nationality_count[nat] = nationality_count.get(nat, 0) + 1

    # 取球员数 >= 5 的国家（有一定数量的球员才值得同步）
    major_nations = {nat for nat, cnt in nationality_count.items() if cnt >= 5}
    print(f'  📊 主要国籍: {len(major_nations)} 个国家 (球员≥5人)', flush=True)

    # 查找这些国家队的 API-Football team ID
    # 通过 API 搜索国家队
    teams_db = sb_select('teams', 'id,api_football_id,name')
    team_map = {t['api_football_id']: t['id'] for t in teams_db}
    player_map = {p['api_football_id']: p['id'] for p in players_db}

    status_map = {
        'NS': 'upcoming', 'TBD': 'upcoming',
        '1H': 'live', '2H': 'live', 'HT': 'live', 'ET': 'live', 'P': 'live',
        'FT': 'finished', 'AET': 'finished', 'PEN': 'finished',
    }

    # 同步各国际赛事的比赛
    match_count = 0
    app_count = 0

    for api_league_id, info in INTL_LEAGUES.items():
        # 拉取 2025-26 赛季的比赛
        for season in [2025, 2026]:
            results = api_get('fixtures', {
                'league': api_league_id,
                'season': season,
                'from': '2025-08-01',
                'to': '2026-06-30',
            })

            rows = []
            fixture_ids = []
            for item in results:
                fixture = item['fixture']
                teams_data = item['teams']
                goals = item['goals']
                short_status = fixture['status']['short']

                # 将国家队加入 teams 表（如果不存在）
                for side in ['home', 'away']:
                    t = teams_data[side]
                    if t['id'] not in team_map:
                        sb_upsert('teams', {
                            'api_football_id': t['id'],
                            'name': t['name'],
                            'short_name': (t.get('code') or t['name'][:3]).upper(),
                            'badge_url': t.get('logo'),
                        })
                        # 重新获取 DB ID
                        new_team = sb_select('teams', 'id', {'api_football_id': f'eq.{t["id"]}'})
                        if new_team:
                            team_map[t['id']] = new_team[0]['id']

                home_id = team_map.get(teams_data['home']['id'])
                away_id = team_map.get(teams_data['away']['id'])

                round_str = item.get('league', {}).get('round', '')
                rows.append({
                    'api_football_id': fixture['id'],
                    'league_id': league_map.get(api_league_id),
                    'home_team_id': home_id,
                    'away_team_id': away_id,
                    'matchday': round_str or None,
                    'kickoff_at': fixture['date'],
                    'venue': fixture['venue']['name'] if fixture.get('venue') else None,
                    'city': fixture['venue']['city'] if fixture.get('venue') else None,
                    'status': status_map.get(short_status, 'upcoming'),
                    'home_score': goals.get('home'),
                    'away_score': goals.get('away'),
                    'has_extra_time': short_status in ('AET', 'PEN'),
                })
                if short_status in ('FT', 'AET', 'PEN'):
                    fixture_ids.append(fixture['id'])

            if rows:
                sb_upsert('matches', rows)
            match_count += len(rows)

            # 同步已结束比赛的出场记录，关联到俱乐部球员
            for fix_id in fixture_ids:
                # 检查是否已有出场记录
                existing = sb_select('matches', 'id', {'api_football_id': f'eq.{fix_id}'})
                if not existing:
                    continue
                db_match_id = existing[0]['id']
                existing_apps = sb_select('appearances', 'id', {
                    'match_id': f'eq.{db_match_id}',
                    'limit': '1',
                })
                if existing_apps:
                    continue

                app_results = api_get('fixtures/players', {'fixture': fix_id})
                app_rows = []
                for team_data in app_results:
                    for p in team_data.get('players', []):
                        stats = p['statistics'][0] if p.get('statistics') else {}
                        games = stats.get('games', {})
                        minutes = games.get('minutes')
                        if not minutes:
                            continue
                        # 用 player api_football_id 关联到我们数据库的球员
                        db_player_id = player_map.get(p['player']['id'])
                        if not db_player_id:
                            continue  # 不在五大联赛球队里的球员，跳过
                        subs = stats.get('substitutes', {})
                        app_rows.append({
                            'player_id': db_player_id,
                            'match_id': db_match_id,
                            'minutes_played': minutes,
                            'is_starter': not games.get('substitute', True),
                            'subbed_in_at': subs.get('in') if isinstance(subs.get('in'), int) else None,
                            'subbed_out_at': subs.get('out') if isinstance(subs.get('out'), int) else None,
                        })
                if app_rows:
                    sb_upsert('appearances', app_rows, on_conflict='player_id,match_id')
                    app_count += len(app_rows)

        print(f'  ✓ {info["name"]}: season {season}', flush=True)

    print(f'  共 {match_count} 场国际比赛, {app_count} 条出场记录\n', flush=True)


# ─── 主入口 ───────────────────────────────────────────────
STEPS = {
    'leagues': sync_leagues,
    'teams': sync_teams,
    'players': sync_players,
    'matches': sync_matches,
    'cups': sync_cup_matches,
    'international': sync_international_matches,
    'appearances': sync_appearances,
    'details': sync_match_details,
    'injuries': sync_injuries,
}
ALL_ORDER = ['leagues', 'teams', 'players', 'matches', 'cups', 'international', 'appearances', 'details', 'injuries']


def main():
    parser = argparse.ArgumentParser(description='SonarFC API-Football 数据同步')
    parser.add_argument('--step', default='all', choices=[*STEPS.keys(), 'all'],
                        help='同步步骤 (默认: all)')
    args = parser.parse_args()

    if not API_KEY or not SUPABASE_KEY or SUPABASE_KEY.endswith('_here'):
        print('❌ 请在 .env 中配置 API_FOOTBALL_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY')
        sys.exit(1)

    print(f'🚀 SonarFC 数据同步 — {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}')
    print(f'   赛季: {SEASON}  联赛数: {len(LEAGUES)}\n', flush=True)

    steps = ALL_ORDER if args.step == 'all' else [args.step]
    for step in steps:
        try:
            STEPS[step]()
        except Exception as e:
            print(f'❌ {step} 同步失败: {e}')
            if args.step != 'all':
                sys.exit(1)

    print('✅ 同步完成!')


if __name__ == '__main__':
    main()
