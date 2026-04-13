"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EntityMark } from "@/components/entity-mark";
import {
  computePlayerPFI,
  computeTeamTFI,
  scheduleContextFromMatchSide,
} from "@/lib/fatigue-model";
import {
  buildSeasonStandings,
  fixtureScoreLabel,
  fixtureStatusLabel,
  hasRecordedScore,
} from "@/lib/match-logic";
import { useAppPreferences } from "@/components/preferences-provider";
import { translateText } from "@/lib/i18n";
import { energyBand, formatDistance } from "@/lib/sonar";
import type { CompetitionRecord, MatchRecord, PlayerProfile, Result, TeamRecord } from "@/lib/types";

type TeamTab = "overview" | "squad" | "fixtures" | "energy" | "stats" | "transfers";
type FixtureFilter = "all" | "league" | "cup" | "european";
type StatFilter = "attack" | "defense" | "passing" | "discipline";

const TEAM_TABS: TeamTab[] = ["overview", "squad", "fixtures", "energy", "stats", "transfers"];
const FIXTURE_FILTERS: FixtureFilter[] = ["all", "league", "cup", "european"];
const STAT_FILTERS: StatFilter[] = ["attack", "defense", "passing", "discipline"];

export function TeamScreen({
  team,
  matches,
  competitionMatches,
  players,
  competitions,
  teams,
}: {
  team: TeamRecord;
  matches: MatchRecord[];
  competitionMatches: MatchRecord[];
  players: PlayerProfile[];
  competitions: CompetitionRecord[];
  teams: TeamRecord[];
}) {
  const [activeTab, setActiveTab] = useState<TeamTab>("overview");
  const [fixtureFilter, setFixtureFilter] = useState<FixtureFilter>("all");
  const [statFilter, setStatFilter] = useState<StatFilter>("attack");
  const { locale } = useAppPreferences();

  const teamMap = useMemo(() => new Map(teams.map((item) => [item.id, item])), [teams]);
  const competitionMap = useMemo(
    () => new Map(competitions.map((item) => [item.id, item])),
    [competitions]
  );
  const orderedMatches = useMemo(
    () => [...matches].sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt)),
    [matches]
  );
  const finishedMatches = orderedMatches.filter(hasRecordedScore);
  const upcomingMatches = [...orderedMatches]
    .filter((match) => !hasRecordedScore(match))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const sortedPlayers = [...players].sort(
    (left, right) =>
      right.startsLast5 - left.startsLast5 ||
      right.seasonMinutes - left.seasonMinutes ||
      right.last14Minutes - left.last14Minutes
  );
  const scheduleContext = useMemo(() => {
    const relevantMatch = [...matches]
      .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
      .find((match) => match.home.teamId === team.id || match.away.teamId === team.id);

    if (!relevantMatch) {
      return null;
    }

    return relevantMatch.home.teamId === team.id
      ? scheduleContextFromMatchSide(relevantMatch, relevantMatch.home, false)
      : scheduleContextFromMatchSide(relevantMatch, relevantMatch.away, true);
  }, [matches, team.id]);
  const teamModel = computeTeamTFI(players, { scheduleContext });
  const teamEnergy = teamModel.energy;
  const primaryCompetition = matches.length
    ? competitions.find((item) => item.id === matches[0].competitionId)
    : undefined;
  const standings = primaryCompetition
    ? buildSeasonStandings(competitionMatches, new Map(teams.map((item) => [item.id, item])))
    : [];
  const standing = standings.find((item) => item.team.id === team.id);
  const unavailable = collectUnavailable(matches);
  const fixtureRows = buildFixtureRows(orderedMatches, team.id, competitionMap, teamMap);
  const filteredFixtureRows = fixtureRows.filter((row) =>
    fixtureFilter === "all" ? true : row.category === fixtureFilter
  );
  const groupedFixtures = groupFixturesByMonth(filteredFixtureRows);
  const attackMetrics = buildTeamAttackMetrics(finishedMatches, team.id);
  const defenseMetrics = buildTeamDefenseMetrics(finishedMatches, team.id);
  const fixtureTimeline = buildFixtureTimeline(upcomingMatches);
  const groupedSquad = groupPlayersByPosition(sortedPlayers);
  const lineup = buildLineupPreview(sortedPlayers);
  const roleCounts = buildRoleCounts(sortedPlayers);
  const scorerLeaders = [...sortedPlayers]
    .filter((player) => (player.seasonGoals ?? 0) > 0)
    .sort(
      (left, right) =>
        (right.seasonGoals ?? 0) - (left.seasonGoals ?? 0) ||
        (right.averageRating ?? 0) - (left.averageRating ?? 0)
    );
  const assistLeaders = [...sortedPlayers]
    .filter((player) => (player.seasonAssists ?? 0) > 0)
    .sort(
      (left, right) =>
        (right.seasonAssists ?? 0) - (left.seasonAssists ?? 0) ||
        (right.averageRating ?? 0) - (left.averageRating ?? 0)
    );
  const summaryBlocks = [
    {
      label: locale === "zh" ? "球队 Energy" : "Team Energy",
      value: `${teamEnergy}`,
      note: energyBandLabel(teamEnergy, locale),
    },
    {
      label: locale === "zh" ? "阵容样本" : "Squad sample",
      value: `${players.length}`,
      note: locale === "zh" ? "球员" : "players",
    },
    {
      label: locale === "zh" ? "近期赛程" : "Next fixture",
      value: upcomingMatches[0] ? timeLabel(upcomingMatches[0].kickoffLabel) : "--",
      note: upcomingMatches[0]
        ? opponentName(upcomingMatches[0], team.id, teamMap)
        : locale === "zh"
          ? "暂无"
          : "None",
    },
  ];

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="match-detail-header team-page-header">
          <EntityMark value={team.badge} label={team.name} className="team-page-header__badge" />
          <div className="team-page-header__content">
            <div className="team-page-header__title">{team.name}</div>
            <div className="team-page-header__meta">
              {primaryCompetition ? (
                <>
                  <span>{translateText(primaryCompetition.name, locale)}</span>
                  {standing ? (
                    <>
                      <span>·</span>
                      <span>
                        {positionLabel(locale, standingPosition(standings, team.id))} · {standing.points}
                        {locale === "zh" ? " 分" : " pts"}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                <span>{team.country}</span>
              )}
            </div>
          </div>
          <div className="team-page-header__actions">
            <button type="button" className="follow-button">
              {locale === "zh" ? "关注" : "Follow"}
            </button>
            <div className="team-page-header__energy">
              <span>{locale === "zh" ? "球队 Energy" : "Team Energy"}</span>
              <strong className={`team-page-header__energy-value team-page-header__energy-value--${energyBand(teamEnergy)}`}>
                {teamModel.tfi}
              </strong>
            </div>
          </div>
        </div>

        <div className="match-tabs">
          {TEAM_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`match-tab${activeTab === tab ? " active" : ""}${tab === "energy" ? " sonar-tab" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {teamTabLabel(tab, locale)}
            </button>
          ))}
        </div>

        <div className="sonar-panel">
          {activeTab === "overview" ? (
            <div className="team-page-layout">
              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "赛季战绩日历" : "Form calendar"}
                </div>
                <div className="form-calendar">
                  {finishedMatches.slice(0, 32).reverse().map((match) => (
                    <div
                      key={match.id}
                      className={`form-calendar__cell form-calendar__cell--${resultTone(match, team.id)}`}
                      title={`${compactDate(match.startsAt, locale)} · ${opponentName(match, team.id, teamMap)} · ${fixtureScoreLabel(match)}`}
                    />
                  ))}
                  {Array.from({ length: Math.max(0, 32 - finishedMatches.slice(0, 32).length) }).map((_, index) => (
                    <div key={`empty-${index}`} className="form-calendar__cell form-calendar__cell--upcoming" />
                  ))}
                </div>
                <div className="form-calendar__legend">
                  <span><i className="form-calendar__dot form-calendar__dot--win" />{locale === "zh" ? "胜" : "W"}</span>
                  <span><i className="form-calendar__dot form-calendar__dot--draw" />{locale === "zh" ? "平" : "D"}</span>
                  <span><i className="form-calendar__dot form-calendar__dot--loss" />{locale === "zh" ? "负" : "L"}</span>
                  {standing ? (
                    <strong>
                      {standing.wins}
                      {locale === "zh" ? "胜 " : "W "}
                      {standing.draws}
                      {locale === "zh" ? "平 " : "D "}
                      {standing.losses}
                      {locale === "zh" ? "负" : "L"}
                    </strong>
                  ) : null}
                </div>
              </section>

              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "积分榜摘要" : "Standings summary"}
                </div>
                <div className="overview-summary-card">
                  <div className="overview-summary-card__top">
                    <span>{locale === "zh" ? "联赛排名" : "League position"}</span>
                    <strong>{standing ? positionLabel(locale, standingPosition(standings, team.id)) : "--"}</strong>
                  </div>
                  <div className="overview-summary-card__stats">
                    <span>{standing?.points ?? 0}{locale === "zh" ? "分" : " pts"}</span>
                    <span>
                      {standing?.wins ?? 0}-{standing?.draws ?? 0}-{standing?.losses ?? 0}
                    </span>
                    <span>{locale === "zh" ? `净胜 ${standing?.goalDiff ?? 0}` : `GD ${standing?.goalDiff ?? 0}`}</span>
                  </div>
                  <div className="overview-summary-card__note">
                    {locale === "zh"
                      ? "与上下名次分差会在联赛扩展数据接入后展示。"
                      : "Gap to adjacent teams will appear after extended league data sync."}
                  </div>
                </div>
              </section>

              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "近期赛程" : "Recent fixtures"}
                </div>
                <div className="player-match-list">
                  {fixtureRows.slice(0, 8).map((fixture) => (
                    <Link
                      href={`/match/${fixture.match.slug}`}
                      className={`player-match-row player-match-row--${fixture.resultTone}`}
                      key={fixture.match.id}
                    >
                      <span className="player-match-row__date">{fixture.dateLabel}</span>
                      <span className="player-match-row__opponent">
                        <span className={`comp-tag comp-tag--${fixture.category}`}>{fixture.competitionShort}</span>
                      </span>
                      <span className="player-match-row__score">{fixture.opponent}</span>
                      <span className="player-match-row__meta">{fixture.scoreLabel}</span>
                      <span className="player-match-row__icons">{fixture.homeAwayLabel}</span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "射手榜" : "Top scorers"}
                </div>
                <div className="leaderboard-list">
                  {scorerLeaders.length ? (
                    scorerLeaders.slice(0, 5).map((playerItem, index) => (
                      <Link href={`/player/${playerItem.slug}`} className="leaderboard-row" key={`goals-${playerItem.slug}`}>
                        <span className="leaderboard-row__index">{index + 1}</span>
                        <span className="leaderboard-row__identity">
                          <span className="leaderboard-row__avatar">
                            {playerItem.photo ? (
                              <img src={playerItem.photo} alt={playerItem.name} />
                            ) : (
                              initials(playerItem.name)
                            )}
                          </span>
                          <span className="leaderboard-row__copy">
                            <span className="leaderboard-row__name">{playerItem.name}</span>
                            <span className="leaderboard-row__meta">
                              {playerItem.position} · {playerItem.appearancesCount ?? 0}
                              {locale === "zh" ? " 场" : " apps"}
                            </span>
                          </span>
                        </span>
                        <strong className="leaderboard-row__value">{playerItem.seasonGoals ?? 0}</strong>
                      </Link>
                    ))
                  ) : (
                    <div className="flat-empty">
                      {locale === "zh" ? "暂无射手榜数据" : "No scorer leaderboard yet"}
                    </div>
                  )}
                </div>
              </section>

              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "助攻榜" : "Top assists"}
                </div>
                <div className="leaderboard-list">
                  {assistLeaders.length ? (
                    assistLeaders.slice(0, 5).map((playerItem, index) => (
                      <Link href={`/player/${playerItem.slug}`} className="leaderboard-row" key={`assists-${playerItem.slug}`}>
                        <span className="leaderboard-row__index">{index + 1}</span>
                        <span className="leaderboard-row__identity">
                          <span className="leaderboard-row__avatar">
                            {playerItem.photo ? (
                              <img src={playerItem.photo} alt={playerItem.name} />
                            ) : (
                              initials(playerItem.name)
                            )}
                          </span>
                          <span className="leaderboard-row__copy">
                            <span className="leaderboard-row__name">{playerItem.name}</span>
                            <span className="leaderboard-row__meta">
                              {playerItem.position} · {playerItem.averageRating?.toFixed(1) ?? "--"}
                            </span>
                          </span>
                        </span>
                        <strong className="leaderboard-row__value">{playerItem.seasonAssists ?? 0}</strong>
                      </Link>
                    ))
                  ) : (
                    <div className="flat-empty">
                      {locale === "zh" ? "暂无助攻榜数据" : "No assist leaderboard yet"}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "squad" ? (
            <div className="team-page-layout">
              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "迷你阵型图" : "Mini formation"}
                </div>
                <div className="mini-pitch">
                  {lineup.map((line, index) => (
                    <div className="mini-pitch__line" key={`line-${index}`}>
                      {line.map((playerItem) => (
                        <Link
                          href={`/player/${playerItem.slug}`}
                          className="mini-pitch__player"
                          key={playerItem.slug}
                        >
                          <div className={`mini-pitch__marker mini-pitch__marker--${energyBand(computePlayerPFI(playerItem, { scheduleContext }).energy)}`}>
                            {initials(playerItem.name)}
                          </div>
                          <span>{playerItem.name.split(" ").slice(-1)[0]}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              {groupedSquad.map((group) => (
                <section className="player-card-section player-card-section--wide" key={group.label}>
                  <div className="player-section-title">{group.label}</div>
                  <div className="squad-list">
                    {group.players.map((playerItem) => {
                      const energy = computePlayerPFI(playerItem, { scheduleContext }).energy;
                      return (
                        <Link href={`/player/${playerItem.slug}`} className="squad-list__row" key={playerItem.slug}>
                          <div className="squad-list__identity">
                            <div className="squad-list__avatar">
                              {playerItem.photo ? (
                                <img src={playerItem.photo} alt={playerItem.name} />
                              ) : (
                                initials(playerItem.name)
                              )}
                            </div>
                            <div>
                              <div className="squad-list__name">{playerItem.name}</div>
                              <div className="squad-list__meta">
                                #{inferSquadNumber(playerItem)} · {playerItem.age}
                                {locale === "zh" ? "岁" : "y"} · {playerItem.position}
                              </div>
                            </div>
                          </div>
                          <div className="squad-list__stats">
                            <span>{playerItem.appearancesCount ?? 0} {locale === "zh" ? "场" : "apps"}</span>
                            <span>{playerItem.seasonGoals ?? 0}{locale === "zh" ? "球" : " G"}</span>
                            <span>{playerItem.seasonAssists ?? 0}{locale === "zh" ? "助" : " A"}</span>
                            <span>{playerItem.averageRating?.toFixed(1) ?? "--"}</span>
                            <span className={`rating-badge rating-badge--${energyBand(energy) === "fresh" ? "great" : energyBand(energy) === "tired" ? "average" : "poor"}`}>
                              {energy}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : null}

          {activeTab === "fixtures" ? (
            <div>
              <div className="filter-chip-row">
                {FIXTURE_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`filter-chip${fixtureFilter === filter ? " active" : ""}`}
                    onClick={() => setFixtureFilter(filter)}
                  >
                    {fixtureFilterLabel(filter, locale)}
                  </button>
                ))}
              </div>

              <div className="fixture-month-list">
                {groupedFixtures.length ? (
                  groupedFixtures.map((group) => (
                    <div className="fixture-month-group" key={group.label}>
                      <div className="fixture-month-group__title">{group.label}</div>
                      <div className="player-match-list">
                        {group.rows.map((fixture) => (
                          <Link
                            href={`/match/${fixture.match.slug}`}
                            className={`player-match-row player-match-row--${fixture.resultTone}`}
                            key={fixture.match.id}
                          >
                            <span className="player-match-row__date">{fixture.dateLabel}</span>
                            <span className={`comp-tag comp-tag--${fixture.category}`}>{fixture.competitionShort}</span>
                            <span className="player-match-row__score">{fixture.opponent}</span>
                            <span className="player-match-row__meta">{fixture.scoreLabel}</span>
                            <span className="player-match-row__icons">{fixture.homeAwayLabel}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flat-empty">
                    {locale === "zh" ? "该筛选下暂无赛程" : "No fixtures in this filter"}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "energy" ? (
            <div className="team-page-layout">
              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "阵容 Energy 总览" : "Squad energy overview"}
                </div>
                <div className="team-player-grid">
                  {sortedPlayers.slice(0, 12).map((playerItem) => {
                    const energy = computePlayerPFI(playerItem, { scheduleContext }).energy;
                    const band = energyBand(energy);

                    return (
                      <Link href={`/player/${playerItem.slug}`} className={`team-player-card team-player-card--${band}`} key={playerItem.slug}>
                        <div className="team-player-card__header">
                          <div className="team-player-card__name">{playerItem.name}</div>
                          <div className={`team-player-card__score team-player-card__score--${band}`}>{energy}</div>
                        </div>
                        <div className="team-player-card__meta">
                          {playerItem.position} · {playerItem.last14Minutes}min/14d · {playerItem.age}
                          {locale === "zh" ? "岁" : "y"}
                        </div>
                        <div className="team-player-card__bar">
                          <div
                            className={`team-player-card__bar-fill team-player-card__bar-fill--${band}`}
                            style={{ width: `${energy}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "角色分布" : "Role split"}
                </div>
                <div className="role-distribution">
                  {roleCounts.map((item) => (
                    <div className="role-distribution__row" key={item.label}>
                      <span>{item.label}</span>
                      <div className="role-distribution__track">
                        <div
                          className={`role-distribution__fill role-distribution__fill--${item.key}`}
                          style={{ width: `${item.width}%` }}
                        />
                      </div>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "伤病缺阵" : "Unavailable"}
                </div>
                <div className="list-stack">
                  {unavailable.length ? (
                    unavailable.map((item) => (
                      <div className="list-row" key={item}>
                        <div className="list-row__dot list-row__dot--danger" />
                        <div className="list-row__content">
                          <div className="list-row__title">{item}</div>
                          <div className="list-row__meta">
                            {locale === "zh" ? "阵容状态观察" : "Squad status watch"}
                          </div>
                        </div>
                        <span className="list-row__status list-row__status--danger">
                          {locale === "zh" ? "关注" : "Watch"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flat-empty">
                      {locale === "zh" ? "暂无缺阵提醒" : "No absences flagged"}
                    </div>
                  )}
                </div>
              </section>

              <section className="player-card-section player-card-section--wide">
                <div className="player-section-title">
                  {locale === "zh" ? "赛程密集度" : "Schedule density"}
                </div>
                <div className="schedule-timeline">
                  {fixtureTimeline.length ? (
                    fixtureTimeline.map((item) => (
                      <div className="schedule-timeline__item" key={`${item.label}-${item.meta}`}>
                        <div className={`schedule-timeline__dot schedule-timeline__dot--${item.tone}`} />
                        <div className="schedule-timeline__label">{item.label}</div>
                        <div className="schedule-timeline__meta">{item.meta}</div>
                      </div>
                    ))
                  ) : (
                    <div className="flat-empty">
                      {locale === "zh" ? "未来 30 天暂无赛程密度数据" : "No 30-day schedule density data"}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "stats" ? (
            <div className="team-page-layout">
              <section className="player-card-section player-card-section--wide">
                <div className="filter-chip-row">
                  {STAT_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`filter-chip${statFilter === filter ? " active" : ""}`}
                      onClick={() => setStatFilter(filter)}
                    >
                      {statFilterLabel(filter, locale)}
                    </button>
                  ))}
                </div>

                {statFilter === "attack" || statFilter === "defense" ? (
                  <div className="metric-bars">
                    {(statFilter === "attack" ? attackMetrics : defenseMetrics).map((item) => (
                      <div className="metric-bars__row" key={item.label}>
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
                ) : (
                  <div className="flat-empty">
                    {locale === "zh"
                      ? "这组联赛级统计将在 Claude 同步更多球队统计后显示。"
                      : "This stat group will appear after more team metrics sync in."}
                  </div>
                )}
              </section>

              <section className="player-card-section">
                <div className="player-section-title">
                  {locale === "zh" ? "联赛排名" : "League ranking"}
                </div>
                <div className="stat-card-grid">
                  {summaryBlocks.map((block) => (
                    <div className="stat-card" key={block.label}>
                      <div className="stat-value">{block.value}</div>
                      <div className="stat-label">{block.label}</div>
                      <div className="stat-note">{block.note}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "transfers" ? (
            <div className="flat-empty">
              {locale === "zh" ? "转会模块稍后接入真实数据。" : "Transfer feed will be connected later."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function collectUnavailable(matches: MatchRecord[]) {
  const all = new Set<string>();

  for (const match of matches) {
    for (const player of [...match.home.keyAbsent, ...match.away.keyAbsent]) {
      all.add(player);
    }
  }

  return [...all];
}

function teamTabLabel(tab: TeamTab, locale: "zh" | "en") {
  if (locale === "zh") {
    switch (tab) {
      case "overview":
        return "概览";
      case "squad":
        return "阵容";
      case "fixtures":
        return "赛程";
      case "energy":
        return "体能";
      case "stats":
        return "数据";
      case "transfers":
        return "转会";
    }
  }

  switch (tab) {
    case "overview":
      return "Overview";
    case "squad":
      return "Squad";
    case "fixtures":
      return "Fixtures";
    case "energy":
      return "Energy";
    case "stats":
      return "Stats";
    case "transfers":
      return "Transfers";
  }
}

function fixtureFilterLabel(filter: FixtureFilter, locale: "zh" | "en") {
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
  }
}

function statFilterLabel(filter: StatFilter, locale: "zh" | "en") {
  if (locale === "zh") {
    switch (filter) {
      case "attack":
        return "进攻";
      case "defense":
        return "防守";
      case "passing":
        return "传球";
      case "discipline":
        return "纪律";
    }
  }

  switch (filter) {
    case "attack":
      return "Attack";
    case "defense":
      return "Defense";
    case "passing":
      return "Passing";
    case "discipline":
      return "Discipline";
  }
}

function standingPosition(
  standings: ReturnType<typeof buildSeasonStandings>,
  teamId: string
) {
  const index = standings.findIndex((item) => item.team.id === teamId);
  return index >= 0 ? index + 1 : 0;
}

function positionLabel(locale: "zh" | "en", position: number) {
  if (!position) {
    return locale === "zh" ? "未上榜" : "Unranked";
  }

  if (locale === "zh") {
    return `第 ${position}`;
  }

  if (position % 100 >= 11 && position % 100 <= 13) {
    return `${position}th`;
  }

  const remainder = position % 10;
  if (remainder === 1) return `${position}st`;
  if (remainder === 2) return `${position}nd`;
  if (remainder === 3) return `${position}rd`;
  return `${position}th`;
}

function resultTone(match: MatchRecord, teamId: string) {
  if (match.homeScore == null || match.awayScore == null) {
    return "neutral";
  }

  const score =
    match.home.teamId === teamId
      ? match.homeScore - match.awayScore
      : match.awayScore - match.homeScore;

  if (score > 0) return "win";
  if (score < 0) return "loss";
  return "draw";
}

function buildFixtureRows(
  matches: MatchRecord[],
  teamId: string,
  competitionMap: Map<string, CompetitionRecord>,
  teamMap: Map<string, TeamRecord>
) {
  return matches.map((match) => {
    const competition = competitionMap.get(match.competitionId);
    const opponent = opponentName(match, teamId, teamMap);
    return {
      match,
      dateLabel: compactDate(match.startsAt, "zh"),
      opponent,
      competitionShort: competitionShort(competition),
      category: competitionCategory(competition),
      scoreLabel: hasRecordedScore(match) ? fixtureScoreLabel(match) : timeLabel(match.kickoffLabel),
      homeAwayLabel: match.home.teamId === teamId ? "H" : "A",
      resultTone: resultTone(match, teamId),
    };
  });
}

function groupFixturesByMonth(
  fixtures: ReturnType<typeof buildFixtureRows>
) {
  const groups = new Map<string, ReturnType<typeof buildFixtureRows>>();

  for (const fixture of fixtures) {
    const label = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Shanghai",
    }).format(new Date(fixture.match.startsAt));

    groups.set(label, [...(groups.get(label) ?? []), fixture]);
  }

  return [...groups.entries()].map(([label, rows]) => ({ label, rows }));
}

function buildTeamAttackMetrics(matches: MatchRecord[], teamId: string) {
  const goalsFor = matches.reduce((sum, match) => sum + goalsForMatch(match, teamId), 0);
  const wins = matches.filter((match) => resultTone(match, teamId) === "win").length;
  const points =
    wins * 3 + matches.filter((match) => resultTone(match, teamId) === "draw").length;
  const played = Math.max(matches.length, 1);

  return [
    metricItem("场均进球", round(goalsFor / played), 4, "fresh"),
    metricItem("总进球", goalsFor, 100, "fresh"),
    metricItem("胜场", wins, played, "fresh"),
    metricItem("场均积分", round(points / played), 3, "fresh"),
  ];
}

function buildTeamDefenseMetrics(matches: MatchRecord[], teamId: string) {
  const conceded = matches.reduce((sum, match) => sum + goalsAgainstMatch(match, teamId), 0);
  const cleanSheets = matches.filter((match) => goalsAgainstMatch(match, teamId) === 0).length;
  const losses = matches.filter((match) => resultTone(match, teamId) === "loss").length;
  const played = Math.max(matches.length, 1);

  return [
    metricItem("场均失球", round(conceded / played), 3, "warning"),
    metricItem("零封", cleanSheets, played, "fresh"),
    metricItem("失利", losses, played, "warning"),
    metricItem("净胜球", goalsForTotal(matches, teamId) - conceded, 50, "fresh"),
  ];
}

function metricItem(
  label: string,
  value: number,
  max: number,
  tone: "fresh" | "warning"
) {
  return {
    label,
    value: `${Math.round(value)}`,
    width: Math.max(8, Math.min(100, (Math.abs(value) / Math.max(max, 1)) * 100)),
    tone,
  };
}

function buildFixtureTimeline(matches: MatchRecord[]) {
  return matches.slice(0, 6).map((match) => {
    const diffDays = Math.round((Date.parse(match.startsAt) - Date.now()) / (1000 * 60 * 60 * 24));
    return {
      label: compactDate(match.startsAt, "zh"),
      meta: `${fixtureStatusLabel(match)} · ${match.stage}`,
      tone: diffDays <= 2 ? "danger" : diffDays <= 5 ? "warning" : "fresh",
    };
  });
}

function buildRoleCounts(players: PlayerProfile[]) {
  const groups = {
    starter: 0,
    rotation: 0,
    bench: 0,
  };

  for (const player of players) {
    if (player.startsLast5 >= 4) {
      groups.starter += 1;
    } else if (player.startsLast5 >= 2) {
      groups.rotation += 1;
    } else {
      groups.bench += 1;
    }
  }

  const total = Math.max(players.length, 1);

  return [
    { key: "starter", label: "主力", count: groups.starter, width: (groups.starter / total) * 100 },
    { key: "rotation", label: "轮换", count: groups.rotation, width: (groups.rotation / total) * 100 },
    { key: "bench", label: "板凳", count: groups.bench, width: (groups.bench / total) * 100 },
  ];
}

function buildLineupPreview(players: PlayerProfile[]) {
  const grouped = groupPlayersByPosition(players);
  const goalkeeper = grouped.find((group) => group.key === "gk")?.players.slice(0, 1) ?? [];
  const defenders = grouped.find((group) => group.key === "def")?.players.slice(0, 4) ?? [];
  const midfielders = grouped.find((group) => group.key === "mid")?.players.slice(0, 3) ?? [];
  const forwards = grouped.find((group) => group.key === "fwd")?.players.slice(0, 3) ?? [];

  return [forwards, midfielders, defenders, goalkeeper].filter((line) => line.length);
}

function groupPlayersByPosition(players: PlayerProfile[]) {
  const groups = new Map<string, PlayerProfile[]>();

  for (const player of players) {
    const bucket = positionBucket(player.position);
    groups.set(bucket, [...(groups.get(bucket) ?? []), player]);
  }

  return [
    { key: "gk", label: "门将", players: groups.get("gk") ?? [] },
    { key: "def", label: "后卫", players: groups.get("def") ?? [] },
    { key: "mid", label: "中场", players: groups.get("mid") ?? [] },
    { key: "fwd", label: "前锋", players: groups.get("fwd") ?? [] },
  ].filter((group) => group.players.length);
}

function positionBucket(position: string) {
  const normalized = position.toUpperCase();
  if (normalized.includes("GK")) return "gk";
  if (/(CB|RB|LB|WB|DEF|DF)/.test(normalized)) return "def";
  if (/(CM|DM|AM|MID|MF|RM|LM)/.test(normalized)) return "mid";
  return "fwd";
}

function competitionShort(competition?: CompetitionRecord) {
  if (!competition) return "ALL";
  return competition.slug
    .split("-")
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3) || "ALL";
}

function competitionCategory(competition?: CompetitionRecord): FixtureFilter {
  if (!competition) return "all";
  if (competition.slug.includes("champions") || competition.slug.includes("europa")) return "european";
  if (competition.slug.includes("cup")) return "cup";
  return "league";
}

function compactDate(startsAt: string, locale: "zh" | "en") {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date(startsAt));
}

function opponentName(match: MatchRecord, teamId: string, teamMap: Map<string, TeamRecord>) {
  const opponentId = match.home.teamId === teamId ? match.away.teamId : match.home.teamId;
  return teamMap.get(opponentId)?.name ?? "Opponent";
}

function timeLabel(kickoffLabel: string) {
  const time = kickoffLabel.match(/\b\d{1,2}:\d{2}(?:\s?[AP]M)?\b/i)?.[0];
  return time ?? kickoffLabel;
}

function goalsForMatch(match: MatchRecord, teamId: string) {
  if (match.homeScore == null || match.awayScore == null) return 0;
  return match.home.teamId === teamId ? match.homeScore : match.awayScore;
}

function goalsAgainstMatch(match: MatchRecord, teamId: string) {
  if (match.homeScore == null || match.awayScore == null) return 0;
  return match.home.teamId === teamId ? match.awayScore : match.homeScore;
}

function goalsForTotal(matches: MatchRecord[], teamId: string) {
  return matches.reduce((sum, match) => sum + goalsForMatch(match, teamId), 0);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function inferSquadNumber(player: PlayerProfile) {
  return player.name
    .split("")
    .reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 30 || 11;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function energyBandLabel(energy: number, locale: "zh" | "en") {
  if (locale === "zh") {
    if (energy < 40) return "高疲劳";
    if (energy < 60) return "中负荷";
    return "体能充沛";
  }

  if (energy < 40) return "High fatigue";
  if (energy < 60) return "Medium load";
  return "Fresh";
}
