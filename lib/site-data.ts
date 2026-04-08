import { unstable_noStore as noStore } from "next/cache";

import {
  competitions as fallbackCompetitions,
  matches as fallbackMatches,
  newsItems as fallbackNewsItems,
  players as fallbackPlayers,
  teams as fallbackTeams,
  worldCupTeams as fallbackWorldCupTeams,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  fatigueLabel,
  fatigueTone,
  formatDistance,
  workloadLabel,
} from "@/lib/sonar";
import type {
  CompetitionRecord,
  KeyPlayerLoad,
  LocalizedText,
  MatchBucket,
  MatchRecord,
  MatchSide,
  NewsItem,
  PlayerComparisonItem,
  PlayerProfile,
  Result,
  TeamRecord,
  Tone,
  WorldCupRecoveryMatch,
  WorldCupTeamProfile,
  WorldCupTravelLeg,
} from "@/lib/types";

interface CompetitionRow {
  id: number;
  name: string;
  short_name: string;
  competition_type: string | null;
  region: string | null;
  season_label: string | null;
  icon_url: string | null;
  is_active: boolean | null;
}

interface LeagueRow {
  id: number;
  name: string;
  short_name: string;
  country: string | null;
  api_football_id: number | null;
  icon_url: string | null;
  is_active: boolean | null;
}

interface TeamRow {
  id: number;
  name: string;
  short_name: string;
  team_type: string | null;
  badge_url: string | null;
  primary_color: string | null;
  country: string | null;
  home_city: string | null;
}

interface LegacyTeamRow {
  id: number;
  name: string;
  short_name: string;
  league_id: number | null;
  api_football_id: number | null;
  badge_url: string | null;
  primary_color: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
}

interface MatchRow {
  id: number;
  competition_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  stage: string | null;
  kickoff_at: string;
  venue: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  competition?: CompetitionRow | CompetitionRow[] | null;
  home_team?: TeamRow | TeamRow[] | null;
  away_team?: TeamRow | TeamRow[] | null;
}

interface LegacyMatchRow {
  id: number;
  league_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  api_football_id: number | null;
  matchday: string | null;
  kickoff_at: string;
  venue: string | null;
  city: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  has_extra_time: boolean | null;
  created_at: string | null;
}

interface FatigueRow {
  entity_type: "team" | "player";
  entity_id: number;
  match_id: number | null;
  score: number;
  level: "high" | "medium" | "low" | null;
  factors: Record<string, unknown> | null;
  calculated_at?: string | null;
}

interface MatchSquadRow {
  match_id: number;
  team_id: number;
  player_id: number;
  squad_status: string;
  availability_reason: string | null;
  expected_return: string | null;
}

interface PlayerRow {
  id: number;
  name: string;
  position: string | null;
  age: number | null;
  nationality: string | null;
  photo_url: string | null;
}

interface LegacyPlayerRow extends PlayerRow {
  team_id: number | null;
  season_total_minutes: number | null;
}

interface PlayerAffiliationRow {
  player_id: number;
  team_id: number;
  affiliation_type: string;
  starts_at: string;
  ends_at: string | null;
  is_primary: boolean | null;
}

interface AppearanceRow {
  id?: number;
  player_id: number;
  team_id?: number | null;
  match_id: number | null;
  minutes_played: number;
  is_starter: boolean | null;
  subbed_in_at?: number | null;
  subbed_out_at?: number | null;
}

interface InjuryRow {
  id?: number;
  player_id: number;
  type: string | null;
  started_at: string | null;
  expected_return: string | null;
  status: string | null;
  created_at?: string | null;
}

interface AiPreviewRow {
  match_id: number | null;
  team_id: number | null;
  content: string;
}

interface SiteSnapshot {
  source: "mock" | "supabase";
  competitions: CompetitionRecord[];
  teams: TeamRecord[];
  matches: MatchRecord[];
  players: PlayerProfile[];
  newsItems: NewsItem[];
  worldCupTeams: WorldCupTeamProfile[];
}

let lastSuccessfulSnapshot: SiteSnapshot | null = null;
let cachedSnapshot: { value: SiteSnapshot; fetchedAt: number } | null = null;
let inFlightSnapshot: Promise<SiteSnapshot> | null = null;

const COMPETITION_SLUG_ALIASES: Record<string, string> = {
  "premier league": "premier-league",
  "la liga": "la-liga",
  "laliga": "la-liga",
  "serie a": "serie-a",
  bundesliga: "bundesliga",
  "ligue 1": "ligue-1",
  "uefa champions league": "champions-league",
  "champions league": "champions-league",
  "fifa world cup": "fifa-world-cup",
  "world cup": "fifa-world-cup",
  pl: "premier-league",
  ll: "la-liga",
  sa: "serie-a",
  bl: "bundesliga",
  l1: "ligue-1",
  ucl: "champions-league",
  cl: "champions-league",
  wc: "fifa-world-cup",
};

const TEAM_SLUG_ALIASES: Record<string, string> = {
  liv: "liverpool",
  mci: "man-city",
  rma: "real-madrid",
  bar: "barcelona",
  int: "inter",
  nap: "napoli",
  bay: "bayern",
  bvb: "borussia-dortmund",
  psg: "paris-saint-germain",
  om: "marseille",
  arg: "argentina",
  fra: "france",
  eng: "england",
  bra: "brazil",
  "manchester city": "man-city",
  "real madrid": "real-madrid",
  "bayern munchen": "bayern",
  "bayern munich": "bayern",
  "fc bayern munchen": "bayern",
  "fc bayern munich": "bayern",
  "bayer leverkusen": "bayer-leverkusen",
  "bayer 04 leverkusen": "bayer-leverkusen",
  "paris saint germain": "paris-saint-germain",
  "paris sg": "paris-saint-germain",
  "borussia dortmund": "borussia-dortmund",
};

const DEFAULT_TEAM_COLOR = "#7C8798";
const DAYS_BACK = 30;
const DAYS_FORWARD = 30;
const SUPABASE_PAGE_SIZE = 1000;
const SNAPSHOT_CACHE_TTL_MS = 60 * 1000;

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const result = await fetchPage(from, to);

    if (result.error) {
      throw result.error;
    }

    const pageRows = result.data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function fetchOptionalRows<T>(
  label: string,
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  try {
    return await fetchAllRows(fetchPage);
  } catch (error) {
    console.warn(`[SonarFC] Optional dataset unavailable: ${label}`, error);
    return [];
  }
}

