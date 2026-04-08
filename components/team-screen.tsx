"use client";

import Link from "next/link";
import { useState } from "react";

import { EntityMark } from "@/components/entity-mark";
import {
  buildSeasonStandings,
  fixtureScoreLabel,
  fixtureStatusLabel,
} from "@/lib/match-logic";
import { useAppPreferences } from "@/components/preferences-provider";
import { translateText } from "@/lib/i18n";
import { energyBand, energyScore, formatDistance } from "@/lib/sonar";
import type { CompetitionRecord, MatchRecord, PlayerProfile, Result, TeamRecord } from "@/lib/types";

type TeamTab = "overview" | "matches" | "energy" | "stats" | "transfers";

const TEAM_TABS: TeamTab[] = ["overview", "matches", "energy", "stats", "transfers"];

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
  const [activeTab, setActiveTab] = useState<TeamTab>("energy");
  const { locale } = useAppPreferences();
  const teamMap = new Map(teams.map((item) => [item.id, item]));
  const sortedPlayers = [...players].sort((a, b) => energyScore(a.fatigueScore) - energyScore(b.fatigueScore));
  const teamEnergy = computeTeamEnergy(matches, players);
  const competition = matches.length
    ? competitions.find((item) => item.id === matches[0].competitionId)
    : undefined;
  const standing = competition
    ? buildTeamStanding(competitionMatches, teams, team.id)
    : undefined;
  const unavailable = collectUnavailable(matches);

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="team-hero">
          <EntityMark value={team.badge} label={team.name} className="team-hero__badge" />
          <div className="team-hero__content">
            <div className="team-hero__title">{team.name}</div>
            <div className="team-hero__meta">
              {competition ? (
                <>
                  <EntityMark
                    value={competition.icon}
                    label={translateText(competition.name, locale)}
                    className="league-icon league-icon--small"
                  />
                  <span>{translateText(competition.name, locale)}</span>
                  {standing ? (
                    <>
                      <span>·</span>
                      <span>
                        {positionLabel(locale, standing.position)}
                        {locale === "zh" ? " · " : " · "}
                        {standing.points}
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
          <div className="player-hero__energy">
            <div className="player-hero__energy-label">Team Energy</div>
            <div className={`player-hero__energy-value player-hero__energy-value--${energyBand(teamEnergy)}`}>
              {teamEnergy}
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
              {teamTabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="sonar-panel">
          {activeTab === "overview" ? (
            <div className="info-grid info-grid--two">
              <InfoCard
                title={locale === "zh" ? "下一场比赛" : "Next fixture"}
                body={
                  matches[0]
                    ? `${timeLabel(matches[0].kickoffLabel)} · ${matches[0].stage}`
                    : locale === "zh"
                      ? "暂无赛程"
                      : "No upcoming fixture"
                }
              />
              <InfoCard
                title={locale === "zh" ? "近况摘要" : "Condition snapshot"}
                body={
                  locale === "zh"
                    ? `${players.length} 名球员可用作阵容样本，当前球队能量值 ${teamEnergy}。`
                    : `${players.length} player samples available, with a current team energy score of ${teamEnergy}.`
                }
              />
            </div>
          ) : null}

          {activeTab === "matches" ? (
            <div className="simple-stack">
              {matches.map((match) => (
                <Link className="match-row team-match-row" href={`/match/${match.slug}`} key={match.id}>
                  <span className="match-time">{fixtureStatusLabel(match)}</span>
                  <span className="team-name home">
                    <span>{team.name}</span>
                    <EntityMark value={team.badge} label={team.name} className="team-badge" />
                  </span>
                  <span className="match-score">
                    <span className="vs">{fixtureScoreLabel(match)}</span>
                  </span>
                  <span className="team-name away">
                    <EntityMark
                      value={
                        (match.home.teamId === team.id
                          ? teamMap.get(match.away.teamId)
                          : teamMap.get(match.home.teamId))?.badge ?? "OP"
                      }
                      label="Opponent"
                      className="team-badge"
                    />
                    <span>
                      {(match.home.teamId === team.id
                        ? teamMap.get(match.away.teamId)
                        : teamMap.get(match.home.teamId))?.name ?? "Opponent"}
                    </span>
                  </span>
                  <span className="match-row__favorite">☆</span>
                </Link>
              ))}
            </div>
          ) : null}

          {activeTab === "energy" ? (
            <>
              <div className="section-lead">
                <div className="sonar-section-title">
                  {locale === "zh" ? "Squad Energy Overview" : "Squad Energy Overview"}
                </div>
                <div className="section-lead__note">
                  {locale === "zh"
                    ? "沿用原型的能量卡片密度，先快速判断球员是否需要轮换。"
                    : "Prototype-style squad cards that make rotation pressure readable at a glance."}
                </div>
              </div>
              <div className="team-player-grid">
                {sortedPlayers.slice(0, 8).map((player) => {
                  const playerEnergy = energyScore(player.fatigueScore);
                  const band = energyBand(playerEnergy);

                  return (
                    <Link href={`/player/${player.slug}`} className={`team-player-card team-player-card--${band}`} key={player.slug}>
                      <div className="team-player-card__header">
                        <div className="team-player-card__name">{player.name}</div>
                        <div className={`team-player-card__score team-player-card__score--${band}`}>
                          {playerEnergy}
                        </div>
                      </div>
                      <div className="team-player-card__meta">
                        {player.position} · {player.last14Minutes}min/14d · {player.age}y
                      </div>
                      <div className="team-player-card__bar">
                        <div
                          className={`team-player-card__bar-fill team-player-card__bar-fill--${band}`}
                          style={{ width: `${playerEnergy}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="sonar-section" style={{ marginTop: 24 }}>
                <div className="sonar-section-title">{locale === "zh" ? "Unavailable" : "Unavailable"}</div>
                <div className="list-stack">
                  {unavailable.length ? (
                    unavailable.map((item) => (
                      <div className="list-row" key={item}>
                        <div className="list-row__dot list-row__dot--danger" />
                        <div className="list-row__content">
                          <div className="list-row__title">{item}</div>
                          <div className="list-row__meta">
                            {locale === "zh" ? "Squad status watch" : "Squad status watch"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flat-empty">{locale === "zh" ? "暂无缺阵提醒" : "No absences flagged"}</div>
                  )}
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "stats" ? (
            <div className="info-grid info-grid--three">
              <InfoCard
                title={locale === "zh" ? "Sample Size" : "Sample Size"}
                body={`${players.length} players`}
              />
              <InfoCard
                title={locale === "zh" ? "Average Energy" : "Average Energy"}
                body={`${teamEnergy}`}
              />
              <InfoCard
                title={locale === "zh" ? "Travel Load" : "Travel Load"}
                body={
                  matches[0]
                    ? formatDistance((matches[0].home.teamId === team.id ? matches[0].home : matches[0].away).travelKm)
                    : "0 km"
                }
              />
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

function computeTeamEnergy(matches: MatchRecord[], players: PlayerProfile[]) {
  if (players.length) {
    const total = players.reduce((sum, player) => sum + energyScore(player.fatigueScore), 0);
    return Math.round(total / players.length);
  }

  if (matches.length) {
    const latest = matches[0];
    return Math.round((energyScore(latest.home.fatigue) + energyScore(latest.away.fatigue)) / 2);
  }

  return 50;
}

function buildTeamStanding(
  matches: MatchRecord[],
  teams: TeamRecord[],
  targetTeamId: string
) {
  const ordered = buildSeasonStandings(
    matches,
    new Map(teams.map((team) => [team.id, team]))
  ).map((item) => ({
    teamId: item.team.id,
    points: item.points,
    goalDiff: item.goalDiff,
  }));

  const position = ordered.findIndex((item) => item.teamId === targetTeamId);
  const row = ordered[position];

  if (!row) {
    return undefined;
  }

  return {
    position: position + 1,
    points: row.points,
  };
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

function teamTabLabel(tab: TeamTab) {
  switch (tab) {
    case "overview":
      return "Overview";
    case "matches":
      return "Matches";
    case "energy":
      return "Squad Energy";
    case "stats":
      return "Stats";
    case "transfers":
      return "Transfers";
  }
}

function positionLabel(locale: "zh" | "en", position: number) {
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

function timeLabel(kickoffLabel: string) {
  const time = kickoffLabel.match(/\b\d{1,2}:\d{2}(?:\s?[AP]M)?\b/i)?.[0];
  return time ?? kickoffLabel;
}
