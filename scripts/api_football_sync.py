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
    print('📊 同步出场记录（已结束比赛）...')
    finished = sb_select('matches', 'id,api_football_id', {
        'status': 'eq.finished',
        'kickoff_at': 'gte.2025-08-01T00:00:00Z',  # 2025-26 完整赛季
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


# ─── 主入口 ───────────────────────────────────────────────
STEPS = {
    'leagues': sync_leagues,
    'teams': sync_teams,
    'players': sync_players,
    'matches': sync_matches,
    'appearances': sync_appearances,
    'injuries': sync_injuries,
}
ALL_ORDER = ['leagues', 'teams', 'players', 'matches', 'appearances', 'injuries']


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