export async function getSiteSnapshot(): Promise<SiteSnapshot> {
  noStore();

  const now = Date.now();
  if (cachedSnapshot && now - cachedSnapshot.fetchedAt < SNAPSHOT_CACHE_TTL_MS) {
    return cachedSnapshot.value;
  }

  if (inFlightSnapshot) {
    return inFlightSnapshot;
  }

  if (!isSupabaseConfigured()) {
    return getFallbackSnapshot();
  }

  inFlightSnapshot = (async () => {
    try {
      const client = getSupabaseServerClient();
      const nowDate = new Date();
      const windowStart = new Date(
        nowDate.getTime() - DAYS_BACK * 24 * 60 * 60 * 1000
      ).toISOString();
      const windowEnd = new Date(
        nowDate.getTime() + DAYS_FORWARD * 24 * 60 * 60 * 1000
      ).toISOString();

      const [competitionRows, teamRows, matchRows] = await Promise.all([
        fetchAllRows<CompetitionRow>((from, to) =>
          client
            .from("competitions")
            .select("id,name,short_name,competition_type,region,season_label,icon_url,is_active")
            .eq("is_active", true)
            .range(from, to)
        ),
        fetchAllRows<TeamRow>((from, to) =>
          client
            .from("teams")
            .select("id,name,short_name,team_type,badge_url,primary_color,country,home_city")
            .range(from, to)
        ),
        fetchAllRows<MatchRow>((from, to) =>
          client
            .from("matches")
            .select(
              "id,competition_id,home_team_id,away_team_id,stage,kickoff_at,venue,status,home_score,away_score,competition:competitions!matches_competition_id_fkey(id,name,short_name,competition_type,region,season_label,icon_url,is_active),home_team:teams!matches_home_team_id_fkey(id,name,short_name,team_type,badge_url,primary_color,country,home_city),away_team:teams!matches_away_team_id_fkey(id,name,short_name,team_type,badge_url,primary_color,country,home_city)"
            )
            .gte("kickoff_at", windowStart)
            .lte("kickoff_at", windowEnd)
            .order("kickoff_at", { ascending: true })
            .range(from, to)
        ),
      ]);
      const matchIds = matchRows.map((row) => row.id);

      const [fatigueRows, squadRows, previewRows] = await loadMatchAdjacency(client, matchIds);
      const playerIds = unique(
        squadRows.map((row) => row.player_id),
        fatigueRows
          .filter((row) => row.entity_type === "player")
          .map((row) => row.entity_id)
      );
      const [playerRows, playerAffiliations, appearances, injuries] = await loadPlayerAdjacency(
        client,
        playerIds
      );

      const mappedCompetitions = competitionRows.map(mapCompetitionRow);
      const mappedTeams = teamRows.map(mapTeamRow);
      const mappedTeamByDbId = new Map<number, TeamRecord>();
      const mappedCompetitionByDbId = new Map<number, CompetitionRecord>();
      const competitionShortByDbId = new Map<number, string>();

      competitionRows.forEach((row) => {
        const competition = mapCompetitionRow(row);
        mappedCompetitionByDbId.set(row.id, competition);
        competitionShortByDbId.set(row.id, row.short_name || competition.slug.toUpperCase());
      });

      teamRows.forEach((row) => {
        mappedTeamByDbId.set(row.id, mapTeamRow(row));
      });

      const teamFatigueByKey = new Map<string, FatigueRow>();
      const playerFatigueByMatchTeam = new Map<string, FatigueRow[]>();
      const previewByMatchTeam = new Map<string, AiPreviewRow>();
      const squadsByMatchTeam = new Map<string, MatchSquadRow[]>();

      fatigueRows.forEach((row) => {
        if (row.match_id == null) {
          return;
        }

        const key = `${row.match_id}:${row.entity_id}`;

        if (row.entity_type === "team") {
          teamFatigueByKey.set(key, row);
          return;
        }

        const matchSquad = squadRows.find(
          (item) => item.match_id === row.match_id && item.player_id === row.entity_id
        );
        const teamId = matchSquad?.team_id;

        if (!teamId) {
          return;
        }

        const playerKey = `${row.match_id}:${teamId}`;
        const existing = playerFatigueByMatchTeam.get(playerKey) ?? [];
        existing.push(row);
        playerFatigueByMatchTeam.set(playerKey, existing);
      });

      previewRows.forEach((row) => {
        if (row.match_id == null || row.team_id == null) {
          return;
        }

        previewByMatchTeam.set(`${row.match_id}:${row.team_id}`, row);
      });

      squadRows.forEach((row) => {
        const key = `${row.match_id}:${row.team_id}`;
        const existing = squadsByMatchTeam.get(key) ?? [];
        existing.push(row);
        squadsByMatchTeam.set(key, existing);
      });

      const playerRowById = new Map<number, PlayerRow>(playerRows.map((row) => [row.id, row]));
      const playerSlugById = new Map<number, string>(
        playerRows.map((row) => [row.id, resolvePlayerSlug(row.name)])
      );
      const appearanceRowsByPlayer = groupBy(appearances, (row) => row.player_id);
      const injuryRowsByPlayer = groupBy(injuries, (row) => row.player_id);
      const affiliationRowsByPlayer = groupBy(playerAffiliations, (row) => row.player_id);

      const mappedMatches = ensureUniqueMatchSlugs(
        matchRows
          .map((row) =>
            mapMatchRow({
              row,
              matchRows,
              mappedCompetitionByDbId,
              mappedTeamByDbId,
              competitionShortByDbId,
              teamFatigueByKey,
              playerFatigueByMatchTeam,
              previewByMatchTeam,
              squadsByMatchTeam,
              playerRowById,
              playerSlugById,
              appearanceRowsByPlayer,
            })
          )
          .filter((item): item is MatchRecord => Boolean(item))
      );

      const mappedPlayers = playerRows.map((row) =>
        mapPlayerRow({
          row,
          playerSlugById,
          playerFatigueRows: fatigueRows.filter(
            (item) => item.entity_type === "player" && item.entity_id === row.id
          ),
          appearanceRows: appearanceRowsByPlayer.get(row.id) ?? [],
          injuryRows: injuryRowsByPlayer.get(row.id) ?? [],
          affiliationRows: affiliationRowsByPlayer.get(row.id) ?? [],
          mappedTeamByDbId,
          matchRows,
        })
      );

      const worldCupTeams = buildWorldCupProfiles({
        mappedMatches,
        competition: mappedCompetitions.find((item) => item.id === "fifa-world-cup"),
        teamFatigueByKey,
        mappedTeams,
        matchRows,
        mappedTeamByDbId,
      });

      const snapshot: SiteSnapshot = {
        source: "supabase",
        competitions: mappedCompetitions,
        teams: mappedTeams,
        matches: mappedMatches,
        players: mappedPlayers,
        newsItems: [],
        worldCupTeams,
      };
      lastSuccessfulSnapshot = snapshot;
      cachedSnapshot = { value: snapshot, fetchedAt: Date.now() };

      return snapshot;
    } catch (error) {
      console.warn("[SonarFC] Preferred schema unavailable, trying legacy league schema.", error);
      try {
        const client = getSupabaseServerClient();
        const snapshot: SiteSnapshot = await loadLegacySnapshot(client);
        lastSuccessfulSnapshot = snapshot;
        cachedSnapshot = { value: snapshot, fetchedAt: Date.now() };
        return snapshot;
      } catch (legacyError) {
        if (lastSuccessfulSnapshot) {
          console.warn("[SonarFC] Using cached site snapshot after Supabase failure.", legacyError);
          return lastSuccessfulSnapshot;
        }

        console.warn("[SonarFC] Falling back to mock site data.", legacyError);
        return getFallbackSnapshot();
      }
    }
  })();

  try {
    return await inFlightSnapshot;
  } finally {
    inFlightSnapshot = null;
  }
}

async function loadLegacySnapshot(
  client: ReturnType<typeof getSupabaseServerClient>
): Promise<SiteSnapshot> {
  const [leagueRows, teamRows, matchRows] = await Promise.all([
    fetchAllRows<LeagueRow>((from, to) =>
      client.from("leagues").select("*").eq("is_active", true).order("id").range(from, to)
    ),
    fetchAllRows<LegacyTeamRow>((from, to) =>
      client.from("teams").select("*").order("id").range(from, to)
    ),
    fetchAllRows<LegacyMatchRow>((from, to) =>
      client
        .from("matches")
        .select("*")
        .order("kickoff_at", { ascending: true })
        .range(from, to)
    ),
  ]);

  const [playerRows, fatigueRows, appearances, injuries, previewRows] = await Promise.all([
    fetchOptionalRows<LegacyPlayerRow>("players", (from, to) =>
      client.from("players").select("*").order("id").range(from, to)
    ),
    fetchOptionalRows<FatigueRow>("fatigue_scores", (from, to) =>
      client
        .from("fatigue_scores")
        .select("entity_type,entity_id,match_id,score,level,factors,calculated_at")
        .range(from, to)
    ),
    fetchOptionalRows<AppearanceRow>("appearances", (from, to) =>
      client
        .from("appearances")
        .select("id,player_id,match_id,minutes_played,is_starter,subbed_in_at,subbed_out_at")
        .range(from, to)
    ),
    fetchOptionalRows<InjuryRow>("injuries", (from, to) =>
      client
        .from("injuries")
        .select("id,player_id,type,started_at,expected_return,status,created_at")
        .range(from, to)
    ),
    fetchOptionalRows<AiPreviewRow>("ai_previews", (from, to) =>
      client
        .from("ai_previews")
        .select("match_id,team_id,content")
        .range(from, to)
    ),
  ]);

  const competitions = leagueRows.map(mapLeagueRow);
  const teams = teamRows.map(mapLegacyTeamRow);
  const teamByDbId = new Map<number, TeamRecord>(teamRows.map((row) => [row.id, mapLegacyTeamRow(row)]));
  const competitionByDbId = new Map<number, CompetitionRecord>(
    leagueRows.map((row) => [row.id, mapLeagueRow(row)])
  );
  const playerRowById = new Map<number, LegacyPlayerRow>(playerRows.map((row) => [row.id, row]));
  const playerSlugById = new Map<number, string>(
    playerRows.map((row) => [row.id, resolvePlayerSlug(row.name)])
  );
  const playerIdsByTeam = new Map<number, number[]>();
  const appearanceRowsByPlayer = groupBy(appearances, (row) => row.player_id);
  const injuryRowsByPlayer = groupBy(injuries, (row) => row.player_id);
  const latestInjuryByPlayer = new Map<number, InjuryRow>();
  const teamFatigueByKey = new Map<string, FatigueRow>();
  const playerFatigueByMatchTeam = new Map<string, FatigueRow[]>();
  const playerFatigueByTeam = new Map<number, FatigueRow[]>();
  const previewByMatchTeam = new Map<string, AiPreviewRow>();

  playerRows.forEach((row) => {
    if (row.team_id == null) {
      return;
    }

    const existing = playerIdsByTeam.get(row.team_id) ?? [];
    existing.push(row.id);
    playerIdsByTeam.set(row.team_id, existing);
  });

  for (const [playerId, rows] of injuryRowsByPlayer.entries()) {
    const latest = pickLatestInjury(rows);
    if (latest) {
      latestInjuryByPlayer.set(playerId, latest);
    }
  }

  fatigueRows.forEach((row) => {
    if (row.entity_type === "team" && row.match_id != null) {
      teamFatigueByKey.set(`${row.match_id}:${row.entity_id}`, row);
      return;
    }

    if (row.entity_type !== "player") {
      return;
    }

    const player = playerRowById.get(row.entity_id);
    if (!player || player.team_id == null) {
      return;
    }

    const byTeam = playerFatigueByTeam.get(player.team_id) ?? [];
    byTeam.push(row);
    playerFatigueByTeam.set(player.team_id, byTeam);

    if (row.match_id == null) {
      return;
    }

    const byMatchTeam = playerFatigueByMatchTeam.get(`${row.match_id}:${player.team_id}`) ?? [];
    byMatchTeam.push(row);
    playerFatigueByMatchTeam.set(`${row.match_id}:${player.team_id}`, byMatchTeam);
  });

  previewRows.forEach((row) => {
    if (row.match_id == null || row.team_id == null) {
      return;
    }

    previewByMatchTeam.set(`${row.match_id}:${row.team_id}`, row);
  });

  const matches = ensureUniqueMatchSlugs(
    matchRows
      .map((row) =>
        mapLegacyMatchRow({
          row,
          matchRows,
          competitionByDbId,
          teamByDbId,
          teamFatigueByKey,
          playerFatigueByMatchTeam,
          playerFatigueByTeam,
          previewByMatchTeam,
          playerIdsByTeam,
          playerRowById,
          playerSlugById,
          appearanceRowsByPlayer,
          latestInjuryByPlayer,
        })
      )
      .filter((item): item is MatchRecord => Boolean(item))
  );

  const matchRowById = new Map<number, LegacyMatchRow>(matchRows.map((row) => [row.id, row]));
  const players = playerRows
    .map((row) =>
      mapLegacyPlayerRow({
        row,
        teamByDbId,
        matches,
        matchRowById,
        playerFatigueRows: fatigueRows.filter(
          (item) => item.entity_type === "player" && item.entity_id === row.id
        ),
        appearanceRows: appearanceRowsByPlayer.get(row.id) ?? [],
        injuryRows: injuryRowsByPlayer.get(row.id) ?? [],
      })
    )
    .filter((item): item is PlayerProfile => Boolean(item));

  const worldCupTeams = buildWorldCupProfiles({
    mappedMatches: matches,
    competition: competitions.find((item) => item.id === "fifa-world-cup"),
    teamFatigueByKey,
    mappedTeams: teams,
    matchRows,
    mappedTeamByDbId: teamByDbId,
  });

  return {
    source: "supabase",
    competitions,
    teams,
    matches,
    players,
    newsItems: [],
    worldCupTeams,
  };
}

