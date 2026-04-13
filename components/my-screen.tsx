"use client";

import Link from "next/link";

import { EntityMark } from "@/components/entity-mark";
import { MyControlsBar } from "@/components/my-controls-bar";
import { useAppPreferences } from "@/components/preferences-provider";
import { messages, translateText } from "@/lib/i18n";
import type { CompetitionRecord, MatchRecord, TeamRecord } from "@/lib/types";

export function MyScreen({
  competitions,
  matches,
  teams,
}: {
  competitions: CompetitionRecord[];
  matches: MatchRecord[];
  teams: TeamRecord[];
}) {
  const {
    locale,
    followedTeams,
    followedCompetitions,
    notifications,
    toggleTeam,
    toggleCompetition,
    setNotification,
  } = useAppPreferences();
  const copy = messages[locale];
  const competitionMap = new Map(competitions.map((competition) => [competition.id, competition]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const followedMatches = [...matches]
    .filter(
      (match) => followedTeams.includes(match.home.teamId) || followedTeams.includes(match.away.teamId)
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 8);

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="page-block-header">
          <div className="page-block-header__title">{copy.my.title}</div>
          <div className="page-block-header__meta">{copy.my.description}</div>
        </div>

        <MyControlsBar active="my" />

        <div className="sonar-panel">
          <div className="info-grid info-grid--two">
            <div className="info-card">
              <div className="info-card__title">{copy.my.followedTeams}</div>
              <div className="chip-grid">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    className={`toggle-chip${followedTeams.includes(team.id) ? " toggle-chip--active" : ""}`}
                    onClick={() => toggleTeam(team.id)}
                  >
                    <EntityMark value={team.badge} label={team.name} className="team-badge" /> {team.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="info-card">
              <div className="info-card__title">{copy.my.followedCompetitions}</div>
              <div className="chip-grid">
                {competitions.map((competition) => (
                  <button
                    key={competition.id}
                    type="button"
                    className={`toggle-chip${
                      followedCompetitions.includes(competition.id) ? " toggle-chip--active" : ""
                    }`}
                    onClick={() => toggleCompetition(competition.id)}
                  >
                    <EntityMark
                      value={competition.icon}
                      label={translateText(competition.name, locale)}
                      className="league-icon league-icon--small"
                    />{" "}
                    {translateText(competition.name, locale)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="info-grid info-grid--two">
            <div className="info-card">
              <div className="info-card__title">{copy.my.upcomingMatches}</div>
              <div className="list-stack">
                {followedMatches.length ? (
                  followedMatches.map((match) => {
                    const competition = competitionMap.get(match.competitionId);
                    const homeTeam = teamMap.get(match.home.teamId);
                    const awayTeam = teamMap.get(match.away.teamId);

                    if (!competition || !homeTeam || !awayTeam) {
                      return null;
                    }

                    return (
                      <Link href={`/match/${match.slug}`} className="list-row" key={match.id}>
                        <div className="list-row__content">
                          <div className="list-row__title">
                            {homeTeam.shortName} vs {awayTeam.shortName}
                          </div>
                          <div className="list-row__meta">
                            {competition.icon} {translateText(competition.name, locale)} · {match.kickoffLabel}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="flat-empty">{copy.my.empty}</div>
                )}
              </div>
            </div>

            <div className="info-card">
              <div className="info-card__title">{copy.my.notificationPrefs}</div>
              <div className="list-stack">
                <button
                  type="button"
                  className={`list-row list-row--button${notifications.preMatch ? " list-row--active" : ""}`}
                  onClick={() => setNotification("preMatch", !notifications.preMatch)}
                >
                  <div className="list-row__content">
                    <div className="list-row__title">{copy.my.preMatch}</div>
                    <div className="list-row__meta">T-2h</div>
                  </div>
                  <span className="list-row__status list-row__status--fresh">
                    {notifications.preMatch ? "On" : "Off"}
                  </span>
                </button>
                <button
                  type="button"
                  className={`list-row list-row--button${notifications.dailyDigest ? " list-row--active" : ""}`}
                  onClick={() => setNotification("dailyDigest", !notifications.dailyDigest)}
                >
                  <div className="list-row__content">
                    <div className="list-row__title">{copy.my.digest}</div>
                    <div className="list-row__meta">09:00</div>
                  </div>
                  <span className="list-row__status list-row__status--fresh">
                    {notifications.dailyDigest ? "On" : "Off"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
