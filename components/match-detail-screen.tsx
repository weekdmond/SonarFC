"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

import { EntityMark } from "@/components/entity-mark";
import { useAppPreferences } from "@/components/preferences-provider";
import {
  computeTeamTFI,
  energyFromFatigue,
  fatigueLevel,
  scheduleContextFromMatchSide,
  type TeamFatigueModel,
} from "@/lib/fatigue-model";
import { translateText } from "@/lib/i18n";
import { fixtureScoreLabel, fixtureStatusLabel, hasRecordedScore } from "@/lib/match-logic";
import { energyBand, formatDistance } from "@/lib/sonar";
import type {
  CompetitionRecord,
  Locale,
  MatchPlayerPerformance,
  MatchRecord,
  MatchSide,
  PlayerProfile,
  Result,
  TeamRecord,
} from "@/lib/types";

type MatchTab = "facts" | "lineup" | "stats" | "sonar" | "h2h";

const MATCH_TABS: MatchTab[] = ["facts", "lineup", "stats", "sonar", "h2h"];

export function MatchDetailScreen({
  match,
  matches,
  competitions,
  teams,
  homePlayers,
  awayPlayers,
}: {
  match: MatchRecord;
  matches: MatchRecord[];
  competitions: CompetitionRecord[];
  teams: TeamRecord[];
  homePlayers: PlayerProfile[];
  awayPlayers: PlayerProfile[];
}) {
  const finished = isFinishedMatch(match);
  const postgame = match.postgame ?? null;
  const defaultTab: MatchTab = finished
    ? "facts"
    : "sonar";
  const [activeTab, setActiveTab] = useState<MatchTab>(defaultTab);
  const [shareState, setShareState] = useState<"idle" | "done">("idle");
  const { locale } = useAppPreferences();
  const competitionMap = new Map(competitions.map((item) => [item.id, item]));
  const teamMap = new Map(teams.map((item) => [item.id, item]));
  const competition = competitionMap.get(match.competitionId);
  const homeTeam = teamMap.get(match.home.teamId);
  const awayTeam = teamMap.get(match.away.teamId);

  if (!competition || !homeTeam || !awayTeam) {
    return null;
  }

  const homeModel = resolveTeamFatigueModel(match, match.home, homePlayers, false);
  const awayModel = resolveTeamFatigueModel(match, match.away, awayPlayers, true);

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="match-detail-header">
          <div className="match-detail-header__actions">
            <button
              type="button"
              className="detail-action-button"
              onClick={async () => {
                const target = typeof window !== "undefined" ? window.location.href : `/match/${match.slug}`;
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: `${homeTeam.name} vs ${awayTeam.name}`,
                      text: `${homeTeam.name} ${fixtureScoreLabel(match)} ${awayTeam.name}`,
                      url: target,
                    });
                  } else {
                    await navigator.clipboard.writeText(target);
                  }
                  setShareState("done");
                  window.setTimeout(() => setShareState("idle"), 1600);
                } catch {
                  setShareState("idle");
                }
              }}
            >
              {shareState === "done"
                ? locale === "zh"
                  ? "已复制"
                  : "Copied"
                : locale === "zh"
                  ? "分享"
                  : "Share"}
            </button>
          </div>

          <div className="match-detail-meta">
            {translateText(competition.name, locale)} · {match.stage} ·{" "}
            {finished ? statusText(match, locale) : match.kickoffLabel}
          </div>

          <div className="match-detail-teams">
            <MatchDetailTeam team={homeTeam} href={`/team/${homeTeam.slug}`} />
            <MatchDetailCenter match={match} locale={locale} />
            <MatchDetailTeam team={awayTeam} href={`/team/${awayTeam.slug}`} />
          </div>

          <div className="match-detail-meta">
            {finished ? `${match.venue} · ${match.kickoffLabel}` : match.venue}
          </div>
        </div>

        <div className="match-tabs">
          {MATCH_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`match-tab${activeTab === tab ? " active" : ""}${
                tab === "sonar" ? " sonar-tab" : ""
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabel(tab, locale, finished)}
            </button>
          ))}
        </div>

        <div className="sonar-panel">
          {activeTab === "sonar" ? (
            <>
              <div className="sonar-section">
                <div className="sonar-section-title">
                  {finished
                    ? locale === "zh"
                      ? "Match Energy Review"
                      : "Match Energy Review"
                    : locale === "zh"
                      ? "Team Status Comparison"
                      : "Team Status Comparison"}
                </div>

                <div className="sonar-compare-grid">
                  <MatchSonarColumn
                    team={homeTeam}
                    side={match.home}
                    teamModel={homeModel}
                    locale={locale}
                    align="left"
                  />
                  <div className="fatigue-vs">{conditionEdge(homeTeam, awayTeam, homeModel, awayModel, locale)}</div>
                  <MatchSonarColumn
                    team={awayTeam}
                    side={match.away}
                    teamModel={awayModel}
                    locale={locale}
                    align="right"
                  />
                </div>
              </div>

              <div className="sonar-section">
                <div className="sonar-section-title">
                  {finished
                    ? locale === "zh"
                      ? "Schedule Context"
                      : "Schedule Context"
                    : locale === "zh"
                      ? "Schedule Density"
                      : "Schedule Density"}
                </div>
                <div className="sonar-schedule-grid">
                  <ScheduleStrip team={homeTeam} side={match.home} locale={locale} />
                  <ScheduleStrip team={awayTeam} side={match.away} locale={locale} />
                </div>
              </div>

              <div className="sonar-section">
                <div className="sonar-section-title">
                  {finished
                    ? locale === "zh"
                      ? "Sonar Match Review"
                      : "Sonar Match Review"
                    : locale === "zh"
                      ? "AI Pre-match Analysis"
                      : "AI Pre-match Analysis"}
                </div>
                <div className="ai-summary">
                  <div className="ai-summary-label">{finished ? "⚡ Sonar Review" : "⚡ Sonar AI"}</div>
                  {finished ? buildFinishedSummary(match, homeTeam, awayTeam, locale) : null}
                  {!finished ? (
                    <>
                      {translateText(match.verdict, locale)} {translateText(match.spotlight, locale)}{" "}
                      {translateText(match.home.aiSummary, locale)}{" "}
                      {translateText(match.away.aiSummary, locale)}
                    </>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "facts" ? (
            <div className="simple-stack">
              <InfoCard
                title={
                  finished
                    ? locale === "zh"
                      ? "比赛结果"
                      : "Final result"
                    : locale === "zh"
                      ? "核心结论"
                      : "Key takeaway"
                }
                body={
                  finished
                    ? buildFinishedSummary(match, homeTeam, awayTeam, locale)
                    : `${translateText(match.verdict, locale)} ${translateText(match.spotlight, locale)}`
                }
              />
              {finished && postgame ? (
                <>
                  <div className="facts-visual-grid">
                    <PossessionTimelineCard
                      postgame={postgame}
                      homeTeam={homeTeam}
                      awayTeam={awayTeam}
                      locale={locale}
                    />
                    <MomentumGraphCard
                      timeline={postgame.timeline}
                      homeTeam={homeTeam}
                      awayTeam={awayTeam}
                      locale={locale}
                    />
                  </div>
                  <div className="summary-metric-grid summary-metric-grid--four">
                    {buildPostgameFactMetrics(match, postgame, homeTeam, awayTeam, locale).map((item) => (
                      <SummaryMetricCard
                        key={item.title}
                        title={item.title}
                        value={item.value}
                        note={item.note}
                        tone={item.tone}
                      />
                    ))}
                  </div>
                  <div className="info-grid info-grid--two">
                    <InfoCard
                      title={locale === "zh" ? "关键节点" : "Key moment"}
                      body={buildKeyMoment(postgame.timeline, homeTeam, awayTeam, locale)}
                    />
                    <InfoCard
                      title={locale === "zh" ? "数据亮点" : "Stat edge"}
                      body={buildKeyStat(postgame.teamStats, homeTeam, awayTeam, locale)}
                    />
                  </div>
                  <div className="info-grid info-grid--two">
                    <PlayerOfMatchCard
                      postgame={postgame}
                      teamMap={new Map([
                        [homeTeam.id, homeTeam],
                        [awayTeam.id, awayTeam],
                      ])}
                      locale={locale}
                    />
                    <MiniLineupFactsCard
                      homeTeam={homeTeam}
                      awayTeam={awayTeam}
                      homePlayers={postgame.homePlayers}
                      awayPlayers={postgame.awayPlayers}
                      locale={locale}
                    />
                  </div>
                  <div className="stats-compare-table">
                    {buildComparisonRows(postgame.teamStats, locale).map((item) => (
                      <StatComparisonRow
                        key={item.label}
                        label={item.label}
                        home={item.home}
                        away={item.away}
                      />
                    ))}
                  </div>
                  {postgame.timeline.length ? (
                    <TimelineCard
                      match={match}
                      timeline={postgame.timeline}
                      homeTeam={homeTeam}
                      awayTeam={awayTeam}
                      locale={locale}
                    />
                  ) : null}
                </>
              ) : (
                <div className="info-grid info-grid--two">
                  <InfoCard
                    title={homeTeam.name}
                    body={translateText(match.home.statusNote, locale)}
                  />
                  <InfoCard
                    title={awayTeam.name}
                    body={translateText(match.away.statusNote, locale)}
                  />
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "lineup" ? (
            finished && postgame ? (
              <div className="simple-stack">
                <PostgamePitchCard
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  homePlayers={postgame.homePlayers}
                  awayPlayers={postgame.awayPlayers}
                  locale={locale}
                />
                <div className="info-grid info-grid--two">
                  <PostgameLineupCard
                    team={homeTeam}
                    players={postgame.homePlayers}
                    locale={locale}
                  />
                  <PostgameLineupCard
                    team={awayTeam}
                    players={postgame.awayPlayers}
                    locale={locale}
                  />
                </div>
              </div>
            ) : (
              <div className="info-grid info-grid--two">
                <LineupCard team={homeTeam} side={match.home} locale={locale} />
                <LineupCard team={awayTeam} side={match.away} locale={locale} />
              </div>
            )
          ) : null}

          {activeTab === "h2h" ? (
            <div className="info-grid info-grid--two">
              <HistoryCard team={homeTeam} side={match.home} locale={locale} />
              <HistoryCard team={awayTeam} side={match.away} locale={locale} />
            </div>
          ) : null}

          {activeTab === "stats" ? (
            finished && postgame ? (
              <div className="simple-stack">
                <div className="summary-metric-grid summary-metric-grid--four">
                  {buildPostgameStatMetrics(postgame, homeTeam, awayTeam, locale).map((item) => (
                    <SummaryMetricCard
                      key={item.title}
                      title={item.title}
                      value={item.value}
                      note={item.note}
                    />
                  ))}
                </div>

                <div className="stats-compare-table">
                  {buildComparisonRows(postgame.teamStats, locale).map((item) => (
                    <StatComparisonRow
                      key={item.label}
                      label={item.label}
                      home={item.home}
                      away={item.away}
                    />
                  ))}
                </div>

                <div className="info-grid info-grid--two">
                  <TopPlayersCard
                    team={homeTeam}
                    players={postgame.homePlayers}
                    locale={locale}
                  />
                  <TopPlayersCard
                    team={awayTeam}
                    players={postgame.awayPlayers}
                    locale={locale}
                  />
                </div>
              </div>
            ) : (
              <div className="stats-compare-table">
                {[
                  {
                    label: "TFI",
                    home: `${homeModel.tfi}`,
                    away: `${awayModel.tfi}`,
                  },
                  {
                    label: locale === "zh" ? "Squad" : "Squad",
                    home: `${match.home.squadAvailability}%`,
                    away: `${match.away.squadAvailability}%`,
                  },
                  {
                    label: locale === "zh" ? "14d Matches" : "14d Matches",
                    home: `${match.home.matchDensity}`,
                    away: `${match.away.matchDensity}`,
                  },
                  {
                    label: locale === "zh" ? "Travel" : "Travel",
                    home: formatDistance(match.home.travelKm),
                    away: formatDistance(match.away.travelKm),
                  },
                ].map((item) => (
                  <div className="stats-compare-row" key={item.label}>
                    <div className="stats-compare-row__value">{item.home}</div>
                    <div className="stats-compare-row__label">{item.label}</div>
                    <div className="stats-compare-row__value stats-compare-row__value--right">
                      {item.away}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MatchDetailTeam({
  team,
  href,
}: {
  team: TeamRecord;
  href: string;
}) {
  return (
    <Link href={href} className="match-detail-team">
      <div className="badge">
        <EntityMark value={team.badge} label={team.name} className="team-badge" />
      </div>
      <div className="name">{team.name}</div>
    </Link>
  );
}

function MatchDetailCenter({
  match,
  locale,
}: {
  match: MatchRecord;
  locale: Locale;
}) {
  const finished = isFinishedMatch(match);

  if (!finished) {
    return <div className="match-detail-vs">{timeLabel(match.kickoffLabel)}</div>;
  }

  return (
    <div className="match-detail-vs match-detail-vs--finished">
      <span className="match-detail-vs__score">{fixtureScoreLabel(match)}</span>
      <span className="match-detail-vs__status">{statusText(match, locale)}</span>
    </div>
  );
}

function MatchSonarColumn({
  team,
  side,
  teamModel,
  locale,
  align,
}: {
  team: TeamRecord;
  side: MatchSide;
  teamModel: TeamFatigueModel;
  locale: Locale;
  align: "left" | "right";
}) {
  const energy = teamModel.energy;
  const band = energyBand(energy);

  return (
    <div className="fatigue-team-panel">
      <Link
        href={`/team/${team.slug}`}
        className={`fatigue-team-header${align === "right" ? " fatigue-team-header--right" : ""}`}
      >
        <EntityMark value={team.badge} label={team.name} className="fatigue-team-header__badge" />
        <span>
          <span className="fatigue-team-header__name">{team.name}</span>
          <span className="fatigue-team-header__meta">
            {align === "right" ? (locale === "zh" ? "AWAY" : "AWAY") : locale === "zh" ? "HOME" : "HOME"}
          </span>
        </span>
      </Link>

      <div className="energy-block">
        <div className="energy-block__meta">
          <span>TFI</span>
          <span className={`energy-block__value energy-block__value--${band}`}>{teamModel.tfi}/100</span>
        </div>
        <div className="energy-block__bar">
          <div className={`energy-block__fill energy-block__fill--${band}`} style={{ width: `${energy}%` }} />
          <div className="energy-block__label">Energy {energy}</div>
        </div>
      </div>

      <div className="summary-metric-grid">
        <MiniMetricCard
          label={locale === "zh" ? "Squad" : "Squad"}
          value={`${side.squadAvailability}%`}
          tone={energyBand(side.squadAvailability)}
        />
        <MiniMetricCard
          label="Avg PFI"
          value={`${teamModel.avgSquadPfi}`}
          tone={teamModel.level === "high" ? "exhausted" : teamModel.level === "medium" ? "tired" : "fresh"}
        />
        <MiniMetricCard
          label={locale === "zh" ? "Travel" : "Travel"}
          value={formatDistance(side.travelKm)}
          tone={side.travelKm > 2000 ? "exhausted" : side.travelKm > 800 ? "tired" : "fresh"}
        />
      </div>

      <div>
        <div className="sonar-section-title">
          {locale === "zh" ? "Recent Form" : "Recent Form"}
        </div>
        <div className="mini-momentum-bars">
          {side.recentResults.map((result, index) => (
            <div className="mini-momentum-bars__item" key={`${team.id}-${result}-${index}`}>
              <span className={`mini-momentum-bars__result mini-momentum-bars__result--${resultTone(result)}`}>
                {result}
              </span>
              <span
                className={`mini-momentum-bars__bar mini-momentum-bars__bar--${resultTone(result)}`}
                style={{ height: `${resultHeight(result)}px` }}
              />
              <span className="mini-momentum-bars__label">{side.momentumLabels[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScheduleStrip({
  team,
  side,
  locale,
}: {
  team: TeamRecord;
  side: MatchSide;
  locale: Locale;
}) {
  return (
    <div className="schedule-card">
      <div className="schedule-card__title inline-mark">
        <EntityMark value={team.badge} label={team.name} className="team-badge" />
        <span>{team.name}</span>
      </div>
      <div className="schedule-timeline">
        {side.schedule.map((point, index) => (
          <div className="schedule-timeline__segment" key={`${team.id}-${point.opponent}-${index}`}>
            <span className={`timeline-dot${point.current ? " current" : point.home ? " match" : ""}`} />
            {index < side.schedule.length - 1 ? <span className="timeline-line" /> : null}
          </div>
        ))}
      </div>
      <div className="schedule-card__meta">
        {locale === "zh" ? `${side.matchDensity} 场 / 14 天 · 休息 ${side.restDays} 天` : `${side.matchDensity} matches / 14d · ${side.restDays} rest days`}
      </div>
    </div>
  );
}

function LineupCard({
  team,
  side,
  locale,
}: {
  team: TeamRecord;
  side: MatchSide;
  locale: Locale;
}) {
  return (
    <InfoCard
      title={team.name}
      body={
        locale === "zh"
          ? `可用 ${side.formationHealth.available} 人，疑问 ${side.formationHealth.doubtful} 人，缺阵 ${side.formationHealth.absent} 人。${
              side.keyAbsent.length ? `缺阵重点：${side.keyAbsent.join("、")}` : "暂无关键缺阵提醒。"
            }`
          : `${side.formationHealth.available} available, ${side.formationHealth.doubtful} doubtful and ${side.formationHealth.absent} absent. ${
              side.keyAbsent.length ? `Key absences: ${side.keyAbsent.join(", ")}.` : "No major absences flagged."
            }`
      }
    />
  );
}

function HistoryCard({
  team,
  side,
  locale,
}: {
  team: TeamRecord;
  side: MatchSide;
  locale: Locale;
}) {
  return (
    <InfoCard
      title={team.name}
      body={
        locale === "zh"
          ? `近 5 场：${side.recentResults.join(" · ")}。赛程节点：${side.schedule
              .map((item) => `${item.opponent}${item.current ? "(MD)" : ""}`)
              .join(" / ")}`
          : `Last five: ${side.recentResults.join(" · ")}. Schedule nodes: ${side.schedule
              .map((item) => `${item.opponent}${item.current ? " (MD)" : ""}`)
              .join(" / ")}`
      }
    />
  );
}

function PostgameLineupCard({
  team,
  players,
  locale,
}: {
  team: TeamRecord;
  players: MatchPlayerPerformance[];
  locale: Locale;
}) {
  const starters = players.filter((item) => item.isStarter);
  const changes = players.filter((item) => item.subbedInAt != null || item.subbedOutAt != null);
  const bench = players.filter(
    (item) => !item.isStarter && item.subbedInAt == null && item.minutesPlayed === 0
  );
  const averageRating = averagePlayerRating(starters);
  const formation = inferFormation(starters);

  return (
    <div className="info-card">
      <div className="info-card__title">{team.name}</div>
      <div className="info-card__body" style={{ marginBottom: 12 }}>
        {locale === "zh"
          ? `${formation} · 首发均分 ${averageRating != null ? averageRating.toFixed(1) : "—"}`
          : `${formation} · Avg starter rating ${averageRating != null ? averageRating.toFixed(1) : "—"}`}
      </div>
      <div className="postgame-roster">
        <div className="postgame-roster__section">
          <div className="postgame-roster__label">
            {locale === "zh" ? "首发" : "Starters"}
          </div>
          <div className="simple-stack">
            {starters.slice(0, 11).map((player) => (
              <PlayerPerformanceRow key={`${team.id}-${player.playerId}`} player={player} locale={locale} />
            ))}
          </div>
        </div>

        {changes.length ? (
          <div className="postgame-roster__section">
            <div className="postgame-roster__label">
              {locale === "zh" ? "换人" : "Changes"}
            </div>
            <div className="simple-stack">
              {changes.slice(0, 8).map((player) => (
                <PlayerPerformanceRow
                  key={`${team.id}-change-${player.playerId}`}
                  player={player}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        ) : null}

        {bench.length ? (
          <div className="postgame-roster__section">
            <div className="postgame-roster__label">
              {locale === "zh" ? "未出场替补" : "Unused bench"}
            </div>
            <div className="simple-stack">
              {bench.slice(0, 8).map((player) => (
                <PlayerPerformanceRow
                  key={`${team.id}-bench-${player.playerId}`}
                  player={player}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PostgamePitchCard({
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  locale,
}: {
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
  homePlayers: MatchPlayerPerformance[];
  awayPlayers: MatchPlayerPerformance[];
  locale: Locale;
}) {
  const homeStarters = homePlayers.filter((item) => item.isStarter).slice(0, 11);
  const awayStarters = awayPlayers.filter((item) => item.isStarter).slice(0, 11);
  const homeRating = averagePlayerRating(homeStarters);
  const awayRating = averagePlayerRating(awayStarters);
  const homeFormation = inferFormation(homeStarters);
  const awayFormation = inferFormation(awayStarters);
  const homeNodes = buildPitchNodes(homeStarters, "home");
  const awayNodes = buildPitchNodes(awayStarters, "away");

  return (
    <div className="info-card postgame-pitch-card">
      <div className="postgame-pitch-card__header">
        <div className="postgame-pitch-card__team">
          <span className={`rating-badge${homeRating != null ? ` rating-badge--${ratingTone(homeRating)}` : ""}`}>
            {homeRating != null ? homeRating.toFixed(1) : "--"}
          </span>
          <div>
            <div className="postgame-pitch-card__team-name">{homeTeam.name}</div>
            <div className="postgame-pitch-card__team-meta">{homeFormation}</div>
          </div>
        </div>
        <div className="postgame-pitch-card__team postgame-pitch-card__team--away">
          <span className={`rating-badge${awayRating != null ? ` rating-badge--${ratingTone(awayRating)}` : ""}`}>
            {awayRating != null ? awayRating.toFixed(1) : "--"}
          </span>
          <div>
            <div className="postgame-pitch-card__team-name">{awayTeam.name}</div>
            <div className="postgame-pitch-card__team-meta">{awayFormation}</div>
          </div>
        </div>
      </div>

      <div className="postgame-pitch">
        <svg viewBox="0 0 600 420" className="postgame-pitch__svg" aria-hidden="true">
          <rect x="10" y="10" width="580" height="400" rx="4" fill="none" stroke="rgba(255,255,255,0.18)" />
          <line x1="300" y1="10" x2="300" y2="410" stroke="rgba(255,255,255,0.18)" />
          <circle cx="300" cy="210" r="44" fill="none" stroke="rgba(255,255,255,0.18)" />
          <circle cx="300" cy="210" r="2.5" fill="rgba(255,255,255,0.18)" />
          <rect x="10" y="118" width="70" height="184" fill="none" stroke="rgba(255,255,255,0.14)" />
          <rect x="10" y="160" width="32" height="100" fill="none" stroke="rgba(255,255,255,0.1)" />
          <rect x="520" y="118" width="70" height="184" fill="none" stroke="rgba(255,255,255,0.14)" />
          <rect x="558" y="160" width="32" height="100" fill="none" stroke="rgba(255,255,255,0.1)" />
        </svg>

        {homeNodes.map((node) => (
          <PitchPlayerMarker key={`home-${node.player.playerId}`} node={node} />
        ))}
        {awayNodes.map((node) => (
          <PitchPlayerMarker key={`away-${node.player.playerId}`} node={node} />
        ))}
      </div>

      <div className="postgame-pitch-card__legend">
        {locale === "zh"
          ? "球场视图按赛后首发阵容生成，评分徽标来自本场球员评分。"
          : "Pitch view is generated from the starting XI, with rating badges from post-match player ratings."}
      </div>
    </div>
  );
}

function PitchPlayerMarker({
  node,
}: {
  node: ReturnType<typeof buildPitchNodes>[number];
}) {
  return (
    <div
      className={`postgame-pitch__marker postgame-pitch__marker--${node.side}`}
      style={{ "--x": `${node.x}%`, "--y": `${node.y}%` } as CSSProperties}
    >
      <div className="postgame-pitch__marker-body">
        <div className="postgame-pitch__shirt">{node.player.jerseyNumber ?? "—"}</div>
        {node.player.rating != null ? (
          <div className={`postgame-pitch__rating postgame-pitch__rating--${ratingTone(node.player.rating)}`}>
            {node.player.rating.toFixed(1)}
          </div>
        ) : null}
      </div>
      <div className="postgame-pitch__name">{shortName(node.player.name)}</div>
    </div>
  );
}

function TimelineCard({
  match,
  timeline,
  homeTeam,
  awayTeam,
  locale,
}: {
  match: MatchRecord;
  timeline: NonNullable<MatchRecord["postgame"]>["timeline"];
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
  locale: Locale;
}) {
  const rows = buildTimelineRows(timeline, match, homeTeam, awayTeam);

  return (
    <div className="info-card">
      <div className="info-card__title">
        {locale === "zh" ? "比赛时间线" : "Match timeline"}
      </div>
      <div className="timeline-feed">
        {rows.map((row, index) =>
          row.type === "break" ? (
            <div className="timeline-feed__break" key={`break-${index}`}>
              <span>{row.label}</span>
            </div>
          ) : (
            <div
              className={`timeline-feed__event timeline-feed__event--${row.side}`}
              key={row.event.id}
            >
              <div className="timeline-feed__lane timeline-feed__lane--home">
                {row.side === "home" ? (
                  <TimelineEventCard event={row.event} team={homeTeam} align="home" />
                ) : null}
              </div>

              <div className="timeline-feed__center">
                <span className={`minute-badge minute-badge--${row.event.kind}`}>
                  {row.event.minuteLabel}
                </span>
                <span className={`timeline-feed__dot timeline-feed__dot--${row.event.kind}`} />
              </div>

              <div className="timeline-feed__lane timeline-feed__lane--away">
                {row.side === "away" ? (
                  <TimelineEventCard event={row.event} team={awayTeam} align="away" />
                ) : null}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function TimelineEventCard({
  event,
  team,
  align,
}: {
  event: NonNullable<MatchRecord["postgame"]>["timeline"][number];
  team: TeamRecord;
  align: "home" | "away";
}) {
  return (
    <div className={`timeline-card timeline-card--${align}`}>
      <div className="timeline-card__title">
        <span>{event.title}</span>
        <span className="timeline-card__team">{team.shortName}</span>
      </div>
      {event.detail ? <div className="timeline-card__detail">{event.detail}</div> : null}
      {event.secondary ? <div className="timeline-card__detail">{event.secondary}</div> : null}
    </div>
  );
}

function TopPlayersCard({
  team,
  players,
  locale,
}: {
  team: TeamRecord;
  players: MatchPlayerPerformance[];
  locale: Locale;
}) {
  const topPlayers = [...players]
    .sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0))
    .slice(0, 5);

  return (
    <div className="info-card">
      <div className="info-card__title">
        {team.name} · {locale === "zh" ? "赛后表现" : "Top performers"}
      </div>
      <div className="simple-stack">
        {topPlayers.map((player) => (
          <PlayerPerformanceRow key={`${team.id}-top-${player.playerId}`} player={player} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function PlayerPerformanceRow({
  player,
  locale,
}: {
  player: MatchPlayerPerformance;
  locale: Locale;
}) {
  const metaBits = [
    player.isCaptain ? (locale === "zh" ? "队长" : "Captain") : null,
    player.subbedInAt != null
      ? locale === "zh"
        ? `${player.subbedInAt}' 替补登场`
        : `On ${player.subbedInAt}'`
      : null,
    player.subbedOutAt != null
      ? locale === "zh"
        ? `${player.subbedOutAt}' 被换下`
        : `Off ${player.subbedOutAt}'`
      : null,
  ].filter(Boolean);
  const summaryBits = [
    player.minutesPlayed ? `${player.minutesPlayed}'` : null,
    player.goals ? `${player.goals}${locale === "zh" ? "球" : " G"}` : null,
    player.assists ? `${player.assists}${locale === "zh" ? "助" : " A"}` : null,
    player.shotsOn != null ? `${player.shotsOn}/${player.shotsTotal ?? player.shotsOn} ${locale === "zh" ? "射正" : "shots"}` : null,
    player.passesAccuracy != null
      ? `${player.passesAccuracy}/${player.passesTotal ?? player.passesAccuracy} ${locale === "zh" ? "传球" : "passes"}`
      : null,
    player.yellowCards ? (locale === "zh" ? "黄牌" : "Yellow") : null,
    player.redCards ? (locale === "zh" ? "红牌" : "Red") : null,
  ].filter(Boolean);

  return (
    <div className="player-performance-row">
      <div className="player-performance-row__main">
        <div className="player-performance-row__title">
          <span className="player-performance-row__identity">
            <PlayerAvatar playerId={player.playerId} name={player.name} />
            <span>{player.jerseyNumber != null ? `${player.jerseyNumber} ` : ""}{player.name}</span>
          </span>
          <span className="player-performance-row__position">
            {formatPosition(player.position)}
          </span>
        </div>
        {metaBits.length ? (
          <div className="player-performance-row__meta">{metaBits.join(" · ")}</div>
        ) : null}
        {summaryBits.length ? (
          <div className="player-performance-row__summary">{summaryBits.join(" · ")}</div>
        ) : null}
      </div>
      <div className="player-performance-row__rating">
        {player.rating != null ? player.rating.toFixed(1) : "—"}
      </div>
    </div>
  );
}