function getFallbackSnapshot(): SiteSnapshot {
  return {
    source: "mock",
    competitions: fallbackCompetitions,
    teams: fallbackTeams,
    matches: fallbackMatches,
    players: fallbackPlayers,
    newsItems: fallbackNewsItems,
    worldCupTeams: fallbackWorldCupTeams,
  };
}

async function loadMatchAdjacency(
  client: ReturnType<typeof getSupabaseServerClient>,
  matchIds: number[]
): Promise<[FatigueRow[], MatchSquadRow[], AiPreviewRow[]]> {
  if (!matchIds.length) {
    return [[], [], []];
  }

  return Promise.all([
    fetchAllRows<FatigueRow>((from, to) =>
      client
        .from("fatigue_scores")
        .select("entity_type,entity_id,match_id,score,level,factors")
        .in("match_id", matchIds)
        .range(from, to)
    ),
    fetchAllRows<MatchSquadRow>((from, to) =>
      client
        .from("match_squads")
        .select("match_id,team_id,player_id,squad_status,availability_reason,expected_return")
        .in("match_id", matchIds)
        .range(from, to)
    ),
    fetchAllRows<AiPreviewRow>((from, to) =>
      client
        .from("ai_previews")
        .select("match_id,team_id,content")
        .in("match_id", matchIds)
        .range(from, to)
    ),
  ]);
}

async function loadPlayerAdjacency(
  client: ReturnType<typeof getSupabaseServerClient>,
  playerIds: number[]
): Promise<[PlayerRow[], PlayerAffiliationRow[], AppearanceRow[], InjuryRow[]]> {
  if (!playerIds.length) {
    return [[], [], [], []];
  }

  return Promise.all([
    fetchAllRows<PlayerRow>((from, to) =>
      client
        .from("players")
        .select("id,name,position,age,nationality,photo_url")
        .in("id", playerIds)
        .range(from, to)
    ),
    fetchAllRows<PlayerAffiliationRow>((from, to) =>
      client
        .from("player_affiliations")
        .select("player_id,team_id,affiliation_type,starts_at,ends_at,is_primary")
        .in("player_id", playerIds)
        .range(from, to)
    ),
    fetchAllRows<AppearanceRow>((from, to) =>
      client
        .from("appearances")
        .select("player_id,match_id,minutes_played,is_starter")
        .in("player_id", playerIds)
        .range(from, to)
    ),
    fetchAllRows<InjuryRow>((from, to) =>
      client
        .from("injuries")
        .select("player_id,type,started_at,expected_return,status")
        .in("player_id", playerIds)
        .range(from, to)
    ),
  ]);
}

function mapCompetitionRow(row: CompetitionRow): CompetitionRecord {
  const slug = resolveCompetitionSlug(row.name, row.short_name);
  const fallback = fallbackCompetitions.find((item) => item.id === slug);

  return {
    id: slug,
    slug,
    icon: row.icon_url ?? fallback?.icon ?? iconForCompetition(slug, row.competition_type),
    name: fallback?.name ?? localized(row.name),
    region: row.region ?? fallback?.region ?? "International",
  };
}

function mapLeagueRow(row: LeagueRow): CompetitionRecord {
  const slug = resolveCompetitionSlug(row.name, row.short_name);
  const fallback = fallbackCompetitions.find((item) => item.id === slug);

  return {
    id: slug,
    slug,
    icon: row.icon_url ?? fallback?.icon ?? iconForCompetition(slug, "league"),
    name: fallback?.name ?? localized(row.name),
    region: row.country ?? fallback?.region ?? "International",
  };
}

function mapTeamRow(row: TeamRow): TeamRecord {
  const slug = resolveTeamSlug(row.name, row.short_name);
  const fallback = fallbackTeams.find((item) => item.id === slug);

  return {
    id: slug,
    slug,
    name: fallback?.name ?? row.name,
    shortName: row.short_name || fallback?.shortName || row.name.slice(0, 3).toUpperCase(),
    type: row.team_type === "national" ? "national" : fallback?.type ?? "club",
    country: row.country ?? fallback?.country ?? "Unknown",
    city: row.home_city ?? fallback?.city ?? row.country ?? "Unknown",
    color: row.primary_color ?? fallback?.color ?? DEFAULT_TEAM_COLOR,
    badge: row.badge_url ?? fallback?.badge ?? badgeForTeam(row.short_name, row.name),
  };
}

function mapLegacyTeamRow(row: LegacyTeamRow): TeamRecord {
  const slug = resolveTeamSlug(row.name, row.short_name);
  const fallback = fallbackTeams.find((item) => item.id === slug);

  return {
    id: slug,
    slug,
    name: fallback?.name ?? row.name,
    shortName: row.short_name || fallback?.shortName || row.name.slice(0, 3).toUpperCase(),
    type: fallback?.type ?? "club",
    country: fallback?.country ?? "Unknown",
    city: row.city ?? fallback?.city ?? "Unknown",
    color: row.primary_color ?? fallback?.color ?? DEFAULT_TEAM_COLOR,
    badge: row.badge_url ?? fallback?.badge ?? badgeForTeam(row.short_name, row.name),
  };
}

function mapMatchRow({
  row,
  matchRows,
  mappedCompetitionByDbId,
  mappedTeamByDbId,
  competitionShortByDbId,
  teamFatigueByKey,
  playerFatigueByMatchTeam,
  previewByMatchTeam,
  squadsByMatchTeam,
  playerRowById,
  playerSlugById,
  appearanceRowsByPlayer,
}: {
  row: MatchRow;
  matchRows: MatchRow[];
  mappedCompetitionByDbId: Map<number, CompetitionRecord>;
  mappedTeamByDbId: Map<number, TeamRecord>;
  competitionShortByDbId: Map<number, string>;
  teamFatigueByKey: Map<string, FatigueRow>;
  playerFatigueByMatchTeam: Map<string, FatigueRow[]>;
  previewByMatchTeam: Map<string, AiPreviewRow>;
  squadsByMatchTeam: Map<string, MatchSquadRow[]>;
  playerRowById: Map<number, PlayerRow>;
  playerSlugById: Map<number, string>;
  appearanceRowsByPlayer: Map<number, AppearanceRow[]>;
}): MatchRecord | null {
  if (row.competition_id == null || row.home_team_id == null || row.away_team_id == null) {
    return null;
  }

  const competition = mappedCompetitionByDbId.get(row.competition_id);
  const homeTeam = mappedTeamByDbId.get(row.home_team_id);
  const awayTeam = mappedTeamByDbId.get(row.away_team_id);

  if (!competition || !homeTeam || !awayTeam) {
    return null;
  }

  const homeSide = buildMatchSide({
    teamDbId: row.home_team_id,
    team: homeTeam,
    matchId: row.id,
    kickoffAt: row.kickoff_at,
    matchRows,
    competitionShortByDbId,
    mappedTeamByDbId,
    teamFatigue: teamFatigueByKey.get(`${row.id}:${row.home_team_id}`),
    playerFatigueRows: playerFatigueByMatchTeam.get(`${row.id}:${row.home_team_id}`) ?? [],
    squadRows: squadsByMatchTeam.get(`${row.id}:${row.home_team_id}`) ?? [],
    preview: previewByMatchTeam.get(`${row.id}:${row.home_team_id}`),
    playerRowById,
    playerSlugById,
    appearanceRowsByPlayer,
  });

  const awaySide = buildMatchSide({
    teamDbId: row.away_team_id,
    team: awayTeam,
    matchId: row.id,
    kickoffAt: row.kickoff_at,
    matchRows,
    competitionShortByDbId,
    mappedTeamByDbId,
    teamFatigue: teamFatigueByKey.get(`${row.id}:${row.away_team_id}`),
    playerFatigueRows: playerFatigueByMatchTeam.get(`${row.id}:${row.away_team_id}`) ?? [],
    squadRows: squadsByMatchTeam.get(`${row.id}:${row.away_team_id}`) ?? [],
    preview: previewByMatchTeam.get(`${row.id}:${row.away_team_id}`),
    playerRowById,
    playerSlugById,
    appearanceRowsByPlayer,
  });

  const slug = buildMatchSlug(homeTeam.slug, awayTeam.slug, competition.id);
  const featuredPlayerSlug =
    homeSide.keyFatigued[0]?.playerSlug ??
    awaySide.keyFatigued[0]?.playerSlug ??
    "";

  return {
    id: `match-${row.id}`,
    slug,
    bucket: deriveBucket(row.kickoff_at),
    competitionId: competition.id,
    stage: row.stage ?? defaultStage(competition.id),
    status: row.status ?? "scheduled",
    kickoffLabel: formatKickoffLabel(row.kickoff_at),
    startsAt: row.kickoff_at,
    venue: row.venue ?? "",
    homeScore: row.home_score ?? null,
    awayScore: row.away_score ?? null,
    home: homeSide,
    away: awaySide,
    verdict: localized(buildVerdict(homeTeam.name, awayTeam.name, homeSide.fatigue, awaySide.fatigue)),
    spotlight: localized(buildSpotlight(homeTeam.name, awayTeam.name, competition.name.en)),
    featuredPlayerSlug,
  };
}

