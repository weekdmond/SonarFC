"use client";

import Link from "next/link";
import { useState } from "react";

import { EntityMark } from "@/components/entity-mark";
import { useAppPreferences } from "@/components/preferences-provider";
import { messages, translateText } from "@/lib/i18n";
import { energyBand, energyScore, formatDistance } from "@/lib/sonar";
import type {
  CompetitionRecord,
  Locale,
  MatchRecord,
  MatchSide,
  Result,
  TeamRecord,
} from "@/lib/types";

type MatchTab = "preview" | "lineup" | "h2h" | "sonar" | "stats";

const MATCH_TABS: MatchTab[] = ["preview", "lineup", "h2h", "sonar", "stats"];

export function MatchDetailScreen({
  match,
  matches,
  competitions,
  teams,
}: {
  match: MatchRecord;
  matches: MatchRecord[];
  competitions: CompetitionRecord[];
  teams: TeamRecord[];
}) {
  const [activeTab, setActiveTab] = useState<MatchTab>("sonar");
  const { locale } = useAppPreferences();
  const copy = messages[locale];
  const competitionMap = new Map(competitions.map((item) => [item.id, item]));
  const teamMap = new Map(teams.map((item) => [item.id, item]));
  const competition = competitionMap.get(match.competitionId);
  const homeTeam = teamMap.get(match.home.teamId);
  const awayTeam = teamMap.get(match.away.teamId);

  if (!competition || !homeTeam || !awayTeam) {
    return null;
  }

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="match-detail-header">
          <div className="match-detail-meta">
            {translateText(competition.name, locale)} · {match.stage} · {match.kickoffLabel}
          </div>

          <div className="match-detail-teams">
            <MatchDetailTeam team={homeTeam} href={`/team/${homeTeam.slug}`} />
            <div className="match-detail-vs">{timeLabel(match.kickoffLabel)}</div>
            <MatchDetailTeam team={awayTeam} href={`/team/${awayTeam.slug}`} />
          </div>

          <div className="match-detail-meta">{match.venue}</div>
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
              {tabLabel(tab, locale)}
            </button>
          ))}
        </div>

        <div className="sonar-panel">
          {activeTab === "sonar" ? (
            <>
              <div className="sonar-section">
                <div className="sonar-section-title">
                  {locale === "zh" ? "Team Status Comparison" : "Team Status Comparison"}
                </div>

                <div className="sonar-compare-grid">
                  <MatchSonarColumn
                    team={homeTeam}
                    side={match.home}
                    locale={locale}
                    align="left"
                  />
                  <div className="fatigue-vs">{conditionEdge(match, homeTeam, awayTeam, locale)}</div>
                  <MatchSonarColumn
                    team={awayTeam}
                    side={match.away}
                    locale={locale}
                    align="right"
                  />
                </div>
              </div>

              <div className="sonar-section">
                <div className="sonar-section-title">
                  {locale === "zh" ? "Schedule Density" : "Schedule Density"}
                </div>
                <div className="sonar-schedule-grid">
                  <ScheduleStrip team={homeTeam} side={match.home} locale={locale} />
                  <ScheduleStrip team={awayTeam} side={match.away} locale={locale} />
                </div>
              </div>

              <div className="sonar-section">
                <div className="sonar-section-title">
                  {locale === "zh" ? "AI Pre-match Analysis" : "AI Pre-match Analysis"}
                </div>
                <div className="ai-summary">
                  <div className="ai-summary-label">⚡ Sonar AI</div>
                  {translateText(match.verdict, locale)} {translateText(match.spotlight, locale)}{" "}
                  {translateText(match.home.aiSummary, locale)}{" "}
                  {translateText(match.away.aiSummary, locale)}
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "preview" ? (
            <div className="simple-stack">
              <InfoCard
                title={locale === "zh" ? "核心结论" : "Key takeaway"}
                body={`${translateText(match.verdict, locale)} ${translateText(match.spotlight, locale)}`}
              />
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
            </div>
          ) : null}

          {activeTab === "lineup" ? (
            <div className="info-grid info-grid--two">
              <LineupCard team={homeTeam} side={match.home} locale={locale} />
              <LineupCard team={awayTeam} side={match.away} locale={locale} />
            </div>
          ) : null}

          {activeTab === "h2h" ? (
            <div className="info-grid info-grid--two">
              <HistoryCard team={homeTeam} side={match.home} locale={locale} />
              <HistoryCard team={awayTeam} side={match.away} locale={locale} />
            </div>
          ) : null}

          {activeTab === "stats" ? (
            <div className="stats-compare-table">
              {[
                {
                  label: locale === "zh" ? "Energy" : "Energy",
                  home: `${energyScore(match.home.fatigue)}`,
                  away: `${energyScore(match.away.fatigue)}`,
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

function MatchSonarColumn({
  team,
  side,
  locale,
  align,
}: {
  team: TeamRecord;
  side: MatchSide;
  locale: Locale;
  align: "left" | "right";
}) {
  const energy = energyScore(side.fatigue);
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
          <span>{locale === "zh" ? "Energy" : "Energy"}</span>
          <span className={`energy-block__value energy-block__value--${band}`}>{energy}/100</span>
        </div>
        <div className="energy-block__bar">
          <div className={`energy-block__fill energy-block__fill--${band}`} style={{ width: `${energy}%` }} />
          <div className="energy-block__label">Fatigue: {side.fatigue}</div>
        </div>
      </div>

      <div className="summary-metric-grid">
        <MiniMetricCard
          label={locale === "zh" ? "Squad" : "Squad"}
          value={`${side.squadAvailability}%`}
          tone={energyBand(side.squadAvailability)}
        />
        <MiniMetricCard
          label={locale === "zh" ? "14d Matches" : "14d Matches"}
          value={`${side.matchDensity}`}
          tone={side.matchDensity >= 5 ? "exhausted" : side.matchDensity >= 3 ? "tired" : "fresh"}
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

function tabLabel(tab: MatchTab, locale: Locale) {
  if (locale === "zh") {
    if (tab === "preview") return "Preview";
    if (tab === "lineup") return "Lineup";
    if (tab === "h2h") return "H2H";
    if (tab === "sonar") return "⚡ Sonar";
    return "Stats";
  }

  if (tab === "sonar") {
    return "⚡ Sonar";
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
  match: MatchRecord,
  homeTeam: TeamRecord,
  awayTeam: TeamRecord,
  locale: Locale
) {
  const homeEnergy = energyScore(match.home.fatigue);
  const awayEnergy = energyScore(match.away.fatigue);

  if (Math.abs(homeEnergy - awayEnergy) < 8) {
    return locale === "zh" ? "状态接近" : "Level profile";
  }

  if (homeEnergy > awayEnergy) {
    return locale === "zh" ? `${homeTeam.shortName} 更充沛` : `${homeTeam.shortName} fresher`;
  }

  return locale === "zh" ? `${awayTeam.shortName} 更充沛` : `${awayTeam.shortName} fresher`;
}
