"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";

import { EntityMark } from "@/components/entity-mark";
import { useAppPreferences } from "@/components/preferences-provider";
import { computeTeamTFI, scheduleContextFromMatchSide } from "@/lib/fatigue-model";
import { messages, translateText } from "@/lib/i18n";
import { buildSeasonStandings, fixtureScoreLabel, fixtureStatusLabel } from "@/lib/match-logic";
import { energyBand } from "@/lib/sonar";
import type {
  CompetitionRecord,
  MatchRecord,
  NewsItem,
  PlayerProfile,
  TeamRecord,
} from "@/lib/types";

const TOP_LEAGUE_IDS = [
  "fifa-world-cup",
  "champions-league",
  "premier-league",
  "la-liga",
  "serie-a",
  "bundesliga",
  "ligue-1",
] as const;

export function HomeFeedScreen({
  competitions,
  teams,
  players,
  matches,
  newsItems,
}: {
  competitions: CompetitionRecord[];
  teams: TeamRecord[];
  players: PlayerProfile[];
  matches: MatchRecord[];
  newsItems: NewsItem[];
}) {
  const [filterMode, setFilterMode] = useState<"all" | "following" | "time">("all");
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | "all">("all");
  const [selectedDate, setSelectedDate] = useState<Date>(() => findInitialSelectedDate(matches));
  const { locale, followedTeams } = useAppPreferences();
  const copy = messages[locale];
  const competitionMap = new Map(competitions.map((competition) => [competition.id, competition]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const playersByTeam = useMemo(() => {
    const map = new Map<string, PlayerProfile[]>();
    for (const player of players) {
      map.set(player.teamId, [...(map.get(player.teamId) ?? []), player]);
    }
    return map;
  }, [players]);

  const topCompetitions = useMemo(
    () => TOP_LEAGUE_IDS.map((competitionId) => competitionMap.get(competitionId)).filter(Boolean) as CompetitionRecord[],
    [competitionMap]
  );
  const visibleDates = useMemo(() => buildVisibleDates(selectedDate), [selectedDate]);
  const selectedDateKey = toDateKey(selectedDate);

  const filteredMatches = useMemo(() => {
    return [...matches]
      .filter((match) =>
        selectedCompetitionId === "all" ? true : match.competitionId === selectedCompetitionId
      )
      .filter((match) =>
        filterMode === "following"
          ? followedTeams.includes(match.home.teamId) || followedTeams.includes(match.away.teamId)
          : true
      )
      .sort((left, right) => {
        if (filterMode === "time") {
          return left.startsAt.localeCompare(right.startsAt);
        }

        const leftStatus = fixtureStatusWeight(left);
        const rightStatus = fixtureStatusWeight(right);
        if (leftStatus !== rightStatus) {
          return leftStatus - rightStatus;
        }
        return left.startsAt.localeCompare(right.startsAt);
      });
  }, [filterMode, followedTeams, matches, selectedCompetitionId]);

  const visibleMatches = filteredMatches.filter((match) => matchDateKey(match.startsAt) === selectedDateKey);
  const groupedMatches = buildCompetitionGroups(visibleMatches, competitions);
  const nextMatch = filteredMatches.find((match) => matchDateKey(match.startsAt) > selectedDateKey);
  const nextMatchDate = nextMatch ? startOfDay(new Date(nextMatch.startsAt)) : null;
  const nextMatchDateLabel = nextMatchDate ? selectedDateMeta(nextMatchDate, locale) : null;

  const standingsCompetitionId =
    selectedCompetitionId !== "all" &&
    selectedCompetitionId !== "fifa-world-cup" &&
    selectedCompetitionId !== "champions-league"
      ? selectedCompetitionId
      : "premier-league";
  const standingsCompetition = competitionMap.get(standingsCompetitionId);
  const featuredStandings = buildSeasonStandings(
    matches.filter((match) => match.competitionId === standingsCompetitionId),
    teamMap
  ).slice(0, 5);

  const featuredStory = newsItems[0];
  const sideStories = newsItems.slice(1, 5);

  return (
    <div className="layout">
      <aside className="sidebar-left">
        <div className="sidebar-section-title">{copy.home.topLeagues}</div>

        <button
          type="button"
          className={`league-item${selectedCompetitionId === "all" ? " active" : ""}`}
          onClick={() => setSelectedCompetitionId("all")}
        >
          <span className="league-icon league-icon--placeholder">◎</span>
          <span>{locale === "zh" ? "全部联赛" : "All leagues"}</span>
        </button>

        {topCompetitions.map((competition) => (
          <button
            key={competition.id}
            type="button"
            className={`league-item${competition.id === selectedCompetitionId ? " active" : ""}`}
            onClick={() => setSelectedCompetitionId(competition.id)}
          >
            <EntityMark
              value={competition.icon}
              label={translateText(competition.name, locale)}
              className="league-icon"
            />
            <span>{translateText(competition.name, locale)}</span>
            <span className="league-item__chevron">›</span>
          </button>
        ))}

        <Link
          href={
            selectedCompetitionId === "all"
              ? "/competition/premier-league"
              : selectedCompetitionId === "fifa-world-cup"
                ? "/world-cup"
                : `/competition/${competitionMap.get(selectedCompetitionId)?.slug ?? "premier-league"}`
          }
          className="league-footer-link"
        >
          {locale === "zh" ? "查看完整赛事页" : "Open competition page"}
        </Link>
      </aside>

      <section className="main-content">
        <div className="date-nav">
          <div className="date-nav__header">
            <button
              type="button"
              className="date-arrow"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              aria-label={locale === "zh" ? "上一天" : "Previous day"}
            >
              ‹
            </button>

            <div className="date-nav__title">
              <span className="date-nav__label">{selectedDateLabel(selectedDate, locale)}</span>
              <span className="date-nav__meta">{selectedDateMeta(selectedDate, locale)}</span>
            </div>

            <button
              type="button"
              className="date-arrow"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              aria-label={locale === "zh" ? "下一天" : "Next day"}
            >
              ›
            </button>
          </div>

          <div className="date-strip" aria-label={locale === "zh" ? "比赛日选择" : "Matchday selector"}>
            {visibleDates.map((date) => {
              const dateKey = toDateKey(date);
              const active = dateKey === selectedDateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  className={`date-pill${active ? " active" : ""}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span className="date-pill__weekday">{dateStripWeekday(date, locale)}</span>
                  <span className="date-pill__day">{date.getDate()}</span>
                  {dateKey === toDateKey(startOfDay(new Date())) ? <span className="date-pill__dot" /> : null}
                </button>
              );
            })}
          </div>

          <div className="filter-tabs" aria-label={locale === "zh" ? "赛程过滤" : "Fixture filters"}>
            {(["all", "following", "time"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`filter-tab${filterMode === mode ? " active" : ""}`}
                onClick={() => setFilterMode(mode)}
              >
                {filterModeLabel(mode, locale)}
              </button>
            ))}
          </div>
        </div>

        {groupedMatches.length ? (
          groupedMatches.map((group) => (
            <section className="league-group" key={group.dateKey}>
              <div className="league-group-header">
                <div className="league-group-header__main">
                  <EntityMark
                    value={group.competition.icon}
                    label={translateText(group.competition.name, locale)}
                    className="league-icon league-icon--small"
                  />
                  <span>{translateText(group.competition.name, locale)}</span>
                </div>
                <span className="league-group-header__meta">{group.matches.length}</span>
              </div>

              {group.matches.map((match) => {
                const homeTeam = teamMap.get(match.home.teamId);
                const awayTeam = teamMap.get(match.away.teamId);

                if (!homeTeam || !awayTeam) {
                  return null;
                }

                return (
                  <FixtureRow
                    key={match.id}
                    match={match}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    homePlayers={playersByTeam.get(homeTeam.id) ?? []}
                    awayPlayers={playersByTeam.get(awayTeam.id) ?? []}
                  />
                );
              })}
            </section>
          ))
        ) : (
          <div className="flat-empty">
            <div className="flat-empty__icon">⚽</div>
            <div>{locale === "zh" ? "今天没有比赛" : "No matches on this day"}</div>
            <div className="flat-empty__body">
              {locale === "zh" ? "试试切换日期或联赛查看其他比赛日。" : "Try another date or competition to view more fixtures."}
            </div>
            {nextMatchDate ? (
              <button
                type="button"
                className="flat-empty__action"
                onClick={() => setSelectedDate(nextMatchDate)}
              >
                {locale === "zh"
                  ? `查看下一比赛日 · ${nextMatchDateLabel}`
                  : `Go to next matchday · ${nextMatchDateLabel}`}
              </button>
            ) : null}
          </div>
        )}
      </section>

      <aside className="sidebar-right">
        <div className="sidebar-section-title">{locale === "zh" ? "Top stories" : "Top stories"}</div>

        {featuredStory ? (
          <Link href={featuredStory.href} className="news-card news-card--featured">
            <div
              className="news-card-placeholder"
              style={{ "--news-accent": featuredStory.accent } as CSSProperties}
            >
              SonarFC
            </div>
            <h4>{translateText(featuredStory.title, locale)}</h4>
            <div className="news-meta">
              {featuredStory.source} · {featuredStory.publishedLabel}
            </div>
          </Link>
        ) : null}

        {sideStories.length ? (
          <div className="sidebar-story-list">
            {sideStories.map((story) => (
              <Link href={story.href} className="sidebar-story" key={story.id}>
                <div
                  className="sidebar-story__thumb"
                  style={{ "--news-accent": story.accent } as CSSProperties}
                />
                <div className="sidebar-story__body">
                  <div className="sidebar-story__title">{translateText(story.title, locale)}</div>
                  <div className="sidebar-story__meta">
                    {story.source} · {story.publishedLabel}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {!featuredStory && !sideStories.length ? (
          <div className="flat-empty">
            <div className="flat-empty__icon">🗞️</div>
            <div>{locale === "zh" ? "暂无新闻" : "No stories yet"}</div>
            <div className="flat-empty__body">
              {locale === "zh" ? "新闻数据接入后会显示在这里。" : "News will appear here once the feed is connected."}
            </div>
          </div>
        ) : null}

        <div className="standings-mini">
          <div className="sidebar-section-title">
            {translateText(standingsCompetition?.name ?? { zh: "英超", en: "Premier League" }, locale)}
          </div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {featuredStandings.map((row, index) => (
                <tr key={row.team.id}>
                  <td>
                    <span
                      className={`pos-indicator${
                        index < 4 ? " pos-ucl" : index === 4 ? " pos-uel" : ""
                      }`}
                    />
                    {index + 1}. {row.team.name}
                  </td>
                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.draws}</td>
                  <td>{row.losses}</td>
                  <td>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  );
}

function FixtureRow({
  match,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
}: {
  match: MatchRecord;
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
  homePlayers: PlayerProfile[];
  awayPlayers: PlayerProfile[];
}) {
  const homeEnergy = computeTeamTFI(homePlayers, {
    scheduleContext: scheduleContextFromMatchSide(match, match.home, false),
  }).energy;
  const awayEnergy = computeTeamTFI(awayPlayers, {
    scheduleContext: scheduleContextFromMatchSide(match, match.away, true),
  }).energy;

  return (
    <Link className="match-row match-row--feed" href={`/match/${match.slug}`}>
      <span className="match-time">
        <span className="match-time__value">{fixtureStatusLabel(match)}</span>
        <span className="match-time__date">{matchTimeLabel(match.kickoffLabel)}</span>
      </span>

      <EnergyPill value={homeEnergy} band={energyBand(homeEnergy)} />

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

      <EnergyPill value={awayEnergy} band={energyBand(awayEnergy)} />

      <span className="match-row__favorite">☆</span>
    </Link>
  );
}

function EnergyPill({
  value,
  band,
}: {
  value: number;
  band: ReturnType<typeof energyBand>;
}) {
  return <span className={`energy-pill energy-pill--${band}`}>{value}</span>;
}

function selectedDateLabel(date: Date, locale: "zh" | "en") {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  if (toDateKey(date) === toDateKey(today)) {
    return locale === "zh" ? "今天" : "Today";
  }

  if (toDateKey(date) === toDateKey(tomorrow)) {
    return locale === "zh" ? "明天" : "Tomorrow";
  }

  return locale === "zh" ? "比赛日" : "Matchday";
}

function selectedDateMeta(date: Date, locale: "zh" | "en") {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    weekday: locale === "zh" ? "short" : "long",
    year: "numeric",
    month: locale === "zh" ? "numeric" : "short",
    day: "numeric",
  }).format(date);
}

function dateStripWeekday(date: Date, locale: "zh" | "en") {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    weekday: "short",
  }).format(date);
}

function filterModeLabel(mode: "all" | "following" | "time", locale: "zh" | "en") {
  if (mode === "all") {
    return locale === "zh" ? "全部" : "All";
  }
  if (mode === "following") {
    return locale === "zh" ? "关注" : "Following";
  }
  return locale === "zh" ? "开球时间" : "By kickoff";
}

function buildVisibleDates(center: Date) {
  return Array.from({ length: 11 }, (_, index) => addDays(center, index - 3));
}

function buildCompetitionGroups(matches: MatchRecord[], competitions: CompetitionRecord[]) {
  const competitionById = new Map(competitions.map((item) => [item.id, item]));
  const grouped = new Map<string, MatchRecord[]>();
  const order = new Map<string, number>(TOP_LEAGUE_IDS.map((item, index) => [item, index]));

  for (const match of matches) {
    const existing = grouped.get(match.competitionId) ?? [];
    existing.push(match);
    grouped.set(match.competitionId, existing);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => {
      const leftOrder = order.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = order.get(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.localeCompare(right);
    })
    .map(([competitionId, groupedMatches]) => {
      const competition = competitionById.get(competitionId);
      if (!competition) {
        return null;
      }

      return {
        dateKey: `${competitionId}-${groupedMatches[0]?.id ?? "empty"}`,
        competition,
        matches: groupedMatches.sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function fixtureStatusWeight(match: MatchRecord) {
  const label = fixtureStatusLabel(match).toUpperCase();
  if (label === "LIVE") return 0;
  if (label === "FT") return 1;
  return 2;
}

function findInitialSelectedDate(matches: MatchRecord[]) {
  const today = startOfDay(new Date());
  void matches;
  return today;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchDateKey(startsAt: string) {
  const date = new Date(startsAt);

  if (date.getHours() < 6) {
    date.setDate(date.getDate() - 1);
  }

  return toDateKey(date);
}

function matchTimeLabel(kickoffLabel: string) {
  const time = kickoffLabel.match(/\b\d{1,2}:\d{2}(?:\s?[AP]M)?\b/i)?.[0];
  return time ?? kickoffLabel;
}