function mapLegacyMatchRow({
  row,
  matchRows,
  competitionByDbId,
  teamByDbId,
  teamFatigueByKey,
  playerFatigueByMatchTeam,
  playerFatigueByTeam,
  previewByMatchTeam,
  playerIdsByTeam,
  playerRowById,
  playerSlugById,
  appearanceRowsByPlayer,
  latestInjuryByPlayer,
}: {
  row: LegacyMatchRow;
  matchRows: LegacyMatchRow[];
  competitionByDbId: Map<number, CompetitionRecord>;
  teamByDbId: Map<number, TeamRecord>;
  teamFatigueByKey: Map<string, FatigueRow>;
  playerFatigueByMatchTeam: Map<string, FatigueRow[]>;
  playerFatigueByTeam: Map<number, FatigueRow[]>;
  previewByMatchTeam: Map<string, AiPreviewRow>;
  playerIdsByTeam: Map<number, number[]>;
  playerRowById: Map<number, LegacyPlayerRow>;
  playerSlugById: Map<number, string>;
  appearanceRowsByPlayer: Map<number, AppearanceRow[]>;
  latestInjuryByPlayer: Map<number, InjuryRow>;
}): MatchRecord | null {
  if (row.league_id == null || row.home_team_id == null || row.away_team_id == null) {
    return null;
  }

  const competition = competitionByDbId.get(row.league_id);
  const homeTeam = teamByDbId.get(row.home_team_id);
  const awayTeam = teamByDbId.get(row.away_team_id);

  if (!competition || !homeTeam || !awayTeam) {
    return null;
  }

  const homeSide = buildLegacyMatchSide({
    teamDbId: row.home_team_id,
    currentMatch: row,
    matchRows,
    team: homeTeam,
    competitionShort: competition.id === "champions-league" ? "UCL" : competition.slug.toUpperCase(),
    teamByDbId,
    teamFatigue: teamFatigueByKey.get(`${row.id}:${row.home_team_id}`),
    playerFatigueRows:
      playerFatigueByMatchTeam.get(`${row.id}:${row.home_team_id}`) ??
      playerFatigueByTeam.get(row.home_team_id) ??
      [],
    preview: previewByMatchTeam.get(`${row.id}:${row.home_team_id}`),
    teamPlayerIds: playerIdsByTeam.get(row.home_team_id) ?? [],
    playerRowById,
    playerSlugById,
    appearanceRowsByPlayer,
    latestInjuryByPlayer,
  });
  const awaySide = buildLegacyMatchSide({
    teamDbId: row.away_team_id,
    currentMatch: row,
    matchRows,
    team: awayTeam,
    competitionShort: competition.id === "champions-league" ? "UCL" : competition.slug.toUpperCase(),
    teamByDbId,
    teamFatigue: teamFatigueByKey.get(`${row.id}:${row.away_team_id}`),
    playerFatigueRows:
      playerFatigueByMatchTeam.get(`${row.id}:${row.away_team_id}`) ??
      playerFatigueByTeam.get(row.away_team_id) ??
      [],
    preview: previewByMatchTeam.get(`${row.id}:${row.away_team_id}`),
    teamPlayerIds: playerIdsByTeam.get(row.away_team_id) ?? [],
    playerRowById,
    playerSlugById,
    appearanceRowsByPlayer,
    latestInjuryByPlayer,
  });

  return {
    id: `match-${row.id}`,
    slug: buildMatchSlug(homeTeam.slug, awayTeam.slug, competition.id),
    bucket: deriveBucket(row.kickoff_at),
    competitionId: competition.id,
    stage: row.matchday ?? "Matchday",
    status: row.status ?? "scheduled",
    kickoffLabel: formatKickoffLabel(row.kickoff_at),
    startsAt: row.kickoff_at,
    venue: row.venue ?? "",
    homeScore: row.home_score ?? null,
    awayScore: row.away_score ?? null,
    home: homeSide,
    away: awaySide,
    verdict: localized(buildVerdict(homeTeam.name, awayTeam.name, homeSide.fatigue, awaySide.fatigue)),
    spotlight: localized(buildSpotlight(homeTeam.name, awayTeam.name, competition.name.en)),
    featuredPlayerSlug:
      homeSide.keyFatigued[0]?.playerSlug ?? awaySide.keyFatigued[0]?.playerSlug ?? "",
  };
}

function buildLegacyMatchSide({
  teamDbId,
  currentMatch,
  matchRows,
  team,
  competitionShort,
  teamByDbId,
  teamFatigue,
  playerFatigueRows,
  preview,
  teamPlayerIds,
  playerRowById,
  playerSlugById,
  appearanceRowsByPlayer,
  latestInjuryByPlayer,
}: {
  teamDbId: number;
  currentMatch: LegacyMatchRow;
  matchRows: LegacyMatchRow[];
  team: TeamRecord;
  competitionShort: string;
  teamByDbId: Map<number, TeamRecord>;
  teamFatigue?: FatigueRow;
  playerFatigueRows: FatigueRow[];
  preview?: AiPreviewRow;
  teamPlayerIds: number[];
  playerRowById: Map<number, LegacyPlayerRow>;
  playerSlugById: Map<number, string>;
  appearanceRowsByPlayer: Map<number, AppearanceRow[]>;
  latestInjuryByPlayer: Map<number, InjuryRow>;
}): MatchSide {
  const history = matchRows
    .filter(
      (row) =>
        row.id !== currentMatch.id &&
        (row.home_team_id === teamDbId || row.away_team_id === teamDbId) &&
        row.kickoff_at <= currentMatch.kickoff_at
    )
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))
    .slice(-5);
  const results = history.map((row) => resolveLegacyResult(row, teamDbId));
  const schedule = buildLegacySchedule({
    teamDbId,
    currentMatch,
    matchRows,
    competitionShort,
    teamByDbId,
  });
  const formationHealth = buildLegacyFormationHealth(teamPlayerIds, latestInjuryByPlayer);
  const squadAvailability = Math.round(computeAvailabilityPercent(formationHealth) ?? 100);
  const matchDensity =
    factorNumber(teamFatigue?.factors, ["matches_in_14d"]) ??
    computeLegacyMatchDensity(teamDbId, currentMatch.kickoff_at, matchRows) ??
    0;
  const restDays = computeLegacyRestDays(teamDbId, currentMatch.kickoff_at, matchRows) ?? 0;
  const fatigue = roundedNumber(teamFatigue?.score, deriveLegacyFatigue(matchDensity, restDays));
  const travelKm =
    factorNumber(teamFatigue?.factors, ["travel_distance_km", "distance_km", "travel_km"]) ?? 0;
  const keyFatigued = buildKeyPlayers({
    playerFatigueRows,
    playerRowById,
    playerSlugById,
    appearanceRowsByPlayer,
  });
  const keyAbsent = teamPlayerIds
    .map((playerId) => {
      const injury = latestInjuryByPlayer.get(playerId);
      if (!injury || !isActiveInjury(injury.status)) {
        return null;
      }

      return playerRowById.get(playerId)?.name ?? null;
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 4);
  const summary =
    preview?.content.trim()
      ? localized(preview.content.trim())
      : localized(buildAiSummary(team.name, fatigue, squadAvailability));

  return {
    teamId: team.id,
    fatigue,
    squadAvailability,
    matchDensity,
    restDays,
    travelKm,
    recentResults: results,
    momentumLabels:
      history.length
        ? history.map((row) => {
            const opponentDbId = row.home_team_id === teamDbId ? row.away_team_id : row.home_team_id;
            const opponent = opponentDbId == null ? null : teamByDbId.get(opponentDbId);
            const homeAway = row.home_team_id === teamDbId ? "H" : "A";
            return `${opponent?.shortName ?? "OPP"}(${homeAway})`;
          })
        : [],
    keyAbsent,
    keyFatigued,
    schedule,
    aiSummary: summary,
    statusNote: localized(
      `${team.name} have ${matchDensity} matches in the last 14 days and ${restDays} days between fixtures.`
    ),
    formationHealth,
  };
}

