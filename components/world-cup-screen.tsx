"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EntityMark } from "@/components/entity-mark";
import { fixtureScoreLabel, fixtureStatusLabel, hasRecordedScore } from "@/lib/match-logic";
import { useAppPreferences } from "@/components/preferences-provider";
import { translateText } from "@/lib/i18n";
import { energyBand, formatDistance } from "@/lib/sonar";
import type {
  CompetitionRecord,
  MatchRecord,
  NewsItem,
  TeamRecord,
  WorldCupTeamProfile,
} from "@/lib/types";

type WorldCupTab = "hub" | "travel" | "recovery" | "groups" | "matches";
type WorldCupMatchFilter = "all" | "group" | "r16" | "qf" | "sf" | "final";

const WORLD_CUP_TABS: WorldCupTab[] = ["hub", "travel", "recovery", "groups", "matches"];
const WORLD_CUP_FILTERS: WorldCupMatchFilter[] = ["all", "group", "r16", "qf", "sf", "final"];

export function WorldCupScreen({
  competition,
  matches,
  newsItems,
  worldCupTeams,
  teams,
}: {
  competition: CompetitionRecord;
  matches: MatchRecord[];
  newsItems: NewsItem[];
  worldCupTeams: WorldCupTeamProfile[];
  teams: TeamRecord[];
}) {
  const [activeTab, setActiveTab] = useState<WorldCupTab>("hub");
  const [activeFilter, setActiveFilter] = useState<WorldCupMatchFilter>("all");
  const { locale } = useAppPreferences();
  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const rankedTeams = [...worldCupTeams].sort((left, right) => worldCupEnergy(left) - worldCupEnergy(right));
  const groupedTables = buildWorldCupTables(worldCupTeams, matches, teamMap);
  const matchRows = buildWorldCupMatchRows(matches, teamMap, locale).filter((row) =>
    activeFilter === "all" ? true : row.filter === activeFilter
  );
  const groupedMatches = groupWorldCupMatchRows(matchRows);
  const recoveryLeaders = rankedTeams.slice(0, 3);
  const averageEnergy = rankedTeams.length
    ? Math.round(rankedTeams.reduce((sum, item) => sum + worldCupEnergy(item), 0) / rankedTeams.length)
    : 0;
  const peakTravel = rankedTeams.length ? Math.max(...rankedTeams.map((item) => item.travelKm)) : 0;
  const riskLeader = rankedTeams[rankedTeams.length - 1];

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="worldcup-shell">
          <div className="worldcup-shell__title">{translateText(competition.name, locale)}</div>
          <div className="worldcup-shell__meta">USA / Canada / Mexico · June 11 - July 19</div>
          <div className="worldcup-shell__stats">
            <WorldCupHeroStat label={locale === "zh" ? "球队" : "Teams"} value="48" />
            <WorldCupHeroStat label={locale === "zh" ? "比赛" : "Matches"} value={`${matches.length || 104}`} />
            <WorldCupHeroStat label={locale === "zh" ? "场地" : "Venues"} value="16" />
          </div>
        </div>

        <div className="match-tabs">
          {WORLD_CUP_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`match-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {worldCupTabLabel(tab, locale)}
            </button>
          ))}
        </div>

        <div className="sonar-panel">
          {activeTab === "hub" ? (
            <div className="team-page-layout">
              <section className="player-card-section player-card-section--wide">
                <div className="summary-metric-grid summary-metric-grid--three">
                  <SummaryMetric
                    title={locale === "zh" ? "平均 TFI" : "Average TFI"}
                    value={`${averageEnergy}`}
                    note={locale === "zh" ? "全部 48 支球队" : "all 48 qualified teams"}
                  />
                  <SummaryMetric
                    title={locale === "zh" ? "最远旅途" : "Peak travel"}
                    value={formatDistance(peakTravel)}
                    note={locale === "zh" ? "小组赛阶段" : "group stage window"}
                  />
                  <SummaryMetric
                    title={locale === "zh" ? "风险最高球队" : "Highest risk"}
                    value={teamMap.get(riskLeader?.teamId ?? "")?.shortName ?? "--"}
                    note={riskLeader ? `TFI ${worldCupEnergy(riskLeader)}` : "—"}
                  />
                </div>
              </section>

              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "国家队赛季总负荷" : "National team season load"}
                </div>
                <div className="worldcup-rank-list">
                  {rankedTeams.map((profile, index) => {
                    const team = teamMap.get(profile.teamId);
                    if (!team) return null;

                    const energy = worldCupEnergy(profile);
                    const band = energyBand(energy);
                    return (
                      <Link href={`/team/${team.slug}`} className="worldcup-rank-row" key={profile.teamId}>
                        <span className="worldcup-rank-row__index">{index + 1}</span>
                        <EntityMark value={team.badge} label={team.name} className="team-badge" />
                        <div className="worldcup-rank-row__main">
                          <div className="worldcup-rank-row__title">{team.name}</div>
                          <div className="worldcup-rank-row__meta">
                            {profile.keyRiskCount}/23 {locale === "zh" ? "高风险球员" : "high-risk players"} · {locale === "zh" ? "赛季均" : "avg"} {profile.clubMinutesIndex}
                            {locale === "zh" ? "分钟" : " mins"}
                          </div>
                        </div>
                        <div className="worldcup-rank-row__score">
                          <strong className={`worldcup-rank-row__score-value worldcup-rank-row__score-value--${band}`}>
                            {energy}
                          </strong>
                          <div className="worldcup-rank-row__track">
                            <div
                              className={`worldcup-rank-row__fill worldcup-rank-row__fill--${band}`}
                              style={{ width: `${energy}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "小组赛恢复分析" : "Group-stage recovery analysis"}
                </div>
                <div className="worldcup-recovery-list">
                  {recoveryLeaders.map((profile) => {
                    const team = teamMap.get(profile.teamId);
                    if (!team) return null;

                    return (
                      <div className="worldcup-recovery-card" key={profile.teamId}>
                        <div className="worldcup-recovery-card__title">
                          <EntityMark value={team.badge} label={team.name} className="team-badge" />
                          <span>{team.name}</span>
                        </div>
                        <div className="worldcup-recovery-card__timeline">
                          {profile.recoveryMatrix.map((item, index) => (
                            <div className="worldcup-recovery-card__step" key={`${team.id}-${index}`}>
                              <div className="worldcup-recovery-card__step-main">
                                {team.shortName} vs {item.opponent}
                              </div>
                              <div className="worldcup-recovery-card__step-note">
                                {item.city} · {item.daysBetween}
                                {locale === "zh" ? "天" : " days"}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="ai-summary">
                          <div className="ai-summary-label">Sonar AI</div>
                          {translateText(profile.outlook, locale)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "travel" ? (
            <div className="team-page-layout">
              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "小组赛旅途距离" : "Group-stage travel distance"}
                </div>
                <div className="worldcup-travel-grid">
                  {rankedTeams.map((profile) => {
                    const team = teamMap.get(profile.teamId);
                    if (!team) return null;
                    const energy = worldCupEnergy(profile);
                    return (
                      <div className="worldcup-travel-card" key={profile.teamId}>
                        <div className="worldcup-travel-card__header">
                          <span className="inline-mark">
                            <EntityMark value={team.badge} label={team.name} className="team-badge" />
                            <span>{team.name}</span>
                          </span>
                          <strong className={`worldcup-travel-card__distance worldcup-travel-card__distance--${energyBand(energy)}`}>
                            {formatDistance(profile.travelKm)}
                          </strong>
                        </div>
                        <div className="worldcup-travel-card__meta">
                          {profile.travelLegs.map((leg) => `${leg.from} → ${leg.to}`).join(" / ")}
                        </div>
                        <div className="worldcup-rank-row__track">
                          <div
                            className={`worldcup-rank-row__fill worldcup-rank-row__fill--${energyBand(energy)}`}
                            style={{ width: `${Math.min(100, profile.travelKm / 80)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "recovery" ? (
            <div className="team-page-layout">
              {recoveryLeaders.map((profile) => {
                const team = teamMap.get(profile.teamId);
                if (!team) return null;

                return (
                  <section className="player-card-section player-card-section--wide" key={profile.teamId}>
                    <div className="player-section-title inline-mark">
                      <EntityMark value={team.badge} label={team.name} className="team-badge" />
                      <span>{team.name}</span>
                    </div>
                    <div className="worldcup-gap-line">
                      {profile.recoveryMatrix.map((item, index) => (
                        <div className="worldcup-gap-line__segment" key={`${item.opponent}-${index}`}>
                          <div className="worldcup-gap-line__title">
                            {team.shortName} vs {item.opponent}
                          </div>
                          <div className="worldcup-gap-line__city">{item.city}</div>
                          <div className={`worldcup-gap-line__days worldcup-gap-line__days--${item.daysBetween <= 3 ? "warning" : "fresh"}`}>
                            {item.daysBetween}
                            {locale === "zh" ? "天" : "d"}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="ai-summary">
                      <div className="ai-summary-label">Sonar AI</div>
                      {translateText(profile.outlook, locale)}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}

          {activeTab === "groups" ? (
            <div className="team-page-layout">
              {groupedTables.length ? (
                groupedTables.map((group) => (
                  <section className="player-card-section player-card-section--wide" key={group.group}>
                    <div className="player-section-title">
                      {locale === "zh" ? `${group.group}组` : `Group ${group.group}`}
                    </div>
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{locale === "zh" ? "球队" : "Team"}</th>
                            <th>P</th>
                            <th>W</th>
                            <th>D</th>
                            <th>L</th>
                            <th>GD</th>
                            <th>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row, index) => (
                            <tr key={row.team.id} className={index < 2 ? "data-table__qualified" : ""}>
                              <td>{index + 1}</td>
                              <td>
                                <span className="inline-mark">
                                  <EntityMark value={row.team.badge} label={row.team.name} className="team-badge" />
                                  <span>{row.team.name}</span>
                                </span>
                              </td>
                              <td>{row.played}</td>
                              <td>{row.wins}</td>
                              <td>{row.draws}</td>
                              <td>{row.losses}</td>
                              <td>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                              <td>{row.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))
              ) : (
                <div className="flat-empty">
                  {locale === "zh" ? "小组赛积分表将在比赛数据接入后显示。" : "Group standings will appear after match data sync."}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "matches" ? (
            <div>
              <div className="filter-chip-row">
                {WORLD_CUP_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`filter-chip${activeFilter === filter ? " active" : ""}`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {worldCupFilterLabel(filter, locale)}
                  </button>
                ))}
              </div>

              <div className="fixture-month-list">
                {groupedMatches.length ? (
                  groupedMatches.map((group) => (
                    <div className="fixture-month-group" key={group.label}>
                      <div className="fixture-month-group__title">{group.label}</div>
                      <div className="worldcup-match-stack">
                        {group.rows.map((row) => (
                          <Link href={`/match/${row.match.slug}`} className="worldcup-match-row" key={row.match.id}>
                            <span className="worldcup-match-row__stage">{row.stageTag}</span>
                            <div className="worldcup-match-row__team worldcup-match-row__team--home">
                              <span>{row.homeTeam?.name ?? "TBD"}</span>
                              {row.homeTeam ? (
                                <EntityMark value={row.homeTeam.badge} label={row.homeTeam.name} className="team-badge" />
                              ) : null}
                            </div>
                            <span className="worldcup-match-row__score">{row.scoreLabel}</span>
                            <div className="worldcup-match-row__team worldcup-match-row__team--away">
                              {row.awayTeam ? (
                                <EntityMark value={row.awayTeam.badge} label={row.awayTeam.name} className="team-badge" />
                              ) : null}
                              <span>{row.awayTeam?.name ?? "TBD"}</span>
                            </div>
                            <span className="worldcup-match-row__venue">{row.venueLabel}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flat-empty">
                    {newsItems[0]
                      ? translateText(newsItems[0].summary, locale)
                      : locale === "zh"
                        ? "暂无赛程数据"
                        : "No schedule data yet."}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WorldCupHeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="worldcup-shell__stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SummaryMetric({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="summary-metric-card">
      <div className="summary-metric-card__title">{title}</div>
      <div className="summary-metric-card__value">{value}</div>
      <div className="summary-metric-card__note">{note}</div>
    </div>
  );
}

function worldCupTabLabel(tab: WorldCupTab, locale: "zh" | "en") {
  if (locale === "zh") {
    switch (tab) {
      case "hub":
        return "主板";
      case "travel":
        return "旅途地图";
      case "recovery":
        return "恢复";
      case "groups":
        return "小组";
      case "matches":
        return "比赛";
    }
  }

  switch (tab) {
    case "hub":
      return "Hub";
    case "travel":
      return "Travel Map";
    case "recovery":
      return "Recovery";
    case "groups":
      return "Groups";
    case "matches":
      return "Matches";
  }
}

function worldCupFilterLabel(filter: WorldCupMatchFilter, locale: "zh" | "en") {
  if (locale === "zh") {
    switch (filter) {
      case "all":
        return "全部";
      case "group":
        return "小组赛";
      case "r16":
        return "16强";
      case "qf":
        return "8强";
      case "sf":
        return "半决赛";
      case "final":
        return "决赛";
    }
  }

  switch (filter) {
    case "all":
      return "All";
    case "group":
      return "Group";
    case "r16":
      return "R16";
    case "qf":
      return "QF";
    case "sf":
      return "SF";
    case "final":
      return "Final";
  }
}

function worldCupEnergy(profile: WorldCupTeamProfile) {
  return Math.max(18, Math.min(78, 88 - Math.round(profile.clubMinutesIndex * 0.7) - profile.keyRiskCount * 4));
}

function buildWorldCupTables(
  worldCupTeams: WorldCupTeamProfile[],
  matches: MatchRecord[],
  teamMap: Map<string, TeamRecord>
) {
  type GroupRow = {
    team: TeamRecord;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalDiff: number;
    points: number;
    gf: number;
  };

  const groups = new Map<string, GroupRow[]>();

  const teamGroup = new Map(worldCupTeams.map((profile) => [profile.teamId, profile.group]));

  for (const profile of worldCupTeams) {
    const team = teamMap.get(profile.teamId);
    if (!team) continue;
    const row = {
      team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalDiff: 0,
      points: 0,
      gf: 0,
    };
    groups.set(profile.group, [...(groups.get(profile.group) ?? []), row]);
  }

  const rowByTeamId = new Map<string, GroupRow>();
  for (const rows of groups.values()) {
    for (const row of rows) {
      rowByTeamId.set(row.team.id, row);
    }
  }

  for (const match of matches) {
    const homeGroup = teamGroup.get(match.home.teamId);
    const awayGroup = teamGroup.get(match.away.teamId);
    if (!homeGroup || !awayGroup || homeGroup !== awayGroup) continue;
    if (match.homeScore == null || match.awayScore == null) continue;

    const homeRow = rowByTeamId.get(match.home.teamId);
    const awayRow = rowByTeamId.get(match.away.teamId);
    if (!homeRow || !awayRow) continue;

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.gf += match.homeScore;
    awayRow.gf += match.awayScore;
    homeRow.goalDiff += match.homeScore - match.awayScore;
    awayRow.goalDiff += match.awayScore - match.homeScore;

    if (match.homeScore > match.awayScore) {
      homeRow.wins += 1;
      awayRow.losses += 1;
      homeRow.points += 3;
    } else if (match.homeScore < match.awayScore) {
      awayRow.wins += 1;
      homeRow.losses += 1;
      awayRow.points += 3;
    } else {
      homeRow.draws += 1;
      awayRow.draws += 1;
      homeRow.points += 1;
      awayRow.points += 1;
    }
  }

  return [...groups.entries()]
    .map(([group, rows]) => ({
      group,
      rows: [...rows].sort(
        (left, right) =>
          right.points - left.points ||
          right.goalDiff - left.goalDiff ||
          right.gf - left.gf ||
          left.team.name.localeCompare(right.team.name)
      ),
    }))
    .sort((left, right) => left.group.localeCompare(right.group));
}

function buildWorldCupMatchRows(
  matches: MatchRecord[],
  teamMap: Map<string, TeamRecord>,
  locale: "zh" | "en"
) {
  return [...matches]
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
    .map((match) => {
      const stage = match.stage.toLowerCase();
      return {
        match,
        filter: worldCupMatchFilter(stage),
        label: new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "Asia/Shanghai",
        }).format(new Date(match.startsAt)),
        stageTag: worldCupStageShort(stage),
        homeTeam: teamMap.get(match.home.teamId),
        awayTeam: teamMap.get(match.away.teamId),
        scoreLabel: hasRecordedScore(match) ? fixtureScoreLabel(match) : fixtureStatusLabel(match),
        venueLabel: match.venue || (locale === "zh" ? "场馆待定" : "Venue TBC"),
      };
    });
}

function groupWorldCupMatchRows(
  rows: ReturnType<typeof buildWorldCupMatchRows>
) {
  const groups = new Map<string, ReturnType<typeof buildWorldCupMatchRows>>();
  for (const row of rows) {
    groups.set(row.label, [...(groups.get(row.label) ?? []), row]);
  }
  return [...groups.entries()].map(([label, rows]) => ({ label, rows }));
}

function worldCupMatchFilter(stage: string): WorldCupMatchFilter {
  if (stage.includes("final")) return "final";
  if (stage.includes("semi")) return "sf";
  if (stage.includes("quarter")) return "qf";
  if (stage.includes("16")) return "r16";
  return "group";
}

function worldCupStageShort(stage: string) {
  if (stage.includes("final")) return "FIN";
  if (stage.includes("semi")) return "SF";
  if (stage.includes("quarter")) return "QF";
  if (stage.includes("16")) return "R16";
  const groupLetter = stage.match(/group\s+([a-z])/i)?.[1];
  return groupLetter ? groupLetter.toUpperCase() : "GRP";
}
