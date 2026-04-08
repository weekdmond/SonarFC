"use client";

import Link from "next/link";
import { useState } from "react";

import { EntityMark } from "@/components/entity-mark";
import { useAppPreferences } from "@/components/preferences-provider";
import { messages, translateText } from "@/lib/i18n";
import { energyBand, energyScore } from "@/lib/sonar";
import type { Locale, PlayerProfile, TeamRecord } from "@/lib/types";

type PlayerTab = "workload" | "stats" | "injuries" | "matches";

const PLAYER_TABS: PlayerTab[] = ["workload", "stats", "injuries", "matches"];

export function PlayerScreen({
  player,
  teams,
}: {
  player: PlayerProfile;
  teams: TeamRecord[];
}) {
  const [activeTab, setActiveTab] = useState<PlayerTab>("workload");
  const { locale } = useAppPreferences();
  const team = teams.find((item) => item.id === player.teamId);

  if (!team) {
    return null;
  }

  const energy = energyScore(player.fatigueScore);
  const band = energyBand(energy);

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="player-hero">
          <div className="player-hero__avatar">
            {player.photo ? (
              <img className="player-hero__avatar-image" src={player.photo} alt={player.name} />
            ) : (
              initials(player.name)
            )}
          </div>

          <div className="player-hero__content">
            <div className="player-hero__title">{player.name}</div>
            <div className="player-hero__meta">
              <Link href={`/team/${team.slug}`} className="player-hero__team">
                <EntityMark value={team.badge} label={team.name} className="team-badge" />
                <span>{team.name}</span>
              </Link>
              <span>·</span>
              <span>
                {player.position} · {player.age}
                {locale === "zh" ? " 岁" : " years"}
              </span>
            </div>
          </div>

          <div className="player-hero__energy">
            <div className="player-hero__energy-label">Energy</div>
            <div className={`player-hero__energy-value player-hero__energy-value--${band}`}>
              {energy}
            </div>
            <div className={`player-hero__energy-note player-hero__energy-note--${band}`}>
              {energyLabel(energy, locale)}
            </div>
          </div>
        </div>

        <div className="match-tabs">
          {PLAYER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`match-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {playerTabLabel(tab, locale)}
            </button>
          ))}
        </div>

        <div className="sonar-panel">
          {activeTab === "workload" ? (
            <>
              <div className="section-lead">
                <div className="sonar-section-title">
                  {locale === "zh" ? "Workload" : "Workload"}
                </div>
                <div className="section-lead__note">
                  {locale === "zh"
                    ? "按原型把赛季分钟、最近 14 天负荷和疲劳趋势放在同一屏里。"
                    : "Season minutes, recent load and fatigue trend are kept on one screen to match the prototype."}
                </div>
              </div>
              <div className="sonar-section">
                <div className="sonar-section-title">
                  {locale === "zh" ? "Season Minutes by Matchweek" : "Season Minutes by Matchweek"}
                </div>
                <div className="player-bars">
                  {player.workloadHistory.map((value, index) => (
                    <div className="player-bars__item" key={`${player.slug}-work-${index}`}>
                      <div
                        className={`player-bars__bar${
                          value === 0
                            ? " player-bars__bar--empty"
                            : index === player.workloadHistory.length - 3
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
              </div>

              <div className="summary-metric-grid summary-metric-grid--four">
                <SummaryMetric title={locale === "zh" ? "Season Total" : "Season Total"} value={`${player.seasonMinutes}`} note={locale === "zh" ? "minutes" : "minutes"} />
                <SummaryMetric title={locale === "zh" ? "Last 14 Days" : "Last 14 Days"} value={`${player.last14Minutes}`} note={locale === "zh" ? "minutes" : "minutes"} tone="exhausted" />
                <SummaryMetric
                  title={locale === "zh" ? "Appearances" : "Appearances"}
                  value={`${player.appearancesCount ?? player.startsLast5}`}
                  note={locale === "zh" ? "season matches" : "season matches"}
                />
                <SummaryMetric title={locale === "zh" ? "Rotation Risk" : "Rotation Risk"} value={energyLabel(energy, locale)} note={locale === "zh" ? "based on load" : "based on load"} tone={band} />
              </div>

              <div className="sonar-section">
                <div className="sonar-section-title">
                  {locale === "zh" ? "30-Day Fatigue Trend" : "30-Day Fatigue Trend"}
                </div>
                <TrendCard values={player.fatigueTrend} labels={player.fatigueLabels} />
              </div>
            </>
          ) : null}

          {activeTab === "stats" ? (
            <div className="info-grid info-grid--two">
              {player.comparison.map((item) => (
                <InfoCard
                  key={`${item.label.en}-${item.value}`}
                  title={translateText(item.label, locale)}
                  body={`${item.value} · ${translateText(item.note, locale)}`}
                />
              ))}
            </div>
          ) : null}

          {activeTab === "injuries" ? (
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
                      {locale === "zh" ? "Recovered" : "Recovered"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flat-empty">{locale === "zh" ? "暂无伤病记录" : "No injury history"}</div>
              )}
            </div>
          ) : null}

          {activeTab === "matches" ? (
            <div className="list-stack">
              {player.workloadLabels.map((label, index) => (
                <div className="list-row" key={`${player.slug}-${label}-${index}`}>
                  <div className={`list-row__dot list-row__dot--${index > player.workloadLabels.length - 4 ? "warning" : "fresh"}`} />
                  <div className="list-row__content">
                    <div className="list-row__title">{label}</div>
                    <div className="list-row__meta">
                      {locale === "zh"
                        ? `${player.workloadHistory[index]} 分钟负荷`
                        : `${player.workloadHistory[index]} minute load`}
                    </div>
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
}: {
  values: number[];
  labels: string[];
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
            stroke="var(--danger)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="trend-card__axis">
        <span>{labels[0] ?? "30d"}</span>
        <span>{labels[labels.length - 1] ?? "Today"}</span>
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

function playerTabLabel(tab: PlayerTab, locale: Locale) {
  if (locale === "zh") {
    if (tab === "workload") return "Workload";
    if (tab === "stats") return "Stats";
    if (tab === "injuries") return "Injuries";
    return "Matches";
  }

  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function energyLabel(energy: number, locale: Locale) {
  if (energy < 40) {
    return locale === "zh" ? "High Fatigue" : "High Fatigue";
  }
  if (energy < 60) {
    return locale === "zh" ? "Managed Load" : "Managed Load";
  }
  return locale === "zh" ? "Fresh" : "Fresh";
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