function mapLegacyPlayerRow({
  row,
  teamByDbId,
  matches,
  matchRowById,
  playerFatigueRows,
  appearanceRows,
  injuryRows,
}: {
  row: LegacyPlayerRow;
  teamByDbId: Map<number, TeamRecord>;
  matches: MatchRecord[];
  matchRowById: Map<number, LegacyMatchRow>;
  playerFatigueRows: FatigueRow[];
  appearanceRows: AppearanceRow[];
  injuryRows: InjuryRow[];
}): PlayerProfile | null {
  const slug = resolvePlayerSlug(row.name);
  const team = row.team_id != null ? teamByDbId.get(row.team_id) : null;

  if (!team) {
    return null;
  }
  const orderedAppearances = sortAppearancesByMatchDate(appearanceRows, matchRowById);
  const seasonMinutes =
    row.season_total_minutes && row.season_total_minutes > 0
      ? row.season_total_minutes
      : orderedAppearances.reduce((sum, item) => sum + item.minutes_played, 0);
  const last14Minutes =
    playerFatigueRows
      .map((item) => factorNumber(item.factors, ["minutes_14d", "last14_minutes", "minutes14d"]))
      .find((item): item is number => typeof item === "number") ??
    computeLegacyLast14Minutes(orderedAppearances, matchRowById);
  const latestFatigue = pickLatestFatigueRow(playerFatigueRows, matchRowById);
  const fatigueScore = roundedNumber(
    latestFatigue?.score,
    derivePlayerFatigue(last14Minutes || Math.max(0, Math.round(seasonMinutes / 8)))
  );
  const level = normalizeLevel(latestFatigue?.level ?? null, fatigueScore);
  const injuries = orderedInjuries(injuryRows).map((item) => ({
    date: item.started_at ?? "Unknown",
    label: localized(item.type ?? "Unavailable"),
    duration: item.expected_return ?? item.status ?? "Monitoring",
  }));
  const workloadHistory = buildWorkloadHistory(orderedAppearances);
  const fatigueTrend = buildFatigueTrend(
    sortFatigueRowsByMatchDate(playerFatigueRows, matchRowById),
    fatigueScore
  );
  const appearancesCount = orderedAppearances.length;

  return {
    slug,
    teamId: team.id,
    name: row.name,
    photo: row.photo_url ?? undefined,
    position: row.position ?? "MID",
    age: row.age ?? 26,
    nationality: row.nationality ?? "Unknown",
    fatigueScore,
    level,
    last14Minutes,
    seasonMinutes,
    appearancesCount,
    startsLast5: orderedAppearances.slice(-5).filter((item) => item.is_starter).length,
    nextFixture: resolvePlayerNextFixtureFromMatches(team.id, matches, teamByDbId) ?? "",
    summary: localized(
      `${row.name} currently has ${seasonMinutes} logged season minutes and a fatigue score of ${fatigueScore}/100.`
    ),
    workloadHistory: workloadHistory.values,
    workloadLabels: workloadHistory.labels,
    fatigueTrend: fatigueTrend.values,
    fatigueLabels: fatigueTrend.labels,
    injuries,
    rotationPrediction: localized(
      fatigueScore > 65
        ? `${row.name} is drifting toward managed minutes if the schedule stays dense.`
        : `${row.name} should remain in the normal rotation.`
    ),
    comparison: buildPlayerComparison({
      totalMinutes: seasonMinutes,
      last14Minutes,
      fatigueScore,
    }),
  };
}

function buildMatchSide({
  teamDbId,
  team,
  matchId,
  kickoffAt,
  matchRows,
  competitionShortByDbId,
  mappedTeamByDbId,
  teamFatigue,
  playerFatigueRows,
  squadRows,
  preview,
  playerRowById,
  playerSlugById,
  appearanceRowsByPlayer,
}: {
  teamDbId: number;
  team: TeamRecord;
  matchId: number;
  kickoffAt: string;
  matchRows: MatchRow[];
  competitionShortByDbId: Map<number, string>;
  mappedTeamByDbId: Map<number, TeamRecord>;
  teamFatigue?: FatigueRow;
  playerFatigueRows: FatigueRow[];
  squadRows: MatchSquadRow[];
  preview?: AiPreviewRow;
  playerRowById: Map<number, PlayerRow>;
  playerSlugById: Map<number, string>;
  appearanceRowsByPlayer: Map<number, AppearanceRow[]>;
}): MatchSide {
  const formationHealth = buildFormationHealth(squadRows);
  const recentForm = buildRecentForm({
    teamDbId,
    matchId,
    kickoffAt,
    matchRows,
    mappedTeamByDbId,
    competitionShortByDbId,
  });
  const schedule = buildSchedule({
    teamDbId,
    matchId,
    kickoffAt,
    matchRows,
    mappedTeamByDbId,
    competitionShortByDbId,
  });
  const matchDensity =
    factorNumber(teamFatigue?.factors, ["matches_in_14d", "matches_14d"]) ??
    computeMatchDensity(teamDbId, kickoffAt, matchRows) ??
    0;
  const restDays = computeRestDays(teamDbId, kickoffAt, matchRows) ?? 0;
  const fatigueScore = roundedNumber(teamFatigue?.score, deriveLegacyFatigue(matchDensity, restDays));
  const squadAvailability = computeAvailabilityPercent(formationHealth) ?? 100;
  const travelKm =
    factorNumber(teamFatigue?.factors, ["travel_distance_km", "distance_km", "travel_km"]) ?? 0;

  const keyFatigued = buildKeyPlayers({
    playerFatigueRows,
    playerRowById,
    playerSlugById,
    appearanceRowsByPlayer,
  });

  const keyAbsent =
    squadRows
      .filter((row) => ["out", "doubtful", "suspended", "national_duty"].includes(row.squad_status))
      .map((row) => playerRowById.get(row.player_id)?.name)
      .filter((item): item is string => Boolean(item))
      .slice(0, 4) || [];

  const aiSummary =
    preview?.content.trim()
      ? localized(preview.content.trim())
      : localized(buildAiSummary(team.name, fatigueScore, squadAvailability));

  const statusNote = localized(
    `${fatigueLabel(fatigueScore, "en")} · ${Math.round(squadAvailability)}% availability · ${matchDensity} matches / 14d`
  );

  return {
    teamId: team.id,
    fatigue: fatigueScore,
    squadAvailability: Math.round(squadAvailability),
    matchDensity: Math.max(0, Math.round(matchDensity)),
    restDays: Math.max(0, Math.round(restDays)),
    travelKm: Math.max(0, Math.round(travelKm)),
    recentResults: recentForm.results,
    momentumLabels: recentForm.labels,
    keyAbsent,
    keyFatigued,
    schedule,
    aiSummary,
    statusNote,
    formationHealth,
  };
}

function buildFormationHealth(squadRows: MatchSquadRow[]) {
  if (!squadRows.length) {
    return {
      available: 0,
      doubtful: 0,
      absent: 0,
    };
  }

  return squadRows.reduce(
    (acc, row) => {
      if (["starter", "bench", "available"].includes(row.squad_status)) {
        acc.available += 1;
      } else if (["doubtful"].includes(row.squad_status)) {
        acc.doubtful += 1;
      } else {
        acc.absent += 1;
      }

      return acc;
    },
    { available: 0, doubtful: 0, absent: 0 }
  );
}

function buildRecentForm({
  teamDbId,
  matchId,
  kickoffAt,
  matchRows,
  mappedTeamByDbId,
  competitionShortByDbId,
}: {
  teamDbId: number;
  matchId: number;
  kickoffAt: string;
  matchRows: MatchRow[];
  mappedTeamByDbId: Map<number, TeamRecord>;
  competitionShortByDbId: Map<number, string>;
}) {
  const history = matchRows
    .filter(
      (row) =>
        row.id !== matchId &&
        (row.home_team_id === teamDbId || row.away_team_id === teamDbId) &&
        isFinished(row) &&
        row.kickoff_at < kickoffAt
    )
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))
    .slice(-5);

  if (!history.length) {
    return {
      results: [],
      labels: [],
    };
  }

  return {
    results: history.map((row) => resolveResult(row, teamDbId)),
    labels: history.map((row) => {
      const opponentId = row.home_team_id === teamDbId ? row.away_team_id : row.home_team_id;
      const opponent = opponentId == null ? null : mappedTeamByDbId.get(opponentId);
      const competitionShort =
        row.competition_id == null ? "" : competitionShortByDbId.get(row.competition_id) ?? "";
      const homeAway = row.home_team_id === teamDbId ? "H" : "A";
      return opponent ? `${opponent.shortName}(${homeAway})` : competitionShort || "OPP";
    }),
  };
}

function buildSchedule({
  teamDbId,
  matchId,
  kickoffAt,
  matchRows,
  mappedTeamByDbId,
  competitionShortByDbId,
}: {
  teamDbId: number;
  matchId: number;
  kickoffAt: string;
  matchRows: MatchRow[];
  mappedTeamByDbId: Map<number, TeamRecord>;
  competitionShortByDbId: Map<number, string>;
}) {
  const related = matchRows
    .filter((row) => row.home_team_id === teamDbId || row.away_team_id === teamDbId)
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
  const currentIndex = related.findIndex((row) => row.id === matchId);

  if (currentIndex === -1) {
    return [];
  }

  return related
    .slice(Math.max(0, currentIndex - 2), currentIndex + 3)
    .map((row) => {
      const opponentId = row.home_team_id === teamDbId ? row.away_team_id : row.home_team_id;
      const opponent = opponentId == null ? null : mappedTeamByDbId.get(opponentId);
      const day = dayDiff(row.kickoff_at, kickoffAt);

      return {
        day,
        opponent: opponent?.shortName ?? "OPP",
        home: row.home_team_id === teamDbId,
        competitionShort:
          row.competition_id == null
            ? ""
            : competitionShortByDbId.get(row.competition_id) ?? "",
        current: row.id === matchId,
      };
    });
}

