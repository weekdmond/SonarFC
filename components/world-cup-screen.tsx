"use client";

import Link from "next/link";
import { useState } from "react";

import { EntityMark } from "@/components/entity-mark";
import { fixtureScoreLabel, fixtureStatusLabel } from "@/lib/match-logic";
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

type WorldCupTab = "squad" | "travel" | "recovery" | "groups" | "matches";

const WORLD_CUP_TABS: WorldCupTab[] = ["squad", "travel", "recovery", "groups", "matches"];

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
  const [activeTab, setActiveTab] = useState<WorldCupTab>("squad");
  const { locale } = useAppPreferences();
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="worldcup-hero">
          <div className="worldcup-hero__title">{translateText(competition.name, locale)}</div>
          <div className="worldcup-hero__meta">USA / Canada / Mexico · June 11 - July 19</div>
          <div className="worldcup-hero__stats">
            <div>
              <div className="worldcup-hero__value">48</div>
              <div className="worldcup-hero__label">Teams</div>
            </div>
            <div>
              <div className="worldcup-hero__value">104</div>
              <div className="worldcup-hero__label">Matches</div>
            </div>
            <div>
              <div className="worldcup-hero__value">16</div>
              <div className="worldcup-hero__label">Venues</div>
            </div>
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
              {worldCupTabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="sonar-panel">
          {activeTab === "squad" ? (
            <div className="simple-stack">
              <SectionLead
                title={
                  locale === "zh"
                    ? "National Team Season Workload (Top Players)"
                    : "National Team Season Workload (Top Players)"
                }
                note={
                  locale === "zh"
                    ? "把俱乐部赛季末的负荷折算到国家队层级，优先找出最需要恢复窗口的球队。"
                    : "Aggregated club-season load translated into national-team readiness, highlighting who most needs recovery time."
                }
              />
              <div className="list-stack">
                {worldCupTeams.map((profile, index) => {
                  const team = teamMap.get(profile.teamId);
                  if (!team) return null;
                  const squadEnergy = worldCupEnergy(profile);
                  const band = energyBand(squadEnergy);

                  return (
                    <Link href={`/team/${team.slug}`} className="rank-card" key={profile.teamId}>
                      <div className="rank-card__index">{index + 1}</div>
                      <div className="rank-card__main">
                        <div className="rank-card__title inline-mark">
                          <EntityMark value={team.badge} label={team.name} className="team-badge" />
                          <span>{team.name}</span>
                        </div>
                        <div className="rank-card__meta">
                          {locale === "zh"
                            ? `${profile.keyRiskCount}/23 高风险球员 · 俱乐部负荷 ${profile.clubMinutesIndex}`
                            : `${profile.keyRiskCount}/23 high-risk players · Club-load index ${profile.clubMinutesIndex}`}
                        </div>
                      </div>
                      <div className="rank-card__score">
                        <div className={`rank-card__score-value rank-card__score-value--${band}`}>
                          {squadEnergy}
                        </div>
                        <div className="rank-card__score-bar">
                          <div
                            className={`rank-card__score-fill rank-card__score-fill--${band}`}
                            style={{ width: `${squadEnergy}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeTab === "travel" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Group Stage Travel Distance" : "Group Stage Travel Distance"}
                note={
                  locale === "zh"
                    ? "原型里的 travel 模块重点看总旅程、城市切换和时区压力。"
                    : "The travel module emphasizes total distance, city switches and timezone pressure."
                }
              />
              <div className="info-grid info-grid--two">
                {worldCupTeams.map((profile) => {
                  const team = teamMap.get(profile.teamId);
                  if (!team) return null;

                  return (
                    <InfoCard
                      key={profile.teamId}
                      title={team.name}
                      body={`${formatDistance(profile.travelKm)} · ${profile.travelLegs
                        .map((leg) => `${leg.from} → ${leg.to}`)
                        .join(" / ")}`}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeTab === "recovery" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Group Stage Recovery Analysis" : "Group Stage Recovery Analysis"}
                note={
                  locale === "zh"
                    ? "恢复页不是单看休息天数，而是把间隔、旅程和赛季末疲劳放到同一条线上。"
                    : "Recovery is framed as the combination of gaps, travel and season-end fatigue rather than rest days alone."
                }
              />
              {worldCupTeams.slice(0, 3).map((profile) => {
                const team = teamMap.get(profile.teamId);
                if (!team) return null;

                return (
                  <div className="recovery-card" key={profile.teamId}>
                    <div className="recovery-card__title inline-mark">
                      <EntityMark value={team.badge} label={team.name} className="team-badge" />
                      <span>{team.name}</span>
                    </div>
                    <div className="recovery-card__timeline">
                      {profile.recoveryMatrix.map((item, index) => (
                        <div className="recovery-card__step" key={`${team.id}-${item.opponent}-${index}`}>
                          <div className="recovery-card__step-date">{item.city}</div>
                          <div className="recovery-card__step-main">
                            {team.shortName} vs {item.opponent}
                          </div>
                          <div className="recovery-card__step-note">{item.daysBetween} days</div>
                        </div>
                      ))}
                    </div>
                    <div className="ai-summary">
                      <div className="ai-summary-label">⚡ Sonar AI</div>
                      {translateText(profile.outlook, locale)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {activeTab === "groups" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Groups" : "Groups"}
                note={
                  locale === "zh"
                    ? "小组页继续保持简洁列表，但把能量值放在最右侧，方便快速比较。"
                    : "Groups stay intentionally simple, with the energy value pinned to the right for quick scanning."
                }
              />
              <div className="info-grid info-grid--two">
                {groupWorldCupTeams(worldCupTeams).map((group) => (
                  <div className="info-card" key={group.group}>
                    <div className="info-card__title">Group {group.group}</div>
                    <div className="group-list">
                      {group.teams.map((profile) => {
                        const team = teamMap.get(profile.teamId);
                        if (!team) return null;

                        return (
                          <Link href={`/team/${team.slug}`} className="group-list__item" key={profile.teamId}>
                            <span className="inline-mark">
                              <EntityMark value={team.badge} label={team.name} className="team-badge" />
                              <span>{team.name}</span>
                            </span>
                            <span className={`group-list__energy group-list__energy--${energyBand(worldCupEnergy(profile))}`}>
                              {worldCupEnergy(profile)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "matches" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Matches" : "Matches"}
                note={
                  locale === "zh"
                    ? "比赛列表与首页保持同一节奏，让世界杯页看起来也像同一产品。"
                    : "Match rows keep the same rhythm as the homepage so the World Cup hub still feels like the same product."
                }
              />
              {matches.length ? (
                matches.map((match) => (
                  <CompetitionMatchRow
                    key={match.id}
                    match={match}
                    homeTeam={teamMap.get(match.home.teamId)}
                    awayTeam={teamMap.get(match.away.teamId)}
                  />
                ))
              ) : (
                <div className="flat-empty">
                  {newsItems[0] ? translateText(newsItems[0].summary, locale) : "No match data yet."}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionLead({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <div className="section-lead">
      <div className="sonar-section-title">{title}</div>
      {note ? <div className="section-lead__note">{note}</div> : null}
    </div>
  );
}

function CompetitionMatchRow({
  match,
  homeTeam,
  awayTeam,
}: {
  match: MatchRecord;
  homeTeam?: TeamRecord;
  awayTeam?: TeamRecord;
}) {
  if (!homeTeam || !awayTeam) {
    return null;
  }

  return (
    <Link className="match-row worldcup-match-row" href={`/match/${match.slug}`}>
      <span className="match-time">{fixtureStatusLabel(match)}</span>
      <span className="team-name home">
        <span>{homeTeam.name}</span>
        <EntityMark value={homeTeam.badge} label={homeTeam.name} className="team-badge" />
      </span>
      <span className="match-score">
        <span className="vs">{fixtureScoreLabel(match)}</span>
      </span>
      <span className="team-name away">
        <EntityMark value={awayTeam.badge} label={awayTeam.name} className="team-badge" />
        <span>{awayTeam.name}</span>
      </span>
      <span className="match-row__favorite">☆</span>
    </Link>
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

function worldCupTabLabel(tab: WorldCupTab) {
  switch (tab) {
    case "squad":
      return "Squad Load";
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

function worldCupEnergy(profile: WorldCupTeamProfile) {
  return Math.max(18, Math.min(78, 88 - Math.round(profile.clubMinutesIndex * 0.7) - profile.keyRiskCount * 4));
}

function groupWorldCupTeams(worldCupTeams: WorldCupTeamProfile[]) {
  const groups = new Map<string, WorldCupTeamProfile[]>();

  for (const profile of worldCupTeams) {
    groups.set(profile.group, [...(groups.get(profile.group) ?? []), profile]);
  }

  return [...groups.entries()].map(([group, teams]) => ({ group, teams }));
}
