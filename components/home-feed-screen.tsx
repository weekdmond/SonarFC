"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { EntityMark } from "@/components/entity-mark";
import { buildSeasonStandings, fixtureScoreLabel, fixtureStatusLabel } from "@/lib/match-logic";
import { useAppPreferences } from "@/components/preferences-provider";
import { messages, translateText } from "@/lib/i18n";
import { energyBand, energyScore } from "@/lib/sonar";
import type {
  CompetitionRecord,
  MatchRecord,
  NewsItem,
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
  matches,
  newsItems,
}: {
  competitions: CompetitionRecord[];
  teams: TeamRecord[];
  matches: MatchRecord[];
  newsItems: NewsItem[];
}) {
  const [filterMode, setFilterMode] = useState<"all" | "following" | "time">("all");
  const { locale, followedTeams } = useAppPreferences();
  const copy = messages[locale];
  const competitionMap = new Map(competitions.map((competition) => [competition.id, competition]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const [selectedDate, setSelectedDate] = useState<Date>(() => findInitialSelectedDate(matches));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(findInitialSelectedDate(matches)));
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const selectedDateKey = toDateKey(selectedDate);
  const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const weekdayLabels = useMemo(() => buildWeekdayLabels(locale), [locale]);
  const matchesForFilter = useMemo(
    () =>
      [...matches]
        .filter((match) =>
          filterMode === "following"
            ? followedTeams.includes(match.home.teamId) || followedTeams.includes(match.away.teamId)
            : true
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [filterMode, followedTeams, matches]
  );

  useEffect(() => {
    if (!calendarOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!datePickerRef.current?.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCalendarOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [calendarOpen]);

  const visibleMatches = matchesForFilter.filter(
    (match) => matchDateKey(match.startsAt) === selectedDateKey
  );
  const nextMatch = matchesForFilter.find((match) => matchDateKey(match.startsAt) > selectedDateKey);
  const nextMatchDate = nextMatch ? startOfDay(new Date(nextMatch.startsAt)) : null;
  const nextMatchDateLabel = nextMatchDate ? selectedDateMeta(nextMatchDate, locale) : null;

  const groupedMatches = TOP_LEAGUE_IDS.map((competitionId) => ({
    competition: competitionMap.get(competitionId),
    matches: visibleMatches.filter((match) => match.competitionId === competitionId),
  })).filter(
    (group): group is { competition: CompetitionRecord; matches: MatchRecord[] } =>
      Boolean(group.competition) && group.matches.length > 0
  );

  const featuredStandings = buildMiniStandings(
    matches.filter((match) => match.competitionId === "premier-league"),
    teamMap
  ).slice(0, 5);
  const featuredStory = newsItems[0];
  const sideStories = newsItems.slice(1, 5);

  return (
    <div className="layout">
      <aside className="sidebar-left">
        <div className="sidebar-section-title">{copy.home.topLeagues}</div>
        {TOP_LEAGUE_IDS.map((competitionId) => {
          const competition = competitionMap.get(competitionId);

          if (!competition) {
            return null;
          }

          const href =
            competition.id === "fifa-world-cup"
              ? "/world-cup"
              : `/competition/${competition.slug}`;

          return (
            <Link
              key={competition.id}
              href={href}
              className={`league-item${competition.id === "premier-league" ? " active" : ""}`}
            >
              <EntityMark
                value={competition.icon}
                label={translateText(competition.name, locale)}
                className="league-icon"
              />
              <span>{translateText(competition.name, locale)}</span>
            </Link>
          );
        })}
      </aside>

      <section className="main-content">
        <div className="date-nav">
          <div className="date-nav__primary">
            <button
              type="button"
              className="date-arrow"
              onClick={() => {
                const nextDate = addDays(selectedDate, -1);
                setSelectedDate(nextDate);
                setViewMonth(startOfMonth(nextDate));
              }}
              aria-label={locale === "zh" ? "上一天" : "Previous day"}
            >
              ‹
            </button>

            <div className="date-picker" ref={datePickerRef}>
              <button
                type="button"
                className="date-picker__trigger"
                onClick={() => {
                  setViewMonth(startOfMonth(selectedDate));
                  setCalendarOpen((open) => !open);
                }}
                aria-expanded={calendarOpen}
                aria-haspopup="dialog"
              >
                <span className="date-picker__label">{selectedDateLabel(selectedDate, locale)}</span>
                <span className="date-picker__meta">{selectedDateMeta(selectedDate, locale)}</span>
                <span className={`date-picker__chevron${calendarOpen ? " date-picker__chevron--open" : ""}`}>
                  ▾
                </span>
              </button>

              {calendarOpen ? (
                <>
                  <button
                    type="button"
                    className="date-picker__backdrop"
                    aria-label={locale === "zh" ? "关闭日历" : "Close calendar"}
                    onClick={() => setCalendarOpen(false)}
                  />
                  <div className="date-picker__calendar" role="dialog" aria-label={locale === "zh" ? "日历" : "Calendar"}>
                    <div className="date-picker__calendar-header">
                      <button
                        type="button"
                        className="date-picker__month-arrow"
                        onClick={() => setViewMonth(addMonths(viewMonth, -1))}
                        aria-label={locale === "zh" ? "上个月" : "Previous month"}
                      >
                        ‹
                      </button>
                      <div className="date-picker__month-label">{monthLabel(viewMonth, locale)}</div>
                      <button
                        type="button"
                        className="date-picker__month-arrow"
                        onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                        aria-label={locale === "zh" ? "下个月" : "Next month"}
                      >
                        ›
                      </button>
                    </div>
                    <div className="date-picker__weekdays">
                      {weekdayLabels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                    <div className="date-picker__days">
                      {calendarDays.map((day) => (
                        <button
                          key={day.toISOString()}
                          type="button"
                          className={`date-picker__day${
                            toDateKey(day) === selectedDateKey ? " date-picker__day--selected" : ""
                          }${
                            day.getMonth() !== viewMonth.getMonth() ? " date-picker__day--outside" : ""
                          }${toDateKey(day) === toDateKey(new Date()) ? " date-picker__day--today" : ""}`}
                          onClick={() => {
                            setSelectedDate(day);
                            setViewMonth(startOfMonth(day));
                            setCalendarOpen(false);
                          }}
                        >
                          {day.getDate()}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <button
              type="button"
              className="date-arrow"
              onClick={() => {
                const nextDate = addDays(selectedDate, 1);
                setSelectedDate(nextDate);
                setViewMonth(startOfMonth(nextDate));
              }}
              aria-label={locale === "zh" ? "下一天" : "Next day"}
            >
              ›
            </button>
          </div>

          <div className="filter-tabs" aria-label={locale === "zh" ? "赛程过滤" : "Fixture filters"}>
            <button
              type="button"
              className={`filter-tab${filterMode === "all" ? " active" : ""}`}
              onClick={() => setFilterMode("all")}
            >
              {filterModeLabel("all", locale)}
            </button>
            <button
              type="button"
              className={`filter-tab${filterMode === "following" ? " active" : ""}`}
              onClick={() => setFilterMode("following")}
            >
              {filterModeLabel("following", locale)}
            </button>
            <button
              type="button"
              className={`filter-tab${filterMode === "time" ? " active" : ""}`}
              onClick={() => setFilterMode("time")}
            >
              {filterModeLabel("time", locale)}
            </button>
          </div>
        </div>

        {groupedMatches.length ? (
          groupedMatches.map((group) => (
            <div className="league-group" key={group.competition.id}>
              <div className="league-group-header">
                <EntityMark
                  value={group.competition.icon}
                  label={translateText(group.competition.name, locale)}
                  className="league-icon league-icon--small"
                />
                <span>{translateText(group.competition.name, locale)}</span>
                <span className="league-group-header__meta">
                  · {group.matches[0]?.stage ?? ""}
                </span>
              </div>

              {group.matches.map((match) => {
                const homeTeam = teamMap.get(match.home.teamId);
                const awayTeam = teamMap.get(match.away.teamId);

                if (!homeTeam || !awayTeam) {
                  return null;
                }

                return (
                  <FixtureCluster
                    key={match.id}
                    match={match}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                  />
                );
              })}
            </div>
          ))
        ) : (
          <div className="flat-empty">
            <div>{copy.common.noData}</div>
            {nextMatchDate ? (
              <button
                type="button"
                className="flat-empty__action"
                onClick={() => {
                  setSelectedDate(nextMatchDate);
                  setViewMonth(startOfMonth(nextMatchDate));
                }}
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
        <div className="sidebar-section-title">
          {locale === "zh" ? "Top stories" : "Top stories"}
        </div>
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
            {locale === "zh" ? "新闻数据接入后会显示在这里。" : "News will appear here once the data feed is connected."}
          </div>
        ) : null}

        <div className="standings-mini">
          <div className="sidebar-section-title">Premier League</div>
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

function FixtureCluster({
  match,
  homeTeam,
  awayTeam,
}: {
  match: MatchRecord;
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
}) {
  const homeEnergy = energyScore(match.home.fatigue);
  const awayEnergy = energyScore(match.away.fatigue);
  const homeBand = energyBand(homeEnergy);
  const awayBand = energyBand(awayEnergy);

  return (
    <>
      <Link className="match-row match-row--feed" href={`/match/${match.slug}`}>
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

      <div className="fatigue-bar-container">
        <span className={`fatigue-label ${homeBand}`}>{homeEnergy}</span>
        <div className="fatigue-bar">
          <div className={`fatigue-fill ${homeBand}`} style={{ width: `${homeEnergy}%` }} />
        </div>
        <span className="fatigue-energy-word">Energy</span>
        <div className="fatigue-bar">
          <div className={`fatigue-fill ${awayBand}`} style={{ width: `${awayEnergy}%` }} />
        </div>
        <span className={`fatigue-label ${awayBand}`}>{awayEnergy}</span>
      </div>
    </>
  );
}

function buildMiniStandings(
  matches: MatchRecord[],
  teamMap: Map<string, TeamRecord>
) {
  return buildSeasonStandings(matches, teamMap);
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

  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: locale === "zh" ? "numeric" : "short",
    day: "numeric",
  }).format(date);
}

function selectedDateMeta(date: Date, locale: "zh" | "en") {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    weekday: "short",
    month: locale === "zh" ? "numeric" : "short",
    day: "numeric",
    year: "numeric",
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

function buildWeekdayLabels(locale: "zh" | "en") {
  const formatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    weekday: "short",
  });
  const base = new Date(Date.UTC(2026, 2, 1));

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(base);
    day.setUTCDate(base.getUTCDate() + index);
    return formatter.format(day);
  });
}

function buildCalendarDays(viewMonth: Date) {
  const first = startOfMonth(viewMonth);
  const gridStart = addDays(first, -first.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function monthLabel(date: Date, locale: "zh" | "en") {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function findInitialSelectedDate(matches: MatchRecord[]) {
  const today = startOfDay(new Date());
  void matches;
  return today;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchDateKey(startsAt: string) {
  const date = new Date(startsAt);

  // Football matchdays often roll past midnight locally, so keep very early
  // kickoffs grouped under the previous matchday.
  if (date.getHours() < 6) {
    date.setDate(date.getDate() - 1);
  }

  return toDateKey(date);
}
