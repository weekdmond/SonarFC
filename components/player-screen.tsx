"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EntityMark } from "@/components/entity-mark";
import { useAppPreferences } from "@/components/preferences-provider";
import { computePlayerPFI, scheduleContextFromMatchSide } from "@/lib/fatigue-model";
import { fixtureScoreLabel, fixtureStatusLabel } from "@/lib/match-logic";
import { translateText } from "@/lib/i18n";
import { energyBand } from "@/lib/sonar";
import type {
  CompetitionRecord,
  Locale,
  MatchPlayerPerformance,
  MatchRecord,
  PlayerProfile,
  TeamRecord,
} from "@/lib/types";

type PlayerTab = "overview" | "stats" | "matches" | "energy";
type MatchFilter = "all" | "league" | "cup" | "european" | "international";

const PLAYER_TABS: PlayerTab[] = ["overview", "stats", "matches", "energy"];
const MATCH_FILTERS: MatchFilter[] = ["all", "league", "cup", "european", "international"];

export function PlayerScreen({
  player,
  teams,
  matches,
  competitions,
}: {
  player: PlayerProfile;
  teams: TeamRecord[];
  matches: MatchRecord[];
  competitions: CompetitionRecord[];
}) {
  const [activeTab, setActiveTab] = useState<PlayerTab>("overview");
  const [activeFilter, setActiveFilter] = useState<MatchFilter>("all");
  const { locale } = useAppPreferences();

  const team = teams.find((item) => item.id === player.teamId);
  const competitionMap = useMemo(
    () => new Map(competitions.map((competition) => [competition.id, competition])),
    [competitions]
  );
  const orderedMatches = useMemo(
    () => [...matches].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)),
    [matches]
  );
  const scheduleContext = useMemo(() => {
    if (!team) {
      return null;
    }

    const relevantMatch = [...matches]
      .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
      .find((match) => match.home.teamId === team.id || match.away.teamId === team.id);

    if (!relevantMatch) {
      return null;
    }

    return relevantMatch.home.teamId === team.id
      ? scheduleContextFromMatchSide(relevantMatch, relevantMatch.home, false)
      : scheduleContextFromMatchSide(relevantMatch, relevantMatch.away, true);
  }, [matches, team]);
  const recentMatches = orderedMatches.slice(0, 6);
  const playerModel = computePlayerPFI(player, { scheduleContext });
  const energy = playerModel.energy;
  const band = energyBand(energy);
  const role = playerModel.role;
  const ratingSummary = collectPlayerRatings(orderedMatches, player.slug, player.averageRating ?? null);
  const statSummary = collectPlayerPerformanceTotals(orderedMatches, player);
  const filteredMatches = orderedMatches.filter((match) =>
    activeFilter === "all"
      ? true
      : competitionCategory(competitionMap.get(match.competitionId)) === activeFilter
  );
  const radarMetrics = buildRadarMetrics(player, energy);
  const statBars = buildPlayerStatBars(player, energy);
  const detailedGroups = buildDetailedStatGroups(statSummary, player, energy, locale);
  const seasonRows = buildSeasonRows(statSummary, locale);
  const recentWorkloads = [...player.workloadHistory].slice(-filteredMatches.length).reverse();

  if (!team) {
    return null;
  }

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="match-detail-header player-page-header">
          <div className="player-page-header__avatar">
            {player.photo ? (
              <img
                className="player-page-header__avatar-image"
                src={player.photo}
                alt={player.name}
              />
            ) : (
              initials(player.name)
            )}
          </div>

          <div className="player-page-header__content">
            <div className="player-page-header__title-row">
              <div className="player-page-header__title">{player.name}</div>
              <span className={`role-tag role-tag--${role}`}>{roleLabel(role, locale)}</span>
              <span className={`rating-badge${ratingSummary.average ? ` rating-badge--${ratingTone(ratingSummary.average)}` : ""}`}>
                {ratingSummary.average ? ratingSummary.average.toFixed(1) : "--"}
              </span>
            </div>
            <div className="player-page-header__meta">
              <Link href={`/team/${team.slug}`} className="inline-mark player-page-header__team">
                <EntityMark value={team.badge} label={team.name} className="team-badge" />
                <span>{team.name}</span>
              </Link>
              <span>
                {player.position} · #{inferSquadNumber(player)} · {player.nationality} · {player.age}
                {locale === "zh" ? "岁" : "y"}
              </span>
            </div>
          </div>

          <div className="player-page-header__summary">
            <div className="player-page-header__summary-value">
              {ratingSummary.average ? ratingSummary.average.toFixed(1) : "--"}
            </div>
            <div className="player-page-header__summary-label">
              {locale === "zh" ? "平均评分" : "Average rating"}
            </div>
            <div className={`player-page-header__energy player-page-header__energy--${band}`}>
              <span>PFI</span>
              <strong>{playerModel.pfi}</strong>
            </div>
          </div>
        </div>

        <div className="match-tabs">
          {PLAYER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`match-tab${activeTab === tab ? " active" : ""}${tab === "energy" ? " sonar-tab" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {playerTabLabel(tab, locale)}
            </button>
          ))}
        </div>

        <div className="sonar-panel">
          {activeTab === "overview" ? (
            <div className="player-page-layout">
              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "赛季画像" : "Season profile"}
                </div>
                <div className="player-radar">
                  <svg viewBox="0 0 220 220" className="player-radar__svg" aria-hidden="true">
                    {radarPolygons()}
                    {radarAxes()}
                    <polygon
                      points={radarPoints(radarMetrics)}
                      fill="rgba(26, 147, 46, 0.16)"
                      stroke="var(--primary)"
                      strokeWidth="1.8"
                    />
                    {radarMetrics.map((metric, index) => (
                      <circle
                        key={metric.label}
                        cx={radarCoordinate(index, metric.value).x}
                        cy={radarCoordinate(index, metric.value).y}
                        r="3.5"
                        fill="var(--primary)"
                      />
                    ))}
                    {radarMetrics.map((metric, index) => (
                      <text
                        key={`${metric.label}-text`}
                        x={radarLabelCoordinate(index).x}
                        y={radarLabelCoordinate(index).y}
                        textAnchor={radarLabelCoordinate(index).anchor}
                        fontSize="10"
                        fill="var(--text-muted)"
                      >
                        {metric.label}
                      </text>
                    ))}
                  </svg>
                </div>
              </section>

              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "赛季统计" : "Season stats"}
                </div>
                <div className="metric-bars">
                  {statBars.map((bar) => (
                    <div className="metric-bars__row" key={bar.label}>
                      <span className="metric-bars__label">{bar.label}</span>
                      <div className="metric-bars__track">
                        <div
                          className={`metric-bars__fill metric-bars__fill--${bar.tone}`}
                          style={{ width: `${bar.width}%` }}
                        />
                      </div>
                      <span className="metric-bars__value">{bar.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "评分趋势" : "Rating trend"}
                </div>
                <TrendCard
                  values={player.fatigueTrend.map((value) => Math.max(50, 100 - value / 2))}
                  labels={player.fatigueLabels}
                  accent="var(--primary)"
                  positiveHint={locale === "zh" ? "高于 7.0" : "Above 7.0"}
                  negativeHint={locale === "zh" ? "低于 6.0" : "Below 6.0"}
                />
              </section>

              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "近期比赛" : "Recent matches"}
                </div>
                <div className="player-match-list">
                  {recentMatches.length ? (
                    recentMatches.map((match, index) => {
                      const performance = findPlayerPerformance(match, player.slug);
                      const opponent = opponentTeam(match, team.id, teams);
                      const competition = competitionMap.get(match.competitionId);
                      const minutes = performance?.minutesPlayed ?? recentWorkloads[index] ?? null;

                      return (
                        <Link
                          href={`/match/${match.slug}`}
                          className={`player-match-row player-match-row--${resultTone(match, team.id)}`}
                          key={match.id}
                        >
                          <span className="player-match-row__date">{compactDate(match.startsAt, locale)}</span>
                          <span className="player-match-row__opponent inline-mark">
                            {opponent ? (
                              <EntityMark
                                value={opponent.badge}
                                label={opponent.name}
                                className="team-badge"
                              />
                            ) : null}
                            <span>{opponent?.name ?? (locale === "zh" ? "待定" : "TBD")}</span>
                          </span>
                          <span className={`comp-tag comp-tag--${competitionCategory(competition)}`}>
                            {competitionShort(competition)}
                          </span>
                          <span className="player-match-row__score">{fixtureScoreLabel(match)}</span>
                          <span className="player-match-row__meta">
                            {minutes != null ? `${minutes}'` : fixtureStatusLabel(match)}
                          </span>
                          <span className={`rating-badge${performance?.rating ? ` rating-badge--${ratingTone(performance.rating)}` : ""}`}>
                            {performance?.rating ? performance.rating.toFixed(1) : "--"}
                          </span>
                          <span className="player-match-row__icons">
                            {performance?.goals ? "⚽".repeat(Math.min(performance.goals, 2)) : ""}
                            {performance?.assists ? "🅰️".repeat(Math.min(performance.assists, 2)) : ""}
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="flat-empty">
                      {locale === "zh" ? "暂无近期比赛记录" : "No recent match records"}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "stats" ? (
            <div className="player-page-layout">
              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "赛季数据总览" : "Season summary"}
                </div>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{locale === "zh" ? "范围" : "Scope"}</th>
                        <th>{locale === "zh" ? "出场" : "Apps"}</th>
                        <th>{locale === "zh" ? "首发" : "Starts"}</th>
                        <th>{locale === "zh" ? "进球" : "Goals"}</th>
                        <th>{locale === "zh" ? "助攻" : "Assists"}</th>
                        <th>{locale === "zh" ? "黄牌" : "YC"}</th>
                        <th>{locale === "zh" ? "评分" : "Rating"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonRows.map((row) => (
                        <tr key={row.label}>
                          <td>{row.label}</td>
                          <td>{row.appearances}</td>
                          <td>{row.starts}</td>
                          <td>{row.goals}</td>
                          <td>{row.assists}</td>
                          <td>{row.yellowCards}</td>
                          <td>
                            {row.rating ? (
                              <span className={`rating-badge rating-badge--${ratingTone(row.rating)}`}>
                                {row.rating.toFixed(1)}
                              </span>
                            ) : (
                              "--"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {detailedGroups.length ? (
                detailedGroups.map((group) => (
                  <section className="player-card-section" key={group.title}>
                    <div className="player-section-title">{group.title}</div>
                    <div className="metric-bars">
                      {group.items.map((item) => (
                        <div className="metric-bars__row" key={`${group.title}-${item.label}`}>
                          <span className="metric-bars__label">{item.label}</span>
                          <div className="metric-bars__track">
                            <div
                              className={`metric-bars__fill metric-bars__fill--${item.tone}`}
                              style={{ width: `${item.width}%` }}
                            />
                          </div>
                          <span className="metric-bars__value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="flat-empty">
                  {locale === "zh"
                    ? "球员逐场技术统计同步后会显示在这里。"
                    : "Detailed per-match player stats will appear here after sync."}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "matches" ? (
            <div>
              <div className="filter-chip-row">
                {MATCH_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`filter-chip${activeFilter === filter ? " active" : ""}`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {matchFilterLabel(filter, locale)}
                  </button>
                ))}
              </div>

              <div className="player-match-list">
                {filteredMatches.length ? (
                  filteredMatches.map((match, index) => {
                    const competition = competitionMap.get(match.competitionId);
                    const opponent = opponentTeam(match, team.id, teams);
                    const performance = findPlayerPerformance(match, player.slug);
                    const minutes = performance?.minutesPlayed ?? recentWorkloads[index] ?? null;

                    return (
                      <Link
                        href={`/match/${match.slug}`}
                        className={`player-match-row player-match-row--${resultTone(match, team.id)}`}
                        key={match.id}
                      >
                        <span className="player-match-row__date">{compactDate(match.startsAt, locale)}</span>
                        <span className="player-match-row__opponent inline-mark">
                          {opponent ? (
                            <EntityMark
                              value={opponent.badge}
                              label={opponent.name}
                              className="team-badge"
                            />
                          ) : null}
                          <span>{opponent?.name ?? (locale === "zh" ? "待定" : "TBD")}</span>
                        </span>
                        <span className={`comp-tag comp-tag--${competitionCategory(competition)}`}>
                          {competitionShort(competition)}
                        </span>
                        <span className="player-match-row__meta">
                          {minutes != null ? `${minutes}'` : fixtureStatusLabel(match)}
                        </span>
                        <span className={`rating-badge${performance?.rating ? ` rating-badge--${ratingTone(performance.rating)}` : ""}`}>
                          {performance?.rating ? performance.rating.toFixed(1) : "--"}
                        </span>
                        <span className="player-match-row__icons">
                          {performance?.goals ? "⚽".repeat(Math.min(performance.goals, 2)) : ""}
                          {performance?.assists ? "🅰️".repeat(Math.min(performance.assists, 2)) : ""}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <div className="flat-empty">
                    {locale === "zh" ? "该筛选下暂无比赛记录" : "No matches in this filter"}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "energy" ? (
            <div className="player-page-layout">
              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "赛季分钟分布" : "Season minutes by matchweek"}
                </div>
                <div className="player-bars">
                  {player.workloadHistory.map((value, index) => (
                    <div className="player-bars__item" key={`${player.slug}-work-${index}`}>
                      <div
                        className={`player-bars__bar${
                          value === 0
                            ? " player-bars__bar--empty"
                            : value >= 85
                              ? " player-bars__bar--danger"
                              : ""
                        }`}
                        style={{ height: `${Math.max(value, value === 0 ? 4 : value)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="player-bars__axis">
                  <span>MW 1</span>
                  <span>MW 10</span>
                  <span>MW 20</span>
                  <span>MW 34</span>
                </div>
              </section>

              <section className="player-card-section player-card-section--wide">
                <div className="summary-metric-grid summary-metric-grid--three">
                  <SummaryMetric
                    title={locale === "zh" ? "赛季总计" : "Season total"}
                    value={`${player.seasonMinutes}`}
                    note={locale === "zh" ? "分钟" : "minutes"}
                  />
                  <SummaryMetric
                    title={locale === "zh" ? "近 14 天" : "Last 14 days"}
                    value={`${player.last14Minutes}`}
                    note={locale === "zh" ? "分钟" : "minutes"}
                    tone="exhausted"
                  />
                  <SummaryMetric
                    title={locale === "zh" ? "出场" : "Appearances"}
                    value={`${player.appearancesCount ?? 0}`}
                    note={locale === "zh" ? "场" : "matches"}
                  />
                  <SummaryMetric
                    title={locale === "zh" ? "近 5 场首发" : "Starts last 5"}
                    value={`${player.startsLast5}`}
                    note={locale === "zh" ? "场" : "matches"}
                  />
                  <SummaryMetric
                    title={locale === "zh" ? "轮换风险" : "Rotation risk"}
                    value={energyLabel(energy, locale)}
                    note={`PFI ${playerModel.pfi}`}
                    tone={band}
                  />
                  <SummaryMetric
                    title={locale === "zh" ? "下一场" : "Next fixture"}
                    value={player.nextFixture || "TBD"}
                    note={locale === "zh" ? "赛程" : "schedule"}
                  />
                </div>
              </section>

              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "30 天疲劳趋势" : "30-day fatigue trend"}
                </div>
                <TrendCard
                  values={player.fatigueTrend}
                  labels={player.fatigueLabels}
                  accent="var(--danger)"
                  positiveHint={locale === "zh" ? "低风险" : "Low risk"}
                  negativeHint={locale === "zh" ? "高风险" : "High risk"}
                />
              </section>

              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "伤病历史" : "Injury history"}
                </div>
                <div className="list-stack">
                  {player.injuries.length ? (
                    player.injuries.map((injury) => (
                      <div className="list-row" key={`${injury.date}-${injury.duration}`}>
                        <div className="list-row__dot list-row__dot--danger" />
                        <div className="list-row__content">
                          <div className="list-row__title">{translateText(injury.label, locale)}</div>
                          <div className="list-row__meta">
                            {injury.date} · {injury.duration}
                          </div>
                        </div>
                        <span className="list-row__status list-row__status--fresh">
                          {locale === "zh" ? "已恢复" : "Recovered"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flat-empty">
                      {locale === "zh" ? "暂无伤病记录" : "No injury history"}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({
  title,
  value,
  note,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  tone?: "fresh" | "tired" | "exhausted";
}) {
  return (
    <div className="summary-metric-card">
      <div className="summary-metric-card__title">{title}</div>
      <div className={`summary-metric-card__value${tone ? ` summary-metric-card__value--${tone}` : ""}`}>
        {value}
      </div>
      <div className="summary-metric-card__note">{note}</div>
    </div>
  );
}

function TrendCard({
  values,
  labels,
  accent,
  positiveHint,
  negativeHint,
}: {
  values: number[];
  labels: string[];
  accent: string;
  positiveHint: string;
  negativeHint: string;
}) {
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 300;
      const y = 60 - (value / 100) * 56;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <div className="trend-card">
        <div className="trend-card__danger-zone" />
        <svg viewBox="0 0 300 60" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={accent}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="trend-card__axis">
        <span>{labels[0] ?? "30d"}</span>
        <span>{positiveHint}</span>
        <span>{negativeHint}</span>
        <span>{labels[labels.length - 1] ?? "Today"}</span>
      </div>
    </div>
  );
}

function playerTabLabel(tab: PlayerTab, locale: Locale) {
  if (locale === "zh") {
    switch (tab) {
      case "overview":
        return "概览";
      case "stats":
        return "数据";
      case "matches":
        return "比赛";
      case "energy":
        return "体能";
    }
  }

  switch (tab) {
    case "overview":
      return "Overview";
    case "stats":
      return "Stats";
    case "matches":
      return "Matches";
    case "energy":
      return "Fitness";
  }
}

function matchFilterLabel(filter: MatchFilter, locale: Locale) {
  if (locale === "zh") {
    switch (filter) {
      case "all":
        return "全部";
      case "league":
        return "联赛";
      case "cup":
        return "杯赛";
      case "european":
        return "欧战";
      case "international":
        return "国际";
    }
  }

  switch (filter) {
    case "all":
      return "All";
    case "league":
      return "League";
    case "cup":
      return "Cup";
    case "european":
      return "Europe";
    case "international":
      return "International";
  }
}

function roleLabel(role: "starter" | "rotation" | "bench", locale: Locale) {
  if (locale === "zh") {
    switch (role) {
      case "starter":
        return "主力";
      case "rotation":
        return "轮换";
      case "bench":
        return "板凳";
    }
  }

  switch (role) {
    case "starter":
      return "Starter";
    case "rotation":
      return "Rotation";
    case "bench":
      return "Bench";
  }
}

function inferSquadNumber(player: PlayerProfile) {
  return player.name
    .split("")
    .reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 30 || 11;
}

function collectPlayerRatings(
  matches: MatchRecord[],
  playerSlug: string,
  fallbackAverageRating: number | null
) {
  const ratings = matches
    .map((match) => findPlayerPerformance(match, playerSlug)?.rating ?? null)
    .filter((value): value is number => typeof value === "number");

  return {
    average: ratings.length
      ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
      : fallbackAverageRating,
    count: ratings.length,
  };
}

function collectPlayerPerformanceTotals(matches: MatchRecord[], player: PlayerProfile) {
  const performances = matches
    .map((match) => findPlayerPerformance(match, player.slug))
    .filter((item): item is MatchPlayerPerformance => Boolean(item));

  const summary = performances.reduce(
    (aggregate, performance) => {
      aggregate.appearances += 1;
      aggregate.starts += performance.isStarter ? 1 : 0;
      aggregate.goals += performance.goals;
      aggregate.assists += performance.assists;
      aggregate.yellowCards += performance.yellowCards;
      aggregate.shotsTotal += performance.shotsTotal ?? 0;
      aggregate.shotsOn += performance.shotsOn ?? 0;
      aggregate.passesTotal += performance.passesTotal ?? 0;
      aggregate.tackles += performance.tackles ?? 0;
      aggregate.dribbles += performance.dribblesSuccess ?? 0;
      if (performance.rating) {
        aggregate.ratingTotal += performance.rating;
        aggregate.ratingCount += 1;
      }
      return aggregate;
    },
    {
      appearances: 0,
      starts: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      shotsTotal: 0,
      shotsOn: 0,
      passesTotal: 0,
      tackles: 0,
      dribbles: 0,
      ratingTotal: 0,
      ratingCount: 0,
    }
  );

  return {
    ...summary,
    appearances: summary.appearances || player.appearancesCount || 0,
    starts: summary.starts || player.startsLast5 || 0,
    goals: summary.goals || player.seasonGoals || 0,
    assists: summary.assists || player.seasonAssists || 0,
    yellowCards: summary.yellowCards || player.seasonYellowCards || 0,
    ratingTotal:
      summary.ratingCount > 0
        ? summary.ratingTotal
        : (player.averageRating ?? 0) * (player.appearancesCount ?? 0),
    ratingCount: summary.ratingCount || (player.averageRating ? player.appearancesCount ?? 0 : 0),
  };
}

function buildSeasonRows(
  statSummary: ReturnType<typeof collectPlayerPerformanceTotals>,
  locale: Locale
) {
  const averageRating =
    statSummary.ratingCount > 0 ? statSummary.ratingTotal / statSummary.ratingCount : null;

  return [
    {
      label: locale === "zh" ? "总计" : "Season",
      appearances: statSummary.appearances || "--",
      starts: statSummary.starts || "--",
      goals: statSummary.goals || 0,
      assists: statSummary.assists || 0,
      yellowCards: statSummary.yellowCards || 0,
      rating: averageRating,
    },
  ];
}

function buildDetailedStatGroups(
  statSummary: ReturnType<typeof collectPlayerPerformanceTotals>,
  player: PlayerProfile,
  energy: number,
  locale: Locale
) {
  if (!statSummary.appearances) {
    return [];
  }

  return [
    {
      title: locale === "zh" ? "进攻" : "Attack",
      items: [
        barItem(locale === "zh" ? "进球" : "Goals", statSummary.goals, 100, "fresh"),
        barItem(locale === "zh" ? "助攻" : "Assists", statSummary.assists, 100, "fresh"),
        barItem(
          locale === "zh" ? "射门/场" : "Shots/match",
          safePerMatch(statSummary.shotsTotal, statSummary.appearances),
          100,
          "fresh"
        ),
        barItem(
          locale === "zh" ? "射正/场" : "On target/match",
          safePerMatch(statSummary.shotsOn, statSummary.appearances),
          100,
          "fresh"
        ),
      ],
    },
    {
      title: locale === "zh" ? "传球" : "Passing",
      items: [
        barItem(
          locale === "zh" ? "传球/场" : "Passes/match",
          safePerMatch(statSummary.passesTotal, statSummary.appearances),
          100,
          "fresh"
        ),
        barItem(
          locale === "zh" ? "最近负荷" : "Recent load",
          player.last14Minutes,
          100,
          energyBand(energy)
        ),
      ],
    },
    {
      title: locale === "zh" ? "防守" : "Defending",
      items: [
        barItem(
          locale === "zh" ? "抢断/场" : "Tackles/match",
          safePerMatch(statSummary.tackles, statSummary.appearances),
          100,
          "warning"
        ),
        barItem(
          locale === "zh" ? "过人成功/场" : "Dribbles/match",
          safePerMatch(statSummary.dribbles, statSummary.appearances),
          100,
          "fresh"
        ),
      ],
    },
    {
      title: locale === "zh" ? "纪律" : "Discipline",
      items: [
        barItem(locale === "zh" ? "黄牌" : "Yellow cards", statSummary.yellowCards, 100, "warning"),
        barItem(locale === "zh" ? "体能分" : "Energy", energy, 100, energyBand(energy)),
      ],
    },
  ];
}

function buildPlayerStatBars(player: PlayerProfile, energy: number) {
  return [
    barItem("出场", player.appearancesCount ?? 0, 40, "fresh"),
    barItem("近5场首发", player.startsLast5, 5, "fresh"),
    barItem("赛季分钟", player.seasonMinutes, 3200, "fresh"),
    barItem("近14天", player.last14Minutes, 400, energyBand(energy)),
    barItem("Energy", energy, 100, energyBand(energy)),
    barItem("伤病次数", player.injuries.length, 6, player.injuries.length > 1 ? "warning" : "fresh"),
  ];
}

function barItem(
  label: string,
  value: number,
  max: number,
  tone: "fresh" | "tired" | "exhausted" | "warning"
) {
  return {
    label,
    value: typeof value === "number" && Number.isFinite(value) ? `${roundNumber(value)}` : "--",
    width: Math.max(8, Math.min(100, (value / Math.max(max, 1)) * 100)),
    tone,
  };
}

function buildRadarMetrics(player: PlayerProfile, energy: number) {
  return [
    { label: "出场", value: Math.min(100, ((player.appearancesCount ?? 0) / 38) * 100) },
    { label: "首发", value: Math.min(100, (player.startsLast5 / 5) * 100) },
    { label: "节奏", value: Math.min(100, (player.last14Minutes / 360) * 100) },
    { label: "恢复", value: energy },
    { label: "耐久", value: Math.min(100, (player.seasonMinutes / 3200) * 100) },
    { label: "可用", value: Math.max(24, 100 - player.injuries.length * 18) },
  ];
}

function radarPolygons() {
  return (
    <>
      <polygon points="110,20 185,57.5 185,132.5 110,170 35,132.5 35,57.5" fill="none" stroke="var(--border)" strokeWidth="0.5" />
      <polygon points="110,45 167,72 167,118 110,145 53,118 53,72" fill="none" stroke="var(--border)" strokeWidth="0.5" />
      <polygon points="110,70 149,87 149,103 110,120 71,103 71,87" fill="none" stroke="var(--border)" strokeWidth="0.5" />
    </>
  );
}

function radarAxes() {
  return (
    <>
      <line x1="110" y1="20" x2="110" y2="170" stroke="var(--border)" strokeWidth="0.3" />
      <line x1="35" y1="57.5" x2="185" y2="132.5" stroke="var(--border)" strokeWidth="0.3" />
      <line x1="35" y1="132.5" x2="185" y2="57.5" stroke="var(--border)" strokeWidth="0.3" />
    </>
  );
}

function radarPoints(metrics: { value: number }[]) {
  return metrics
    .map((metric, index) => {
      const point = radarCoordinate(index, metric.value);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function radarCoordinate(index: number, value: number) {
  const centerX = 110;
  const centerY = 95;
  const radius = 75 * (value / 100);
  const angle = (-90 + index * 60) * (Math.PI / 180);

  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

function radarLabelCoordinate(index: number) {
  const coords = [
    { x: 110, y: 12, anchor: "middle" as const },
    { x: 196, y: 60, anchor: "start" as const },
    { x: 196, y: 138, anchor: "start" as const },
    { x: 110, y: 188, anchor: "middle" as const },
    { x: 24, y: 138, anchor: "end" as const },
    { x: 24, y: 60, anchor: "end" as const },
  ];

  return coords[index] ?? coords[0];
}

function competitionShort(competition?: CompetitionRecord) {
  if (!competition) {
    return "ALL";
  }

  const words = competition.slug.split("-");
  return words
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3) || "ALL";
}

function competitionCategory(competition?: CompetitionRecord): MatchFilter {
  if (!competition) {
    return "all";
  }

  const slug = competition.slug;

  if (slug.includes("world-cup")) {
    return "international";
  }

  if (slug.includes("champions") || slug.includes("europa")) {
    return "european";
  }

  if (competition.region.toLowerCase() === "international") {
    return "international";
  }

  if (slug.includes("cup")) {
    return "cup";
  }

  return "league";
}

function compactDate(startsAt: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date(startsAt));
}

function opponentTeam(match: MatchRecord, teamId: string, teams: TeamRecord[]) {
  const opponentId = match.home.teamId === teamId ? match.away.teamId : match.home.teamId;
  return teams.find((item) => item.id === opponentId);
}

function findPlayerPerformance(match: MatchRecord, playerSlug: string) {
  const performances = [...(match.postgame?.homePlayers ?? []), ...(match.postgame?.awayPlayers ?? [])];
  return performances.find((item) => item.playerSlug === playerSlug);
}

function resultTone(match: MatchRecord, teamId: string) {
  if (match.homeScore == null || match.awayScore == null) {
    return "neutral";
  }

  const goalDiff =
    match.home.teamId === teamId
      ? match.homeScore - match.awayScore
      : match.awayScore - match.homeScore;

  if (goalDiff > 0) {
    return "win";
  }

  if (goalDiff < 0) {
    return "loss";
  }

  return "draw";
}

function roundNumber(value: number) {
  return Math.round(value).toString();
}

function safePerMatch(value: number, appearances: number) {
  if (!appearances) {
    return 0;
  }

  return Math.round(value / appearances);
}

function energyLabel(energy: number, locale: Locale) {
  if (locale === "zh") {
    if (energy < 40) return "高疲劳";
    if (energy < 60) return "中负荷";
    return "体能充沛";
  }

  if (energy < 40) return "High fatigue";
  if (energy < 60) return "Medium load";
  return "Fresh";
}

function ratingTone(value: number) {
  if (value >= 9) return "exceptional";
  if (value >= 8) return "great";
  if (value >= 7) return "good";
  if (value >= 6) return "average";
  return "poor";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
