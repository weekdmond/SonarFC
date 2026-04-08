"""
SonarFC — FotMob 数据爬取脚本
从 FotMob 的 __NEXT_DATA__ 提取欧冠比赛数据，写入 Supabase。

用法：
    python3 scrape_fotmob.py --league ucl
    python3 scrape_fotmob.py --league pl
    python3 scrape_fotmob.py --league all
"""

import argparse
import json
import os
import re
import sys
import time

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

# FotMob league IDs → our DB league mapping
FOTMOB_LEAGUES = {
    'ucl': {'fotmob_id': 42, 'name': 'Champions League', 'db_api_football_id': 2},
    'uel': {'fotmob_id': 73, 'name': 'Europa League', 'db_api_football_id': 3},
    'pl':  {'fotmob_id': 47, 'name': 'Premier League', 'db_api_football_id': 39},
    'll':  {'fotmob_id': 87, 'name': 'La Liga', 'db_api_football_id': 140},
    'sa':  {'fotmob_id': 55, 'name': 'Serie A', 'db_api_football_id': 135},
    'bl':  {'fotmob_id': 54, 'name': 'Bundesliga', 'db_api_football_id': 78},
    'l1':  {'fotmob_id': 53, 'name': 'Ligue 1', 'db_api_football_id': 61},
}

USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'


def sb_select(table, select='*', params=None):
    url = f'{SB_REST}/{table}'
    h = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    p = {'select': select}
    if params:
        p.update(params)
    resp = requests.get(url, headers=h, params=p, timeout=30)
    resp.raise_for_status()
    return resp.json()


def sb_upsert(table, rows, on_conflict='api_football_id'):
    if not rows:
        return
    url = f'{SB_REST}/{table}'
    if on_conflict:
        url += f'?on_conflict={on_conflict}'
    resp = requests.post(url, headers=sb_headers, json=rows, timeout=30)
    if resp.status_code not in (200, 201):
        print(f'  ⚠️  upsert {table} 失败: {resp.status_code} {resp.text[:300]}')
    return resp


def fetch_fotmob_page(fotmob_league_id, tab='fixtures'):
    """抓取 FotMob 页面并提取 __NEXT_DATA__"""
    url = f'https://www.fotmob.com/leagues/{fotmob_league_id}/{tab}/champions-league'
    print(f'  📡 Fetching {url}')
    resp = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=30)
    resp.raise_for_status()

    # 提取 __NEXT_DATA__ JSON
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
    if not match:
        print('  ❌ 未找到 __NEXT_DATA__')
        return None
    return json.loads(match.group(1))