function buildKeyPlayers({
  playerFatigueRows,
  playerRowById,
  playerSlugById,
  appearanceRowsByPlayer,
}: {
  playerFatigueRows: FatigueRow[];
  playerRowById: Map<number, PlayerRow>;
  playerSlugById: Map<number, string>;
  appearanceRowsByPlayer: Map<number, AppearanceRow[]>;
}) {
  const ranked = [...playerFatigueRows]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => {
      const player = playerRowById.get(row.entity_id);

      if (!player) {
        return null;
      }

      const appearanceRows = appearanceRowsByPlayer.get(row.entity_id) ?? [];
      const last14Minutes =
        factorNumber(row.factors, ["minutes_14d", "last14_minutes", "minutes14d"]) ??
        appearanceRows.reduce((sum, item) => sum + item.minutes_played, 0);

      const level = normalizeLevel(row.level, row.score);

      const load: KeyPlayerLoad = {
        playerSlug: playerSlugById.get(row.entity_id) ?? undefined,
        name: player.name,
        age: player.age ?? 26,
        minutes14d: Math.round(last14Minutes),
        level,
        note: localized(
          row.factors?.summary && typeof row.factors.summary === "string"
            ? row.factors.summary
            : `${workloadLabel(level, "en")} workload entering the next match.`
        ),
      };

      return load;
    })
    .filter((item): item is KeyPlayerLoad => item !== null);

  return ranked;
}

function mapPlayerRow({
  row,
  playerSlugById,
  playerFatigueRows,
  appearanceRows,
  injuryRows,
  affiliationRows,
  mappedTeamByDbId,
  matchRows,
}: {
  row: PlayerRow;
  playerSlugById: Map<number, string>;
  playerFatigueRows: FatigueRow[];
  appearanceRows: AppearanceRow[];
  injuryRows: InjuryRow[];
  affiliationRows: PlayerAffiliationRow[];
  mappedTeamByDbId: Map<number, TeamRecord>;
  matchRows: MatchRow[];
}): PlayerProfile {
  const slug = playerSlugById.get(row.id) ?? resolvePlayerSlug(row.name);
  const fallback = fallbackPlayers.find((item) => item.slug === slug);
  const orderedAppearances = [...appearanceRows].filter((item) => item.match_id != null);
  const totalMinutes = orderedAppearances.reduce((sum, item) => sum + item.minutes_played, 0);
  const last14Minutes =
    playerFatigueRows
      .map((item) => factorNumber(item.factors, ["minutes_14d", "last14_minutes", "minutes14d"]))
      .find((item): item is number => typeof item === "number") ?? totalMinutes;
  const latestFatigue = [...playerFatigueRows].sort((a, b) => b.score - a.score)[0];
  const fatigueScore = roundedNumber(latestFatigue?.score, fallback?.fatigueScore ?? 52);
  const level = normalizeLevel(latestFatigue?.level ?? null, fatigueScore);
  const teamDbId =
    pickCurrentTeamDbId(affiliationRows) ?? resolveLatestTeamDbId(orderedAppearances);
  const team =
    (typeof teamDbId === "number" ? mappedTeamByDbId.get(teamDbId) : null) ??
    (fallback?.teamId ? fallbackTeams.find((item) => item.id === fallback.teamId) : null) ??
    fallbackTeams[0];
  const workloadHistory = buildWorkloadHistory(orderedAppearances);
  const fatigueTrend = buildFatigueTrend(playerFatigueRows, fatigueScore);
  const nextFixture =
    resolveNextFixtureLabel(matchRows, teamDbId ?? null, mappedTeamByDbId) ??
    fallback?.nextFixture ??
    "TBD";
  const injuries = injuryRows.length
    ? injuryRows.map((item) => ({
        date: item.started_at ?? "Unknown",
        label: localized(item.type ?? "Unavailable"),
        duration: item.expected_return ?? (item.status ?? "Monitoring"),
      }))
    : fallback?.injuries ?? [];
  const comparison = buildPlayerComparison({
    totalMinutes,
    last14Minutes: Math.round(last14Minutes),
    fatigueScore,
  });

  return {
    slug,
    teamId: team.id,
    name: row.name,
    photo: row.photo_url ?? fallback?.photo,
    position: row.position ?? fallback?.position ?? "MID",
    age: row.age ?? fallback?.age ?? 26,
    nationality: row.nationality ?? fallback?.nationality ?? "Unknown",
    fatigueScore,
    level,
    last14Minutes: Math.round(last14Minutes),
    seasonMinutes: totalMinutes || fallback?.seasonMinutes || Math.round(last14Minutes * 4),
    appearancesCount: orderedAppearances.length,
    startsLast5:
      orderedAppearances
        .slice(-5)
        .filter((item) => item.is_starter)
        .length || fallback?.startsLast5 || 3,
    nextFixture,
    summary:
      fallback?.summary ??
      localized(
        `${row.name} remains in the ${workloadLabel(level, "en").toLowerCase()} zone, with a latest fatigue score of ${fatigueScore}/100.`
      ),
    workloadHistory: workloadHistory.values,
    workloadLabels: workloadHistory.labels,
    fatigueTrend: fatigueTrend.values,
    fatigueLabels: fatigueTrend.labels,
    injuries,
    rotationPrediction:
      fallback?.rotationPrediction ??
      localized(
        fatigueScore > 65
          ? `${row.name} is trending toward managed minutes in the next fixture.`
          : `${row.name} should remain in the normal rotation unless match load spikes again.`
      ),
    comparison: fallback?.comparison ?? comparison,
  };
}

function buildWorldCupProfiles({
  mappedMatches,
  competition,
  teamFatigueByKey,
  mappedTeams,
  matchRows,
  mappedTeamByDbId,
}: {
  mappedMatches: MatchRecord[];
  competition?: CompetitionRecord;
  teamFatigueByKey: Map<string, FatigueRow>;
  mappedTeams: TeamRecord[];
  matchRows: Array<
    Pick<MatchRow, "id" | "home_team_id" | "away_team_id" | "venue"> |
    Pick<LegacyMatchRow, "id" | "home_team_id" | "away_team_id" | "venue">
  >;
  mappedTeamByDbId: Map<number, TeamRecord>;
}) {
  if (!competition) {
    return [] as WorldCupTeamProfile[];
  }

  const worldCupMatches = mappedMatches.filter((match) => match.competitionId === competition.id);
  const teamIds = unique(
    worldCupMatches.map((match) => match.home.teamId),
    worldCupMatches.map((match) => match.away.teamId)
  );

  return teamIds.map((teamId, index) => {
    const team = mappedTeams.find((item) => item.id === teamId);
    const dbTeamEntry = [...mappedTeamByDbId.entries()].find(([, item]) => item.id === teamId);
    const dbTeamId = dbTeamEntry?.[0];
    const relatedRows = matchRows.filter(
      (row) => row.home_team_id === dbTeamId || row.away_team_id === dbTeamId
    );
    const fatigueValues = relatedRows
      .map((row) => teamFatigueByKey.get(`${row.id}:${dbTeamId}`)?.score)
      .filter((item): item is number => typeof item === "number");
    const averageFatigue =
      fatigueValues.length
        ? fatigueValues.reduce((sum, value) => sum + value, 0) / fatigueValues.length
        : 50;
    const latestFactor = relatedRows
      .map((row) => teamFatigueByKey.get(`${row.id}:${dbTeamId}`)?.factors)
      .find(Boolean);
    const travelKm =
      factorNumber(latestFactor, ["travel_distance_km", "distance_km", "travel_km"]) ?? 0;
    const restDays =
      computeMappedRestDays(teamId, worldCupMatches) ?? 0;

    return {
      teamId,
      group: String.fromCharCode(65 + (index % 8)),
      clubMinutesIndex: Math.round(averageFatigue),
      travelKm: Math.round(travelKm),
      restDaysBetweenMatches: Math.round(restDays),
      keyRiskCount: averageFatigue > 68 ? 3 : averageFatigue > 52 ? 2 : 1,
      outlook: localized(
        `${team?.name ?? "Team"} arrive with ${fatigueLabel(averageFatigue, "en").toLowerCase()} fatigue and ${formatDistance(travelKm)} of recent travel.`
      ),
      travelLegs: buildWorldCupTravelLegs(team?.city ?? "Camp", relatedRows, mappedTeamByDbId),
      recoveryMatrix: buildRecoveryMatrix(teamId, worldCupMatches, mappedTeams),
    };
  });
}

function buildWorldCupTravelLegs(
  start: string,
  rows: Array<
    Pick<MatchRow, "venue" | "home_team_id" | "away_team_id"> |
    Pick<LegacyMatchRow, "venue" | "home_team_id" | "away_team_id">
  >,
  mappedTeamByDbId: Map<number, TeamRecord>
): WorldCupTravelLeg[] {
  return rows.slice(0, 3).map((row, index) => {
    const opponentId = index % 2 === 0 ? row.away_team_id : row.home_team_id;
    const opponent = opponentId == null ? null : mappedTeamByDbId.get(opponentId);
    return {
      from: index === 0 ? start : rows[index - 1]?.venue ?? start,
      to: row.venue ?? opponent?.city ?? "Venue",
      distanceKm: 800 + index * 420,
      timezoneShift: 0,
    };
  });
}

