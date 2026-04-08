"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

import { EntityMark } from "@/components/entity-mark";
import {
  buildSeasonStandings,
  fixtureScoreLabel,
  fixtureStatusLabel,
} from "@/lib/match-logic";
import { useAppPreferences } from "@/components/preferences-provider";
import { translateText } from "@/lib/i18n";
import { energyBand, energyScore, formatDistance } from "@/lib/sonar";
import type { CompetitionRecord, MatchRecord, NewsItem, Result, TeamRecord } from "@/lib/types";

type CompetitionTab =
  | "standings"
  | "matches"
  | "fatigue"
  | "stats"
  | "overview"
  | "knockout"
  | "fixtures"
  | "news";

const LEAGUE_TABS: CompetitionTab[] = ["standings", "matches", "fatigue", "stats"];
const CUP_TABS: CompetitionTab[] = ["overview", "knockout", "fixtures", "stats", "news"];

export function CompetitionScreen({
  competition,
  matches,
  newsItems,
  teams,
}: {
  competition: CompetitionRecord;
  matches: MatchRecord[];
  newsItems: NewsItem[];
  teams: TeamRecord[];
}) {
  const { locale } = useAppPreferences();
  const isCup = competition.id === "champions-league";
  const tabs = isCup ? CUP_TABS : LEAGUE_TABS;
  const [activeTab, setActiveTab] = useState<CompetitionTab>(tabs[0]);
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const orderedMatches = [...matches].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const tableRows = buildCompetitionRows(orderedMatches, teamMap);
  const featuredNews = newsItems.slice(0, 4);
  const seasonLabel = "2025/26";

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="league-page-header">
          <EntityMark
            value={competition.icon}
            label={translateText(competition.name, locale)}
            className="league-page-header__badge"
          />
          <div className="league-page-header__content">
            <div className="league-page-header__title">{translateText(competition.name, locale)}</div>
            <div className="league-page-header__meta">
              {competition.region} · {seasonLabel}
              {orderedMatches[0] ? ` · ${orderedMatches[0].stage}` : ""}
            </div>
          </div>
        </div>

        <div className="match-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`match-tab${activeTab === tab ? " active" : ""}${
                tab === "fatigue" ? " sonar-tab" : ""
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {competitionTabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="sonar-panel">
          {!isCup && activeTab === "standings" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Standings" : "Standings"}
                note={
                  locale === "zh"
                    ? "保留 FotMob 式榜单结构，只在最右侧加入 Sonar 的能量列。"
                    : "A FotMob-style league table with the Sonar energy column added on the far right."
                }
              />
              <StandingsTable rows={tableRows} />
            </div>
          ) : null}

          {!isCup && activeTab === "matches" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Matches" : "Matches"}
                note={
                  locale === "zh"
                    ? "比赛列表沿用首页的行式结构，能量条只作为第二层辅助信息。"
                    : "Fixtures keep the same row rhythm as the homepage, with energy shown as a secondary signal."
                }
              />
              {orderedMatches.length ? (
                <div className="league-group">
                  <div className="league-group-header">
                    <EntityMark
                      value={competition.icon}
                      label={translateText(competition.name, locale)}
                      className="league-icon league-icon--small"
                    />
                    <span>{translateText(competition.name, locale)}</span>
                  </div>
                  {orderedMatches.map((match) => (
                    <CompetitionMatchRow
                      key={match.id}
                      match={match}
                      homeTeam={teamMap.get(match.home.teamId)}
                      awayTeam={teamMap.get(match.away.teamId)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flat-empty">{locale === "zh" ? "暂无赛程" : "No fixtures yet"}</div>
              )}
            </div>
          ) : null}

          {!isCup && activeTab === "fatigue" ? (
            <div className="list-stack">
              <SectionLead
                title={locale === "zh" ? "Fatigue Rankings" : "Fatigue Rankings"}
                note={
                  locale === "zh"
                    ? "按照原型的平铺排行卡，只突出球队、阵容完整度和能量值。"
                    : "Flat ranking cards that focus on team, squad availability and energy only."
                }
              />
              {tableRows
                .slice()
                .sort((a, b) => b.energy - a.energy)
                .map((row, index) => (
                  <Link href={`/team/${row.team.slug}`} className="rank-card" key={row.team.id}>
                    <div className="rank-card__index">{index + 1}</div>
                    <div className="rank-card__main">
                      <div className="rank-card__title inline-mark">
                        <EntityMark value={row.team.badge} label={row.team.name} className="team-badge" />
                        <span>{row.team.name}</span>
                      </div>
                      <div className="rank-card__meta">
                        {locale === "zh"
                          ? `${row.availability}% 阵容完整度 · ${row.played} 场样本`
                          : `${row.availability}% squad availability · ${row.played} match sample`}
                      </div>
                    </div>
                    <div className="rank-card__score">
                      <div className={`rank-card__score-value rank-card__score-value--${energyBand(row.energy)}`}>
                        {row.energy}
                      </div>
                      <div className="rank-card__score-bar">
                        <div
                          className={`rank-card__score-fill rank-card__score-fill--${energyBand(row.energy)}`}
                          style={{ width: `${row.energy}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          ) : null}

          {!isCup && activeTab === "stats" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Stats" : "Stats"}
                note={
                  locale === "zh"
                    ? "用更少的卡片概括当前联赛的恢复和旅行负荷信号。"
                    : "A compact stat summary for the league's recovery and travel signals."
                }
              />
              <div className="info-grid info-grid--three">
                {buildLeagueStats(tableRows, locale).map((item) => (
                  <InfoCard key={item.title} title={item.title} body={item.body} />
                ))}
              </div>
            </div>
          ) : null}

          {isCup && activeTab === "overview" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Overview" : "Overview"}
                note={
                  locale === "zh"
                    ? "欧战页先回到赛事信息本身，再在卡片里嵌入 Sonar 的体能判断。"
                    : "Cup pages stay competition-first, with Sonar energy layered into the existing match modules."
                }
              />
              <div className="summary-metric-grid summary-metric-grid--three">
                <SummaryMetric title="Season" value={seasonLabel} note="UCL" />
                <SummaryMetric title="Fixtures" value={`${orderedMatches.length}`} note="matches" />
                <SummaryMetric title="News" value={`${featuredNews.length}`} note="stories" />
              </div>
              <div className="info-grid info-grid--two">
                <InfoCard
                  title={locale === "zh" ? "赛事概览" : "Competition overview"}
                  body={
                    locale === "zh"
                      ? "欧冠页回到更平的赛事信息布局，先看对阵、赛程、新闻，再把 Sonar 能量信息嵌进去。"
                      : "The Champions League page now uses a flatter competition-first layout and embeds Sonar energy signals inside it."
                  }
                />
                <InfoCard
                  title={locale === "zh" ? "焦点赛程" : "Key fixture"}
                  body={
                    orderedMatches[0]
                      ? `${timeLabel(orderedMatches[0].kickoffLabel)} · ${
                          teamMap.get(orderedMatches[0].home.teamId)?.name ?? ""
                        } vs ${teamMap.get(orderedMatches[0].away.teamId)?.name ?? ""}`
                      : locale === "zh"
                        ? "暂无焦点赛程"
                        : "No featured fixture yet"
                  }
                />
              </div>
            </div>
          ) : null}

          {isCup && activeTab === "knockout" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Knockout" : "Knockout"}
                note={
                  locale === "zh"
                    ? "这里暂时保持扁平淘汰赛分栏，下一轮再进一步收成完整对阵树。"
                    : "A flatter knockout layout for now; the full bracket treatment can be refined in a later pass."
                }
              />
              <div className="knockout-flat-grid">
                {groupMatchesByStage(orderedMatches).map((group) => (
                  <div className="knockout-flat-column" key={group.stage}>
                    <div className="knockout-flat-column__title">{group.stage}</div>
                    {group.matches.map((match) => (
                      <CompetitionMatchRow
                        key={match.id}
                        match={match}
                        homeTeam={teamMap.get(match.home.teamId)}
                        awayTeam={teamMap.get(match.away.teamId)}
                        compact
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {isCup && activeTab === "fixtures" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Fixtures" : "Fixtures"}
                note={
                  locale === "zh"
                    ? "赛程页沿用首页相同的行式密度，让欧冠、联赛和世界杯都读起来一致。"
                    : "Fixtures reuse the same row density as the homepage so cups, leagues and World Cup read consistently."
                }
              />
              {orderedMatches.map((match) => (
                <CompetitionMatchRow
                  key={match.id}
                  match={match}
                  homeTeam={teamMap.get(match.home.teamId)}
                  awayTeam={teamMap.get(match.away.teamId)}
                />
              ))}
            </div>
          ) : null}

          {isCup && activeTab === "stats" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "Stats" : "Stats"}
                note={
                  locale === "zh"
                    ? "用最少的模块总结欧冠当前的赛程量、体能窗口和样本活跃度。"
                    : "A minimal stat strip summarizing fixture load, energy edge and competition activity."
                }
              />
              <div className="info-grid info-grid--three">
                {buildCupStats(orderedMatches, tableRows, locale).map((item) => (
                  <InfoCard key={item.title} title={item.title} body={item.body} />
                ))}
              </div>
            </div>
          ) : null}

          {isCup && activeTab === "news" ? (
            <div className="simple-stack">
              <SectionLead
                title={locale === "zh" ? "News" : "News"}
                note={
                  locale === "zh"
                    ? "新闻列表继续保持轻量卡片，不让它压过核心赛事信息。"
                    : "News stays lightweight so it supports rather than overwhelms the core competition view."
                }
              />
              <div className="list-stack">
                {featuredNews.length ? (
                  featuredNews.map((story) => (
                    <Link href={story.href} className="news-list-item" key={story.id}>
                      <div
                        className="news-list-item__thumb"
                        style={{ "--news-accent": story.accent } as CSSProperties}
                      />
                      <div className="news-list-item__content">
                        <div className="news-list-item__title">{translateText(story.title, locale)}</div>
                        <div className="news-list-item__meta">
                          {story.source} · {story.publishedLabel}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flat-empty">
                    {locale === "zh" ? "新闻数据接入后会显示在这里。" : "News will appear here once the data feed is connected."}
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

function StandingsTable({
  rows,
}: {
  rows: CompetitionRow[];
}) {
  return (
    <table className="league-standings-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>P</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GD</th>
          <th>Pts</th>
          <th>Form</th>
          <th className="league-standings-table__energy">Energy</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.team.id}>
            <td>
              <span
                className={`pos-indicator${
                  index < 4 ? " pos-ucl" : index === 4 ? " pos-uel" : index >= rows.length - 3 ? " pos-rel" : ""
                }`}
              />
              {index + 1}
            </td>
            <td>
              <Link href={`/team/${row.team.slug}`} className="league-standings-table__team">
                <EntityMark value={row.team.badge} label={row.team.name} className="team-badge" />
                <span>{row.team.name}</span>
              </Link>
            </td>
            <td>{row.played}</td>
            <td>{row.wins}</td>
            <td>{row.draws}</td>
            <td>{row.losses}</td>
            <td>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
            <td>{row.points}</td>
            <td>
              <span className="form-dots">
                {row.form.slice(0, 5).map((result, resultIndex) => (
                  <span
                    className={`momentum-dot momentum-dot--${resultTone(result)}`}
                    key={`${row.team.id}-${resultIndex}`}
                  />
                ))}
              </span>
            </td>
            <td className={`league-standings-table__energy-value league-standings-table__energy-value--${energyBand(row.energy)}`}>
              {row.energy}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CompetitionMatchRow({
  match,
  homeTeam,
  awayTeam,
  compact = false,
}: {
  match: MatchRecord;
  homeTeam?: TeamRecord;
  awayTeam?: TeamRecord;
  compact?: boolean;
}) {
  if (!homeTeam || !awayTeam) {
    return null;
  }

  const homeEnergy = energyScore(match.home.fatigue);
  const awayEnergy = energyScore(match.away.fatigue);

  return (
    <div className={`competition-match-card${compact ? " competition-match-card--compact" : ""}`}>
      <Link href={`/match/${match.slug}`} className="match-row">
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
      {!compact ? (
        <div className="fatigue-bar-container">
          <span className={`fatigue-label ${energyBand(homeEnergy)}`}>{homeEnergy}</span>
          <div className="fatigue-bar">
            <div className={`fatigue-fill ${energyBand(homeEnergy)}`} style={{ width: `${homeEnergy}%` }} />
          </div>
          <span className="fatigue-energy-word">Energy</span>
          <div className="fatigue-bar">
            <div className={`fatigue-fill ${energyBand(awayEnergy)}`} style={{ width: `${awayEnergy}%` }} />
          </div>
          <span className={`fatigue-label ${energyBand(awayEnergy)}`}>{awayEnergy}</span>
        </div>
      ) : null}
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

function competitionTabLabel(tab: CompetitionTab) {
  switch (tab) {
    case "standings":
      return "Standings";
    case "matches":
      return "Matches";
    case "fatigue":
      return "Fatigue Rankings";
    case "stats":
      return "Stats";
    case "overview":
      return "Overview";
    case "knockout":
      return "Knockout";
    case "fixtures":
      return "Fixtures";
    case "news":
      return "News";
  }
}

type CompetitionRow = {
  team: TeamRecord;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalDiff: number;
  form: Result[];
  energy: number;
  availability: number;
  travelKm: number;
};

function buildCompetitionRows(
  matches: MatchRecord[],
  teamMap: Map<string, TeamRecord>
): CompetitionRow[] {
  const standings = buildSeasonStandings(matches, teamMap);
  const latestByTeam = new Map<string, MatchRecord["home"] | MatchRecord["away"]>();

  [...matches]
    .sort((left, right) => right.startsAt.localeCompare(left.startsAt))
    .forEach((match) => {
      if (!latestByTeam.has(match.home.teamId)) {
        latestByTeam.set(match.home.teamId, match.home);
      }
      if (!latestByTeam.has(match.away.teamId)) {
        latestByTeam.set(match.away.teamId, match.away);
      }
    });

  return standings.map((row) => {
    const latest = latestByTeam.get(row.team.id);
    return {
      ...row,
      form: row.form,
      energy: latest ? energyScore(latest.fatigue) : 50,
      availability: latest?.squadAvailability ?? 0,
      travelKm: latest?.travelKm ?? 0,
    };
  });
}

function buildLeagueStats(rows: CompetitionRow[], locale: "zh" | "en") {
  const freshest = rows.slice().sort((a, b) => b.energy - a.energy)[0];
  const heaviest = rows.slice().sort((a, b) => a.energy - b.energy)[0];
  const cleanestTravel = rows.slice().sort((a, b) => a.travelKm - b.travelKm)[0];

  return [
    {
      title: locale === "zh" ? "Freshest Squad" : "Freshest Squad",
      body: freshest
        ? `${freshest.team.name} · ${freshest.energy} energy`
        : locale === "zh"
          ? "暂无数据"
          : "No data",
    },
    {
      title: locale === "zh" ? "Highest Load" : "Highest Load",
      body: heaviest
        ? `${heaviest.team.name} · ${heaviest.energy} energy`
        : locale === "zh"
          ? "暂无数据"
          : "No data",
    },
    {
      title: locale === "zh" ? "Travel Light" : "Travel Light",
      body: cleanestTravel
        ? `${cleanestTravel.team.name} · ${formatDistance(cleanestTravel.travelKm)}`
        : locale === "zh"
          ? "暂无数据"
          : "No data",
    },
  ];
}

function buildCupStats(
  matches: MatchRecord[],
  rows: CompetitionRow[],
  locale: "zh" | "en"
) {
  const freshest = rows.slice().sort((a, b) => b.energy - a.energy)[0];
  const busiest = rows.slice().sort((a, b) => b.played - a.played)[0];

  return [
    {
      title: locale === "zh" ? "Fixtures" : "Fixtures",
      body: locale === "zh" ? `${matches.length} 场淘汰赛赛程` : `${matches.length} knockout fixtures`,
    },
    {
      title: locale === "zh" ? "Freshest Side" : "Freshest Side",
      body: freshest ? `${freshest.team.name} · ${freshest.energy} energy` : "No data",
    },
    {
      title: locale === "zh" ? "Most Active" : "Most Active",
      body: busiest ? `${busiest.team.name} · ${busiest.played} sample matches` : "No data",
    },
  ];
}

function groupMatchesByStage(matches: MatchRecord[]) {
  const groups = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const key = match.stage || "Fixtures";
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }

  return [...groups.entries()].map(([stage, groupMatches]) => ({
    stage,
    matches: groupMatches,
  }));
}

function resultTone(result: Result) {
  if (result === "W") return "win";
  if (result === "D") return "draw";
  return "loss";
}

function timeLabel(kickoffLabel: string) {
  const time = kickoffLabel.match(/\b\d{1,2}:\d{2}(?:\s?[AP]M)?\b/i)?.[0];
  return time ?? kickoffLabel;
}