def scrape_league_matches(league_key):
    """从 FotMob 爬取联赛比赛数据"""
    league_info = FOTMOB_LEAGUES[league_key]
    fotmob_id = league_info['fotmob_id']
    db_api_id = league_info['db_api_football_id']

    print(f'\n⚽ 爬取 {league_info["name"]}...')

    # 获取页面数据
    data = fetch_fotmob_page(fotmob_id, 'fixtures')
    if not data:
        return 0

    pp = data.get('props', {}).get('pageProps', {})
    fixtures = pp.get('fixtures', {})
    all_matches = fixtures.get('allMatches', {})

    if not all_matches:
        print('  ❌ 无比赛数据')
        # 尝试 overview 页面
        data = fetch_fotmob_page(fotmob_id, 'overview')
        if data:
            pp = data.get('props', {}).get('pageProps', {})
            # 检查 overview 中的 matches
            overview = pp.get('overview', {})
            if overview:
                print(f'  Overview keys: {list(overview.keys())[:10]}')
        return 0

    # 获取我们数据库中的联赛和球队映射
    db_leagues = sb_select('leagues', 'id,api_football_id')
    league_map = {l['api_football_id']: l['id'] for l in db_leagues}
    db_league_id = league_map.get(db_api_id)

    if not db_league_id:
        print(f'  ❌ 联赛 {league_info["name"]} 不在数据库中')
        return 0

    db_teams = sb_select('teams', 'id,name,api_football_id,short_name')
    # 按名字和缩写建索引（FotMob 用名字匹配）
    team_by_name = {}
    for t in db_teams:
        team_by_name[t['name'].lower()] = t
        team_by_name[t['short_name'].lower()] = t

    # 解析比赛
    status_map = {
        'FT': 'finished', 'AET': 'finished', 'Pen': 'finished',
        'HT': 'live', '1H': 'live', '2H': 'live',
    }

    rows = []
    unmatched_teams = set()

    # allMatches 可能是 dict (按轮次分组) 或 list
    match_list = []
    if isinstance(all_matches, dict):
        for round_name, round_matches in all_matches.items():
            if isinstance(round_matches, list):
                for m in round_matches:
                    m['_round'] = round_name
                    match_list.append(m)
            elif isinstance(round_matches, dict):
                round_matches['_round'] = round_name
                match_list.append(round_matches)
    elif isinstance(all_matches, list):
        match_list = all_matches

    print(f'  📊 找到 {len(match_list)} 场比赛')

    for m in match_list:
        # FotMob 比赛数据结构
        match_id = m.get('id')
        home = m.get('home', {})
        away = m.get('away', {})

        home_name = home.get('name', home.get('shortName', ''))
        away_name = away.get('name', away.get('shortName', ''))

        # 匹配数据库中的球队
        home_team = (team_by_name.get(home_name.lower()) or
                     team_by_name.get(home.get('shortName', '').lower()))
        away_team = (team_by_name.get(away_name.lower()) or
                     team_by_name.get(away.get('shortName', '').lower()))

        if not home_team:
            unmatched_teams.add(home_name)
            continue
        if not away_team:
            unmatched_teams.add(away_name)
            continue

        # 状态
        status_data = m.get('status', {})
        if isinstance(status_data, dict):
            finished = status_data.get('finished', False)
            cancelled = status_data.get('cancelled', False)
            started = status_data.get('started', False)
            if cancelled:
                continue
            status = 'finished' if finished else ('live' if started else 'upcoming')
        else:
            status = status_map.get(str(status_data), 'upcoming')

        # 比分
        home_score = home.get('score')
        away_score = away.get('score')

        # 时间
        utc_time = m.get('status', {}).get('utcTime', m.get('utcTime', ''))
        if not utc_time:
            # 尝试其他时间字段
            utc_time = m.get('timeTS', '')
            if utc_time and isinstance(utc_time, (int, float)):
                from datetime import datetime
                utc_time = datetime.utcfromtimestamp(utc_time / 1000).isoformat() + 'Z'

        # 轮次
        round_name = m.get('_round', m.get('round', ''))
        matchday = round_name if round_name else None

        # 用 FotMob match ID 作为 api_football_id（加偏移避免冲突）
        fotmob_match_id = match_id if match_id else hash(f'{home_name}{away_name}{utc_time}') % 10000000

        rows.append({
            'api_football_id': 10000000 + fotmob_match_id,  # 偏移避免和 API-Football ID 冲突
            'league_id': db_league_id,
            'home_team_id': home_team['id'],
            'away_team_id': away_team['id'],
            'matchday': matchday,
            'kickoff_at': utc_time if utc_time else '2026-01-01T00:00:00Z',
            'venue': m.get('venue'),
            'status': status,
            'home_score': home_score,
            'away_score': away_score,
            'has_extra_time': False,
        })

    if unmatched_teams:
        print(f'  ⚠️  未匹配的球队: {unmatched_teams}')

    if rows:
        sb_upsert('matches', rows)
        print(f'  ✅ 写入 {len(rows)} 场比赛')
    else:
        print('  ⚠️  没有可写入的比赛')

    # 保存原始数据用于调试
    debug_file = os.path.join(os.path.dirname(__file__), '..', 'logs', f'fotmob_{league_key}_raw.json')
    os.makedirs(os.path.dirname(debug_file), exist_ok=True)
    with open(debug_file, 'w') as f:
        json.dump({'allMatches': all_matches, 'parsed_count': len(match_list)}, f, indent=2, ensure_ascii=False)
    print(f'  💾 原始数据保存到 {debug_file}')

    return len(rows)


def main():
    parser = argparse.ArgumentParser(description='SonarFC FotMob 数据爬取')
    parser.add_argument('--league', default='ucl',
                        choices=[*FOTMOB_LEAGUES.keys(), 'all'],
                        help='要爬取的联赛 (默认: ucl)')
    args = parser.parse_args()

    if not SUPABASE_KEY:
        print('❌ 请在 .env 中配置 SUPABASE_SERVICE_KEY')
        sys.exit(1)

    print(f'🕷️  SonarFC FotMob 爬虫启动')

    total = 0
    leagues = FOTMOB_LEAGUES.keys() if args.league == 'all' else [args.league]

    for league_key in leagues:
        try:
            count = scrape_league_matches(league_key)
            total += count
            time.sleep(2)  # 礼貌间隔
        except Exception as e:
            print(f'  ❌ {league_key} 爬取失败: {e}')
            import traceback
            traceback.print_exc()

    print(f'\n✅ 完成! 共写入 {total} 场比赛')


if __name__ == '__main__':
    main()