function PlayerAvatar({
  playerId,
  name,
}: {
  playerId: number;
  name: string;
}) {
  return (
    <span className="player-avatar" aria-hidden="true">
      <img
        className="player-avatar__image"
        src={`https://pub-37e90a160b6842ac9ab60cf44b39b380.r2.dev/players/${playerId}.png`}
        alt=""
      />
      <span className="player-avatar__fallback">{initials(name)}</span>
    </span>
  );
}

function InfoCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="info-card">
      <div className="info-card__title">{title}</div>
      <div className="info-card__body">{body}</div>
    </div>
  );
}

function MiniMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "fresh" | "tired" | "exhausted";
}) {
  return (
    <div className="mini-stat-card">
      <div className="mini-stat-card__label">{label}</div>
      <div className={`mini-stat-card__value mini-stat-card__value--${tone}`}>{value}</div>
    </div>
  );
}

function SummaryMetricCard({
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

function PossessionTimelineCard({
  postgame,
  homeTeam,
  awayTeam,
  locale,
}: {
  postgame: NonNullable<MatchRecord["postgame"]>;
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
  locale: Locale;
}) {
  const possession = findTeamStat(postgame.teamStats, "Possession");
  const homeValue = numericValue(possession?.home ?? "") ?? 50;
  const awayValue = numericValue(possession?.away ?? "") ?? 50;
  const points = buildPossessionTimeline(homeValue, awayValue);

  return (
    <div className="info-card">
      <div className="info-card__title">
        {locale === "zh" ? "控球率走势" : "Possession timeline"}
      </div>
      <div className="chart-card">
        <svg viewBox="0 0 320 86" className="chart-card__svg" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="43" x2="320" y2="43" className="chart-card__axis" />
          <line x1="160" y1="12" x2="160" y2="74" className="chart-card__divider" />
          <polyline
            points={points.home}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={points.away}
            fill="none"
            stroke="var(--text-light)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="chart-card__legend">
          <span>{homeTeam.shortName} {possession?.home ?? "50%"}</span>
          <span>{locale === "zh" ? "半场" : "HT"}</span>
          <span>{awayTeam.shortName} {possession?.away ?? "50%"}</span>
        </div>
      </div>
    </div>
  );
}

function MomentumGraphCard({
  timeline,
  homeTeam,
  awayTeam,
  locale,
}: {
  timeline: NonNullable<MatchRecord["postgame"]>["timeline"];
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
  locale: Locale;
}) {
  const segments = buildMomentumSegments(timeline, homeTeam.id, awayTeam.id);

  return (
    <div className="info-card">
      <div className="info-card__title">
        {locale === "zh" ? "比赛势头" : "Momentum"}
      </div>
      <div className="momentum-card">
        <div className="momentum-card__bars">
          {segments.map((segment, index) => (
            <div className="momentum-card__item" key={`momentum-${index}`}>
              <div
                className={`momentum-card__bar momentum-card__bar--${segment.tone}`}
                style={{ height: `${Math.max(10, Math.abs(segment.value) * 18)}px` }}
              />
            </div>
          ))}
        </div>
        <div className="chart-card__legend">
          <span>{homeTeam.shortName}</span>
          <span>{locale === "zh" ? "势头图" : "Shot pressure"}</span>
          <span>{awayTeam.shortName}</span>
        </div>
      </div>
    </div>
  );
}

function PlayerOfMatchCard({
  postgame,
  teamMap,
  locale,
}: {
  postgame: NonNullable<MatchRecord["postgame"]>;
  teamMap: Map<string, TeamRecord>;
  locale: Locale;
}) {
  const bestPlayer = findBestRatedPlayer(postgame);

  if (!bestPlayer) {
    return (
      <InfoCard
        title={locale === "zh" ? "最佳球员" : "Player of the match"}
        body={locale === "zh" ? "球员评分同步后会显示最佳球员。" : "Top player will appear once ratings sync in."}
      />
    );
  }

  const team = teamMap.get(bestPlayer.teamId);
  const tags = [
    bestPlayer.goals ? `${bestPlayer.goals}${locale === "zh" ? "球" : " G"}` : null,
    bestPlayer.assists ? `${bestPlayer.assists}${locale === "zh" ? "助" : " A"}` : null,
    bestPlayer.shotsOn != null ? `${bestPlayer.shotsOn}/${bestPlayer.shotsTotal ?? bestPlayer.shotsOn} ${locale === "zh" ? "射正" : "shots"}` : null,
    bestPlayer.dribblesSuccess != null ? `${bestPlayer.dribblesSuccess}/${bestPlayer.dribblesAttempts ?? bestPlayer.dribblesSuccess} ${locale === "zh" ? "过人" : "dribbles"}` : null,
  ].filter(Boolean);

  return (
    <div className="info-card">
      <div className="info-card__title">
        {locale === "zh" ? "最佳球员" : "Player of the match"}
      </div>
      <div className="potm-card">
        <PlayerAvatar playerId={bestPlayer.playerId} name={bestPlayer.name} />
        <div className="potm-card__copy">
          <div className="potm-card__name">{bestPlayer.name}</div>
          <div className="potm-card__meta">
            {team?.name ?? "--"} · {formatPosition(bestPlayer.position)}
          </div>
          <div className="potm-card__tags">
            {tags.length
              ? tags.map((tag) => (
                  <span className="potm-card__tag" key={`${bestPlayer.playerId}-${tag}`}>
                    {tag}
                  </span>
                ))
              : (
                  <span className="potm-card__tag">{bestPlayer.minutesPlayed}'</span>
                )}
          </div>
        </div>
        <span className={`rating-badge rating-badge--${ratingTone(bestPlayer.rating ?? 0)}`}>
          {bestPlayer.rating?.toFixed(1) ?? "--"}
        </span>
      </div>
    </div>
  );
}

function MiniLineupFactsCard({
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  locale,
}: {
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
  homePlayers: MatchPlayerPerformance[];
  awayPlayers: MatchPlayerPerformance[];
  locale: Locale;
}) {
  const homeStarters = homePlayers.filter((item) => item.isStarter).slice(0, 11);
  const awayStarters = awayPlayers.filter((item) => item.isStarter).slice(0, 11);

  return (
    <div className="info-card">
      <div className="info-card__title">
        {locale === "zh" ? "阵型速览" : "Mini lineup pitch"}
      </div>
      <div className="facts-pitch">
        {buildPitchNodes(homeStarters, "home").map((node) => (
          <span
            key={`facts-home-${node.player.playerId}`}
            className="facts-pitch__marker facts-pitch__marker--home"
            style={{ "--x": `${node.x}%`, "--y": `${node.y}%` } as CSSProperties}
          >
            {node.player.jerseyNumber ?? "—"}
          </span>
        ))}
        {buildPitchNodes(awayStarters, "away").map((node) => (
          <span
            key={`facts-away-${node.player.playerId}`}
            className="facts-pitch__marker facts-pitch__marker--away"
            style={{ "--x": `${node.x}%`, "--y": `${node.y}%` } as CSSProperties}
          >
            {node.player.jerseyNumber ?? "—"}
          </span>
        ))}
      </div>
      <div className="chart-card__legend">
        <span>{homeTeam.shortName}</span>
        <span>{locale === "zh" ? "点击切到 Lineup 查看详情" : "Open Lineup for full details"}</span>
        <span>{awayTeam.shortName}</span>
      </div>
    </div>
  );
}

function StatComparisonRow({
  label,
  home,
  away,
}: {
  label: string;
  home: string;
  away: string;
}) {
  const homeValue = Math.max(0, numericValue(home) ?? 0);
  const awayValue = Math.max(0, numericValue(away) ?? 0);
  const maxValue = Math.max(homeValue, awayValue, 1);
  const homeWidth = Math.max(6, (homeValue / maxValue) * 100);
  const awayWidth = Math.max(6, (awayValue / maxValue) * 100);

  return (
    <div className="stat-bar-row">
      <div className={`home-val${homeValue > awayValue ? " bold-val" : ""}`}>{home}</div>
      <div className="bar-home">
        <div className="fill" style={{ width: `${homeWidth}%` }} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="bar-away">
        <div className="fill" style={{ width: `${awayWidth}%` }} />
      </div>
      <div className={`away-val${awayValue > homeValue ? " bold-val" : ""}`}>{away}</div>
    </div>
  );
}

function tabLabel(tab: MatchTab, locale: Locale, finished: boolean) {
  if (locale === "zh") {
    if (tab === "facts") return "Facts";
    if (tab === "lineup") return "Lineup";
    if (tab === "h2h") return "H2H";
    if (tab === "sonar") return finished ? "⚡ Sonar Review" : "⚡ Sonar";
    return "Stats";
  }

  if (tab === "sonar") {
    return finished ? "⚡ Sonar Review" : "⚡ Sonar";
  }

  if (tab === "facts") {
    return "Facts";
  }

  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function timeLabel(kickoffLabel: string) {
  const time = kickoffLabel.match(/\b\d{1,2}:\d{2}(?:\s?[AP]M)?\b/i)?.[0];
  return time ?? kickoffLabel;
}

function resultHeight(result: Result) {
  if (result === "W") return 40;
  if (result === "D") return 24;
  return 12;
}

function resultTone(result: Result) {
  if (result === "W") return "win";
  if (result === "D") return "draw";
  return "loss";
}

function conditionEdge(
  homeTeam: TeamRecord,
  awayTeam: TeamRecord,
  homeModel: TeamFatigueModel,
  awayModel: TeamFatigueModel,
  locale: Locale
) {
  const homeEnergy = homeModel.energy;
  const awayEnergy = awayModel.energy;

  if (Math.abs(homeEnergy - awayEnergy) < 8) {
    return locale === "zh" ? "状态接近" : "Level profile";
  }

  if (homeEnergy > awayEnergy) {
    return locale === "zh" ? `${homeTeam.shortName} 更充沛` : `${homeTeam.shortName} fresher`;
  }

  return locale === "zh" ? `${awayTeam.shortName} 更充沛` : `${awayTeam.shortName} fresher`;
}

function resolveTeamFatigueModel(
  match: MatchRecord,
  side: MatchSide,
  players: PlayerProfile[],
  isAway: boolean
): TeamFatigueModel {
  if (players.length) {
    return computeTeamTFI(players, {
      scheduleContext: scheduleContextFromMatchSide(match, side, isAway),
    });
  }

  const tfi = Math.max(0, Math.min(100, Math.round(side.fatigue)));
  return {
    tfi,
    energy: energyFromFatigue(tfi),
    level: fatigueLevel(tfi),
    avgSquadPfi: tfi,
    schedulePressure: Math.round(
      Math.min(
        100,
        side.matchDensity * 12 + Math.max(0, 4 - side.restDays) * 10 + Math.min(side.travelKm / 80, 18)
      )
    ),
    starters: 0,
    rotation: 0,
    bench: 0,
    highestPfiPlayer: side.keyFatigued[0]?.name,
    highestPfi: side.keyFatigued[0] ? tfi : undefined,
  };
}

function isFinishedMatch(match: MatchRecord) {
  return (match.status ?? "").toLowerCase() === "finished" || hasRecordedScore(match);
}

function statusText(match: MatchRecord, locale: Locale) {
  const label = fixtureStatusLabel(match);
  if (label === "FT") {
    return locale === "zh" ? "已结束" : "Full time";
  }
  if (label === "LIVE") {
    return locale === "zh" ? "进行中" : "Live";
  }
  return label;
}

function buildFinishedSummary(
  match: MatchRecord,
  homeTeam: TeamRecord,
  awayTeam: TeamRecord,
  locale: Locale
) {
  const score = fixtureScoreLabel(match);
  const winner =
    match.homeScore != null &&
    match.awayScore != null &&
    match.homeScore !== match.awayScore
      ? match.homeScore > match.awayScore
        ? homeTeam.name
        : awayTeam.name
      : null;

  if (locale === "zh") {
    return `${homeTeam.name} ${score} ${awayTeam.name}。${winner ? `${winner} 拿下比赛。` : "双方战平。"} ${buildKeyMoment(match.postgame?.timeline ?? [], homeTeam, awayTeam, locale)} ${buildKeyStat(match.postgame?.teamStats ?? [], homeTeam, awayTeam, locale)}`;
  }

  return `${homeTeam.name} ${score} ${awayTeam.name}. ${winner ? `${winner} won the match.` : "The match finished level."} ${buildKeyMoment(match.postgame?.timeline ?? [], homeTeam, awayTeam, locale)} ${buildKeyStat(match.postgame?.teamStats ?? [], homeTeam, awayTeam, locale)}`;
}

function buildKeyMoment(
  timeline: NonNullable<MatchRecord["postgame"]>["timeline"],
  homeTeam: TeamRecord,
  awayTeam: TeamRecord,
  locale: Locale
) {
  const goal = timeline.find((item) => item.kind === "goal");
  if (!goal) {
    return locale === "zh" ? "比赛进程相对平稳。" : "The match flow stayed relatively even.";
  }

  const team = goal.teamId === homeTeam.id ? homeTeam : awayTeam;
  return locale === "zh"
    ? `${goal.minuteLabel} ${team.name} 由 ${goal.title} 打入关键进球。`
    : `${goal.minuteLabel} ${team.name} struck through ${goal.title}.`;
}

function buildKeyStat(
  stats: NonNullable<MatchRecord["postgame"]>["teamStats"],
  homeTeam: TeamRecord,
  awayTeam: TeamRecord,
  locale: Locale
) {
  const possession = stats.find((item) => item.label.en === "Possession");
  const shots = stats.find((item) => item.label.en === "Shots");

  if (!possession && !shots) {
    return locale === "zh" ? "赛后技术统计仍在同步中。" : "Additional match stats are still syncing.";
  }

  if (locale === "zh") {
    return [
      possession ? `控球率 ${possession.home} - ${possession.away}` : null,
      shots ? `射门 ${shots.home} - ${shots.away}` : null,
    ]
      .filter(Boolean)
      .join("，");
  }

  return [
    possession ? `Possession ${possession.home} - ${possession.away}` : null,
    shots ? `Shots ${shots.home} - ${shots.away}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildPostgameFactMetrics(
  match: MatchRecord,
  postgame: NonNullable<MatchRecord["postgame"]>,
  homeTeam: TeamRecord,
  awayTeam: TeamRecord,
  locale: Locale
) {
  const possession = findTeamStat(postgame.teamStats, "Possession");
  const shots = findTeamStat(postgame.teamStats, "Shots");
  const bestPlayer = findBestRatedPlayer(postgame);

  return [
    {
      title: locale === "zh" ? "比分" : "Score",
      value: fixtureScoreLabel(match),
      note: matchWinnerLabel(match, homeTeam, awayTeam, locale),
    },
    {
      title: locale === "zh" ? "控球率" : "Possession",
      value: possession ? `${possession.home} - ${possession.away}` : "—",
      note: possession ? leaderNote(possession.home, possession.away, homeTeam, awayTeam, locale) : fallbackNote(locale),
    },
    {
      title: locale === "zh" ? "射门" : "Shots",
      value: shots ? `${shots.home} - ${shots.away}` : "—",
      note: shots ? leaderNote(shots.home, shots.away, homeTeam, awayTeam, locale) : fallbackNote(locale),
    },
    {
      title: locale === "zh" ? "最佳评分" : "Top rating",
      value: bestPlayer?.rating != null ? bestPlayer.rating.toFixed(1) : "—",
      note: bestPlayer ? bestPlayer.name : fallbackNote(locale),
    },
  ] as Array<{
    title: string;
    value: string;
    note: string;
    tone?: "fresh" | "tired" | "exhausted";
  }>;
}

function buildPostgameStatMetrics(
  postgame: NonNullable<MatchRecord["postgame"]>,
  homeTeam: TeamRecord,
  awayTeam: TeamRecord,
  locale: Locale
) {
  const possession = findTeamStat(postgame.teamStats, "Possession");
  const shots = findTeamStat(postgame.teamStats, "Shots");
  const passes = findTeamStat(postgame.teamStats, "Passes");
  const cards = findTeamStat(postgame.teamStats, "Yellow Cards") ?? findTeamStat(postgame.teamStats, "Cards");

  return [
    {
      title: locale === "zh" ? "控球率" : "Possession",
      value: possession ? `${possession.home} - ${possession.away}` : "—",
      note: possession ? leaderNote(possession.home, possession.away, homeTeam, awayTeam, locale) : fallbackNote(locale),
    },
    {
      title: locale === "zh" ? "射门" : "Shots",
      value: shots ? `${shots.home} - ${shots.away}` : "—",
      note: shots ? leaderNote(shots.home, shots.away, homeTeam, awayTeam, locale) : fallbackNote(locale),
    },
    {
      title: locale === "zh" ? "传球" : "Passes",
      value: passes ? `${passes.home} - ${passes.away}` : "—",
      note: passes ? leaderNote(passes.home, passes.away, homeTeam, awayTeam, locale) : fallbackNote(locale),
    },
    {
      title: locale === "zh" ? "黄牌" : "Cards",
      value: cards ? `${cards.home} - ${cards.away}` : "—",
      note: cards ? leaderNote(cards.home, cards.away, homeTeam, awayTeam, locale, true) : fallbackNote(locale),
    },
  ];
}

function buildComparisonRows(
  stats: NonNullable<MatchRecord["postgame"]>["teamStats"],
  locale: Locale
) {
  const preferredOrder = [
    "Possession",
    "Shots",
    "Shots on Target",
    "Corners",
    "Fouls",
    "Yellow Cards",
    "Passes",
    "Pass Accuracy",
    "Offsides",
    "Goalkeeper Saves",
  ];

  const rows = preferredOrder
    .map((label) => findTeamStat(stats, label))
    .filter((item): item is NonNullable<MatchRecord["postgame"]>["teamStats"][number] => Boolean(item))
    .map((item) => ({
      label: translateText(item.label, locale),
      home: item.home,
      away: item.away,
    }));

  return rows.length
    ? rows
    : stats.map((item) => ({
        label: translateText(item.label, locale),
        home: item.home,
        away: item.away,
      }));
}

function buildTimelineRows(
  timeline: NonNullable<MatchRecord["postgame"]>["timeline"],
  match: MatchRecord,
  homeTeam: TeamRecord,
  awayTeam: TeamRecord
) {
  const rows: Array<
    | { type: "break"; label: string }
    | {
        type: "event";
        side: "home" | "away";
        event: NonNullable<MatchRecord["postgame"]>["timeline"][number];
      }
  > = [];
  let insertedHalf = false;

  timeline.forEach((event) => {
    const minute = parseMinute(event.minuteLabel);
    if (!insertedHalf && minute != null && minute > 45) {
      rows.push({ type: "break", label: `HT ${scoreAtMinute(timeline, 45, homeTeam.id, awayTeam.id)}` });
      insertedHalf = true;
    }

    rows.push({
      type: "event",
      side: event.teamId === homeTeam.id ? "home" : "away",
      event,
    });
  });

  if (timeline.length && !insertedHalf) {
    rows.push({ type: "break", label: `HT ${scoreAtMinute(timeline, 45, homeTeam.id, awayTeam.id)}` });
  }

  rows.push({ type: "break", label: `FT ${fixtureScoreLabel(match)}` });
  return rows;
}

function scoreAtMinute(
  timeline: NonNullable<MatchRecord["postgame"]>["timeline"],
  limit: number,
  homeTeamId: string,
  awayTeamId: string
) {
  let home = 0;
  let away = 0;

  for (const event of timeline) {
    const minute = parseMinute(event.minuteLabel);
    if (event.kind !== "goal" || minute == null || minute > limit) {
      continue;
    }

    if (event.teamId === homeTeamId) {
      home += 1;
    } else if (event.teamId === awayTeamId) {
      away += 1;
    }
  }

  return `${home} - ${away}`;
}

function buildPitchNodes(
  players: MatchPlayerPerformance[],
  side: "home" | "away"
) {
  const starters = players.filter((item) => item.isStarter).slice(0, 11);
  const groups = {
    gk: starters.filter((item) => positionBucket(item.position) === "gk"),
    def: starters.filter((item) => positionBucket(item.position) === "def"),
    mid: starters.filter((item) => positionBucket(item.position) === "mid"),
    fwd: starters.filter((item) => positionBucket(item.position) === "fwd"),
  };

  const lineDefs =
    side === "home"
      ? [
          { x: 7, players: groups.gk },
          { x: 18, players: groups.def },
          { x: 31, players: groups.mid },
          { x: 44, players: groups.fwd },
        ]
      : [
          { x: 93, players: groups.gk },
          { x: 82, players: groups.def },
          { x: 69, players: groups.mid },
          { x: 56, players: groups.fwd },
        ];

  return lineDefs.flatMap((line) =>
    spreadY(line.players.length)
      .map((y, index) => {
        const player = line.players[index];
        if (!player) {
          return null;
        }

        return {
          player,
          side,
          x: line.x,
          y,
        };
      })
      .filter(
        (
          node
        ): node is {
          player: MatchPlayerPerformance;
          side: "home" | "away";
          x: number;
          y: number;
        } => node != null
      )
  );
}

function spreadY(count: number) {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [50];
  }

  const start = 16;
  const end = 84;
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(start + step * index));
}

function averagePlayerRating(players: MatchPlayerPerformance[]) {
  const ratings = players.map((item) => item.rating).filter((value): value is number => value != null);
  if (!ratings.length) {
    return null;
  }

  return ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
}

function inferFormation(players: MatchPlayerPerformance[]) {
  const starters = players.filter((item) => item.isStarter);
  const defenderCount = starters.filter((item) => positionBucket(item.position) === "def").length;
  const midfielderCount = starters.filter((item) => positionBucket(item.position) === "mid").length;
  const forwardCount = starters.filter((item) => positionBucket(item.position) === "fwd").length;

  if (!starters.length) {
    return "—";
  }

  return [defenderCount, midfielderCount, forwardCount].filter((value) => value > 0).join("-");
}

function positionBucket(position: string) {
  const key = position.toUpperCase();
  if (key.startsWith("G")) return "gk";
  if (key.startsWith("D")) return "def";
  if (key.startsWith("M")) return "mid";
  return "fwd";
}

function findTeamStat(
  stats: NonNullable<MatchRecord["postgame"]>["teamStats"],
  labelEn: string
) {
  return stats.find((item) => item.label.en.toLowerCase() === labelEn.toLowerCase());
}

function findBestRatedPlayer(postgame: NonNullable<MatchRecord["postgame"]>) {
  return [...postgame.homePlayers, ...postgame.awayPlayers]
    .filter((item) => item.rating != null)
    .sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0))[0];
}

function matchWinnerLabel(
  match: MatchRecord,
  homeTeam: TeamRecord,
  awayTeam: TeamRecord,
  locale: Locale
) {
  if (match.homeScore == null || match.awayScore == null || match.homeScore === match.awayScore) {
    return locale === "zh" ? "双方战平" : "Level result";
  }

  const winner = match.homeScore > match.awayScore ? homeTeam.shortName : awayTeam.shortName;
  return locale === "zh" ? `${winner} 获胜` : `${winner} won`;
}

function leaderNote(
  homeValue: string,
  awayValue: string,
  homeTeam: TeamRecord,
  awayTeam: TeamRecord,
  locale: Locale,
  reverse = false
) {
  const home = numericValue(homeValue);
  const away = numericValue(awayValue);

  if (home == null || away == null || home === away) {
    return locale === "zh" ? "两队接近" : "Even split";
  }

  const favorHome = reverse ? home < away : home > away;
  const leader = favorHome ? homeTeam.shortName : awayTeam.shortName;
  return locale === "zh" ? `${leader} 占优` : `${leader} edge`;
}

function fallbackNote(locale: Locale) {
  return locale === "zh" ? "等待同步" : "Syncing";
}

function numericValue(value: string) {
  const normalized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMinute(value: string) {
  const match = value.match(/\d+/);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[0], 10);
}

function formatPosition(position: string) {
  const key = position.toUpperCase();
  if (key.startsWith("G")) return "GK";
  if (key.startsWith("D")) return "DEF";
  if (key.startsWith("M")) return "MID";
  if (key.startsWith("F")) return "FWD";
  return key;
}

function shortName(name: string) {
  return name.split(" ").slice(-1)[0] ?? name;
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
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");
}

function buildPossessionTimeline(home: number, away: number) {
  const homeShift = (home - 50) * 0.45;
  const awayShift = (away - 50) * 0.45;
  const points = [0, 52, 104, 156, 208, 260, 320].map((x, index) => {
    const wave = Math.sin(index * 1.05) * 6;
    return {
      x,
      homeY: 43 - homeShift - wave,
      awayY: 43 + awayShift + wave,
    };
  });

  return {
    home: points.map((point) => `${point.x},${point.homeY.toFixed(1)}`).join(" "),
    away: points.map((point) => `${point.x},${point.awayY.toFixed(1)}`).join(" "),
  };
}

function buildMomentumSegments(
  timeline: NonNullable<MatchRecord["postgame"]>["timeline"],
  homeTeamId: string,
  awayTeamId: string
) {
  return Array.from({ length: 6 }, (_, index) => {
    const start = index * 15;
    const end = start + 15;
    const events = timeline.filter((event) => {
      const minute = parseMinute(event.minuteLabel);
      return minute != null && minute > start && minute <= end;
    });
    const value = events.reduce((sum, event) => {
      const magnitude =
        event.kind === "goal"
          ? 2.8
          : event.kind === "substitution"
            ? 1.1
            : event.kind === "card"
              ? 0.8
              : 0.6;
      return sum + (event.teamId === homeTeamId ? magnitude : event.teamId === awayTeamId ? -magnitude : 0);
    }, 0);

    return {
      value,
      tone: value >= 0 ? "home" : "away",
    };
  });
}