function buildRecoveryMatrix(
  teamId: string,
  matches: MatchRecord[],
  teams: TeamRecord[]
): WorldCupRecoveryMatch[] {
  return matches
    .filter((match) => match.home.teamId === teamId || match.away.teamId === teamId)
    .slice(0, 3)
    .map((match) => {
      const opponentId = match.home.teamId === teamId ? match.away.teamId : match.home.teamId;
      const opponent = teams.find((item) => item.id === opponentId);
      const firstPoint = match.home.teamId === teamId ? match.home.schedule[0] : match.away.schedule[0];

      return {
        opponent: opponent?.name ?? "Opponent",
        city: match.venue,
        daysBetween: Math.max(3, Math.abs(firstPoint?.day ?? 4)),
      };
    });
}

function resolveCompetitionSlug(name: string, shortName?: string | null) {
  const fromShort = shortName ? COMPETITION_SLUG_ALIASES[normalizeKey(shortName)] : undefined;
  if (fromShort) {
    return fromShort;
  }

  const fromName = COMPETITION_SLUG_ALIASES[normalizeKey(name)];
  if (fromName) {
    return fromName;
  }

  return slugify(name);
}

function resolveTeamSlug(name: string, shortName?: string | null) {
  const fromName = TEAM_SLUG_ALIASES[normalizeKey(name)];
  if (fromName) {
    return fromName;
  }

  const fromShort = shortName ? TEAM_SLUG_ALIASES[normalizeKey(shortName)] : undefined;
  if (fromShort) {
    return fromShort;
  }

  return slugify(name);
}

function resolvePlayerSlug(name: string) {
  return slugify(name);
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeKey(value: string) {
  return slugify(value).replace(/-/g, " ");
}

function iconForCompetition(slug: string, competitionType?: string | null) {
  const fallback = fallbackCompetitions.find((item) => item.id === slug);
  if (fallback) {
    return fallback.icon;
  }

  if (slug === "champions-league") {
    return "⭐";
  }
  if (slug === "fifa-world-cup") {
    return "🌎";
  }
  if (competitionType === "international") {
    return "🌍";
  }

  return "🏟️";
}

function badgeForTeam(shortName?: string | null, name?: string) {
  const fallback =
    fallbackTeams.find((item) => item.shortName === shortName) ??
    fallbackTeams.find((item) => item.name === name);
  if (fallback) {
    return fallback.badge;
  }

  return shortName?.slice(0, 2).toUpperCase() ?? "FC";
}

function localized(value: string): LocalizedText {
  return { zh: value, en: value };
}

function deriveBucket(startsAt: string, referenceDate = new Date()): MatchBucket {
  const now = referenceDate;
  const target = new Date(startsAt);
  const today = startOfDay(now).getTime();
  const targetDay = startOfDay(target).getTime();
  const diff = Math.round((targetDay - today) / (24 * 60 * 60 * 1000));

  if (diff <= 0) {
    return "today";
  }
  if (diff === 1) {
    return "tomorrow";
  }
  return "week";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatKickoffLabel(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", " ·");
}

function defaultStage(competitionId: string) {
  if (competitionId === "champions-league") {
    return "Knockout";
  }
  if (competitionId === "fifa-world-cup") {
    return "Group stage";
  }
  return "Matchday";
}

function buildVerdict(homeName: string, awayName: string, homeFatigue: number, awayFatigue: number) {
  if (Math.abs(homeFatigue - awayFatigue) < 8) {
    return `${homeName} and ${awayName} arrive in very similar condition.`;
  }

  if (homeFatigue < awayFatigue) {
    return `${homeName} hold the cleaner recovery profile entering this matchup.`;
  }

  return `${awayName} hold the cleaner recovery profile entering this matchup.`;
}

function buildSpotlight(homeName: string, awayName: string, competitionName: string) {
  return `${homeName} vs ${awayName} is one of the clearest condition tests in ${competitionName}.`;
}

function buildAiSummary(teamName: string, fatigueScore: number, availability: number) {
  const fatigueState = fatigueLabel(fatigueScore, "en").toLowerCase();
  return `${teamName} enter on a ${fatigueState} profile with ${Math.round(availability)}% squad availability. The pre-match edge depends on how much they can protect the key-minute players.`;
}

function factorNumber(
  factors: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  if (!factors) {
    return null;
  }

  for (const key of keys) {
    const value = factors[key];
    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

function roundedNumber(value: number | null | undefined, fallback: number) {
  return Math.round(typeof value === "number" ? value : fallback);
}

function normalizeLevel(
  level: "high" | "medium" | "low" | null | undefined,
  score: number
): "high" | "medium" | "low" {
  if (level === "high" || level === "medium" || level === "low") {
    return level;
  }

  const tone = fatigueTone(score);
  if (tone === "danger") {
    return "high";
  }
  if (tone === "warning") {
    return "medium";
  }
  return "low";
}

function unique<T extends string | number>(...values: T[][]): T[] {
  return [...new Set(values.flat())];
}

function mergeByKey<T>(preferred: T[], fallback: T[], getKey: (item: T) => string) {
  const map = new Map<string, T>();
  fallback.forEach((item) => map.set(getKey(item), item));
  preferred.forEach((item) => map.set(getKey(item), item));
  return [...map.values()];
}

function groupBy<T, K>(items: T[], getKey: (item: T) => K) {
  const map = new Map<K, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  });
  return map;
}

function isFinished(row: MatchRow) {
  return row.status === "finished" || (row.home_score != null && row.away_score != null);
}

function resolveResult(row: MatchRow, teamDbId: number): Result {
  const isHome = row.home_team_id === teamDbId;
  const teamScore = isHome ? row.home_score ?? 0 : row.away_score ?? 0;
  const opponentScore = isHome ? row.away_score ?? 0 : row.home_score ?? 0;

  if (teamScore > opponentScore) {
    return "W";
  }
  if (teamScore < opponentScore) {
    return "L";
  }
  return "D";
}

function computeAvailabilityPercent(formationHealth: MatchSide["formationHealth"]) {
  const total = formationHealth.available + formationHealth.doubtful + formationHealth.absent;
  if (!total) {
    return null;
  }

  return (formationHealth.available / total) * 100;
}

function computeMatchDensity(teamDbId: number, kickoffAt: string, matchRows: MatchRow[]) {
  const current = new Date(kickoffAt).getTime();
  const windowStart = current - 14 * 24 * 60 * 60 * 1000;
  return matchRows.filter((row) => {
    const kickoff = new Date(row.kickoff_at).getTime();
    return (
      kickoff >= windowStart &&
      kickoff <= current &&
      (row.home_team_id === teamDbId || row.away_team_id === teamDbId)
    );
  }).length;
}

function computeRestDays(teamDbId: number, kickoffAt: string, matchRows: MatchRow[]) {
  const previous = matchRows
    .filter(
      (row) =>
        (row.home_team_id === teamDbId || row.away_team_id === teamDbId) &&
        row.kickoff_at < kickoffAt
    )
    .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at))[0];

  if (!previous) {
    return null;
  }

  return Math.max(0, dayDiff(kickoffAt, previous.kickoff_at));
}

function dayDiff(left: string, right: string) {
  const leftTime = startOfDay(new Date(left)).getTime();
  const rightTime = startOfDay(new Date(right)).getTime();
  return Math.round((leftTime - rightTime) / (24 * 60 * 60 * 1000));
}

function pickCurrentTeamDbId(rows: PlayerAffiliationRow[]) {
  const now = new Date().toISOString().slice(0, 10);
  const current = rows
    .filter((row) => (!row.ends_at || row.ends_at >= now) && row.starts_at <= now)
    .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)))[0];

  return current?.team_id ?? null;
}

function resolveLatestTeamDbId(rows: AppearanceRow[]) {
  const latest = [...rows].reverse().find((row) => row.team_id != null);
  return latest?.team_id ?? null;
}

function sortAppearancesByMatchDate(
  rows: AppearanceRow[],
  matchRowById: Map<number, LegacyMatchRow>
) {
  return [...rows]
    .filter((row) => row.match_id != null && matchRowById.has(row.match_id))
    .sort((left, right) => {
      const leftKickoff = matchRowById.get(left.match_id!)?.kickoff_at ?? "";
      const rightKickoff = matchRowById.get(right.match_id!)?.kickoff_at ?? "";
      return leftKickoff.localeCompare(rightKickoff);
    });
}

function computeLegacyLast14Minutes(
  rows: AppearanceRow[],
  matchRowById: Map<number, LegacyMatchRow>
) {
  if (!rows.length) {
    return 0;
  }

  const latestKickoff = matchRowById.get(rows[rows.length - 1]?.match_id ?? -1)?.kickoff_at;
  if (!latestKickoff) {
    return 0;
  }

  const latestTime = new Date(latestKickoff).getTime();
  const windowStart = latestTime - 14 * 24 * 60 * 60 * 1000;

  return rows.reduce((sum, row) => {
    if (row.match_id == null) {
      return sum;
    }

    const kickoff = matchRowById.get(row.match_id)?.kickoff_at;
    if (!kickoff) {
      return sum;
    }

    const kickoffTime = new Date(kickoff).getTime();
    return kickoffTime >= windowStart && kickoffTime <= latestTime
      ? sum + row.minutes_played
      : sum;
  }, 0);
}

function sortFatigueRowsByMatchDate(
  rows: FatigueRow[],
  matchRowById: Map<number, LegacyMatchRow>
) {
  return [...rows].sort((left, right) => {
    const leftKickoff =
      (left.match_id != null ? matchRowById.get(left.match_id)?.kickoff_at : null) ??
      left.calculated_at ??
      "";
    const rightKickoff =
      (right.match_id != null ? matchRowById.get(right.match_id)?.kickoff_at : null) ??
      right.calculated_at ??
      "";
    return leftKickoff.localeCompare(rightKickoff);
  });
}

