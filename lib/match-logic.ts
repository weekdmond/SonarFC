import type { MatchRecord, Result, TeamRecord } from "@/lib/types";

export interface StandingsSnapshot {
  team: TeamRecord;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  points: number;
  goalDiff: number;
  form: Result[];
}

export function hasRecordedScore(match: MatchRecord) {
  return typeof match.homeScore === "number" && typeof match.awayScore === "number";
}

export function buildSeasonStandings(
  matches: MatchRecord[],
  teamMap: Map<string, TeamRecord>
) {
  const rows = new Map<
    string,
    {
      team: TeamRecord;
      wins: number;
      draws: number;
      losses: number;
      played: number;
      points: number;
      goalDiff: number;
      form: Array<{ startsAt: string; result: Result }>;
    }
  >();

  const playedMatches = matches
    .filter(hasRecordedScore)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  for (const match of playedMatches) {
    const homeTeam = teamMap.get(match.home.teamId);
    const awayTeam = teamMap.get(match.away.teamId);

    if (!homeTeam || !awayTeam || match.homeScore == null || match.awayScore == null) {
      continue;
    }

    const homeRow = rows.get(homeTeam.id) ?? createStandingsRow(homeTeam);
    const awayRow = rows.get(awayTeam.id) ?? createStandingsRow(awayTeam);
    const homeResult = scoreResult(match.homeScore, match.awayScore);
    const awayResult = scoreResult(match.awayScore, match.homeScore);

    applyResult(homeRow, homeResult, match.homeScore - match.awayScore, match.startsAt);
    applyResult(awayRow, awayResult, match.awayScore - match.homeScore, match.startsAt);

    rows.set(homeTeam.id, homeRow);
    rows.set(awayTeam.id, awayRow);
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      form: row.form
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
        .slice(-5)
        .map((item) => item.result),
    }))
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.goalDiff - left.goalDiff ||
        right.wins - left.wins ||
        left.team.name.localeCompare(right.team.name)
    ) satisfies StandingsSnapshot[];
}

export function fixtureStatusLabel(match: MatchRecord) {
  const status = (match.status ?? "").toLowerCase();

  if (status === "finished" || hasRecordedScore(match)) {
    return "FT";
  }

  if (["live", "in_play", "1h", "2h", "halftime"].includes(status)) {
    return "LIVE";
  }

  return extractTime(match.kickoffLabel);
}

export function fixtureScoreLabel(match: MatchRecord) {
  if (hasRecordedScore(match) && match.homeScore != null && match.awayScore != null) {
    return `${match.homeScore} - ${match.awayScore}`;
  }

  return "vs";
}

function createStandingsRow(team: TeamRecord) {
  return {
    team,
    wins: 0,
    draws: 0,
    losses: 0,
    played: 0,
    points: 0,
    goalDiff: 0,
    form: [] as Array<{ startsAt: string; result: Result }>,
  };
}

function applyResult(
  row: ReturnType<typeof createStandingsRow>,
  result: Result,
  goalDiff: number,
  startsAt: string
) {
  row.played += 1;
  row.goalDiff += goalDiff;
  row.form.push({ startsAt, result });

  if (result === "W") {
    row.wins += 1;
    row.points += 3;
    return;
  }

  if (result === "D") {
    row.draws += 1;
    row.points += 1;
    return;
  }

  row.losses += 1;
}

function scoreResult(teamScore: number, opponentScore: number): Result {
  if (teamScore > opponentScore) {
    return "W";
  }
  if (teamScore < opponentScore) {
    return "L";
  }
  return "D";
}

function extractTime(kickoffLabel: string) {
  return kickoffLabel.match(/\b\d{1,2}:\d{2}(?:\s?[AP]M)?\b/i)?.[0] ?? kickoffLabel;
}