function pickLatestFatigueRow(
  rows: FatigueRow[],
  matchRowById: Map<number, LegacyMatchRow>
) {
  return sortFatigueRowsByMatchDate(rows, matchRowById).slice(-1)[0];
}

function orderedInjuries(rows: InjuryRow[]) {
  return [...rows].sort((left, right) => {
    const leftDate = left.started_at ?? left.created_at ?? "";
    const rightDate = right.started_at ?? right.created_at ?? "";
    return rightDate.localeCompare(leftDate);
  });
}

function pickLatestInjury(rows: InjuryRow[]) {
  return orderedInjuries(rows)[0];
}

function isActiveInjury(status: string | null | undefined) {
  if (!status) {
    return false;
  }

  return [
    "out",
    "doubtful",
    "questionable",
    "injured",
    "suspended",
    "missing fixture",
  ].some((token) => status.toLowerCase().includes(token));
}

function buildLegacyFormationHealth(
  teamPlayerIds: number[],
  latestInjuryByPlayer: Map<number, InjuryRow>
) {
  if (!teamPlayerIds.length) {
    return {
      available: 0,
      doubtful: 0,
      absent: 0,
    };
  }

  return teamPlayerIds.reduce(
    (acc, playerId) => {
      const injury = latestInjuryByPlayer.get(playerId);
      const status = injury?.status?.toLowerCase() ?? "";

      if (!injury || !isActiveInjury(injury.status)) {
        acc.available += 1;
      } else if (status.includes("doubtful") || status.includes("questionable")) {
        acc.doubtful += 1;
      } else {
        acc.absent += 1;
      }

      return acc;
    },
    { available: 0, doubtful: 0, absent: 0 }
  );
}

function computeMappedRestDays(teamId: string, matches: MatchRecord[]) {
  const related = matches
    .filter((match) => match.home.teamId === teamId || match.away.teamId === teamId)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  if (related.length < 2) {
    return null;
  }

  const latest = related[related.length - 1];
  const previous = related[related.length - 2];
  return Math.max(0, dayDiff(latest.startsAt, previous.startsAt));
}

function buildWorkloadHistory(rows: AppearanceRow[]) {
  const recent = rows.slice(-5);
  if (!recent.length) {
    return {
      values: [],
      labels: [],
    };
  }

  return {
    values: recent.map((item) => Math.max(12, Math.min(100, item.minutes_played))),
    labels: recent.map((_, index) => `M${index + 1}`),
  };
}

function buildFatigueTrend(rows: FatigueRow[], fallbackScore: number) {
  const recent = rows.slice(-5);
  if (!recent.length) {
    return {
      values: [fallbackScore],
      labels: ["Now"],
    };
  }

  return {
    values: recent.map((item) => Math.round(item.score)),
    labels: recent.map((_, index) => `M${index + 1}`),
  };
}

function resolveNextFixtureLabel(
  matchRows: MatchRow[],
  teamDbId: number | null,
  mappedTeamByDbId: Map<number, TeamRecord>
) {
  if (teamDbId == null) {
    return null;
  }

  const upcoming = matchRows.find(
    (row) =>
      row.kickoff_at > new Date().toISOString() &&
      (row.home_team_id === teamDbId || row.away_team_id === teamDbId)
  );

  if (!upcoming) {
    return null;
  }

  const homeTeam = upcoming.home_team_id != null ? mappedTeamByDbId.get(upcoming.home_team_id) : null;
  const awayTeam = upcoming.away_team_id != null ? mappedTeamByDbId.get(upcoming.away_team_id) : null;

  if (!homeTeam || !awayTeam) {
    return null;
  }

  return `${homeTeam.shortName} vs ${awayTeam.shortName} · ${formatKickoffLabel(upcoming.kickoff_at)}`;
}

function buildPlayerComparison({
  totalMinutes,
  last14Minutes,
  fatigueScore,
}: {
  totalMinutes: number;
  last14Minutes: number;
  fatigueScore: number;
}) {
  return [
    comparisonItem("Season minutes", `${totalMinutes}`, "Workload accumulated across all logged appearances.", "neutral"),
    comparisonItem("Last 14 days", `${last14Minutes}`, "Recent minutes remain the strongest short-term stress signal.", fatigueScore > 65 ? "danger" : "warning"),
    comparisonItem("Fatigue score", `${fatigueScore}/100`, `Current status is ${fatigueLabel(fatigueScore, "en").toLowerCase()}.`, toneFromScore(fatigueScore)),
  ];
}

function ensureUniqueMatchSlugs(matches: MatchRecord[]) {
  const slugCounts = new Map<string, number>();

  matches.forEach((match) => {
    slugCounts.set(match.slug, (slugCounts.get(match.slug) ?? 0) + 1);
  });

  return matches.map((match) => {
    if ((slugCounts.get(match.slug) ?? 0) <= 1) {
      return match;
    }

    return {
      ...match,
      slug: `${match.slug}-${match.id.replace(/^match-/, "")}`,
    };
  });
}

function buildMatchSlug(homeSlug: string, awaySlug: string, competitionId: string) {
  const base = `${homeSlug}-vs-${awaySlug}`;
  return competitionId === "champions-league" ? `${base}-ucl` : base;
}

function comparisonItem(
  label: string,
  value: string,
  note: string,
  tone: Tone
): PlayerComparisonItem {
  return {
    label: localized(label),
    value,
    note: localized(note),
    tone,
  };
}

function toneFromScore(score: number): Tone {
  if (score > 65) {
    return "danger";
  }
  if (score > 45) {
    return "warning";
  }
  return "positive";
}

function resolveLegacyResult(row: LegacyMatchRow, teamDbId: number): Result {
  const isHome = row.home_team_id === teamDbId;
  const teamScore = isHome ? row.home_score ?? 0 : row.away_score ?? 0;
  const opponentScore = isHome ? row.away_score ?? 0 : row.home_score ?? 0;

  if (teamScore > opponentScore) {
    return "W";
  }
  if (teamScore < opponentScore) {
    return "L";
  }
  return "D";
}

function buildLegacySchedule({
  teamDbId,
  currentMatch,
  matchRows,
  competitionShort,
  teamByDbId,
}: {
  teamDbId: number;
  currentMatch: LegacyMatchRow;
  matchRows: LegacyMatchRow[];
  competitionShort: string;
  teamByDbId: Map<number, TeamRecord>;
}) {
  const related = matchRows
    .filter((row) => row.home_team_id === teamDbId || row.away_team_id === teamDbId)
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
  const currentIndex = related.findIndex((row) => row.id === currentMatch.id);

  if (currentIndex === -1) {
    return [];
  }

  return related
    .slice(Math.max(0, currentIndex - 2), currentIndex + 3)
    .map((row) => {
      const opponentDbId = row.home_team_id === teamDbId ? row.away_team_id : row.home_team_id;
      const opponent = opponentDbId == null ? null : teamByDbId.get(opponentDbId);
      return {
        day: dayDiff(row.kickoff_at, currentMatch.kickoff_at),
        opponent: opponent?.shortName ?? "OPP",
        home: row.home_team_id === teamDbId,
        competitionShort,
        current: row.id === currentMatch.id,
      };
    });
}

function computeLegacyRestDays(teamDbId: number, kickoffAt: string, rows: LegacyMatchRow[]) {
  const previous = rows
    .filter(
      (row) =>
        (row.home_team_id === teamDbId || row.away_team_id === teamDbId) &&
        row.kickoff_at < kickoffAt
    )
    .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at))[0];

  if (!previous) {
    return null;
  }

  return Math.max(0, dayDiff(kickoffAt, previous.kickoff_at));
}

function computeLegacyMatchDensity(teamDbId: number, kickoffAt: string, rows: LegacyMatchRow[]) {
  const current = new Date(kickoffAt).getTime();
  const windowStart = current - 14 * 24 * 60 * 60 * 1000;

  return rows.filter((row) => {
    const kickoff = new Date(row.kickoff_at).getTime();
    return (
      kickoff >= windowStart &&
      kickoff <= current &&
      (row.home_team_id === teamDbId || row.away_team_id === teamDbId)
    );
  }).length;
}

function deriveLegacyFatigue(matchDensity: number, restDays: number) {
  const base = 36 + matchDensity * 7 - restDays * 2;
  return Math.max(28, Math.min(78, base));
}

function derivePlayerFatigue(last14Minutes: number) {
  return Math.max(30, Math.min(82, 24 + Math.round(last14Minutes / 6)));
}

function resolvePlayerNextFixtureFromMatches(
  teamId: string,
  matches: MatchRecord[],
  teamByDbId?: Map<number, TeamRecord>
) {
  const related = matches
    .filter((match) => match.home.teamId === teamId || match.away.teamId === teamId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const now = new Date().toISOString();
  const upcoming = related.find((match) => match.startsAt >= now) ?? related[0];

  if (!upcoming) {
    return null;
  }

  const opponentId = upcoming.home.teamId === teamId ? upcoming.away.teamId : upcoming.home.teamId;
  const opponent =
    [...(teamByDbId?.values() ?? [])].find((team) => team.id === opponentId)?.shortName ?? opponentId;

  return `${upcoming.home.teamId === teamId ? "vs" : "at"} ${opponent} · ${upcoming.kickoffLabel}`;
}
