import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { formatRelativeDay, resultTone, toneClass, workloadLabel } from "@/lib/sonar";
import type { KeyPlayerLoad, Locale, Result, SchedulePoint, Tone } from "@/lib/types";

export function Panel({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(eyebrow || title || action) && (
        <div className="panel__header">
          <div>
            {eyebrow ? <div className="panel__eyebrow">{eyebrow}</div> : null}
            {title ? <h2 className="panel__title">{title}</h2> : null}
            {description ? <p className="panel__description">{description}</p> : null}
          </div>
          {action ? <div className="panel__action">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusTag({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}) {
  return <span className={toneClass(tone)}>{label}</span>;
}

export function MiniMetric({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: Tone;
}) {
  return (
    <div className="mini-metric">
      <div className="mini-metric__label">{label}</div>
      <div className={`mini-metric__value${tone ? ` mini-metric__value--${tone}` : ""}`}>
        {value}
      </div>
      {caption ? <div className="mini-metric__caption">{caption}</div> : null}
    </div>
  );
}

export function MetricBar({
  label,
  value,
  progress,
  note,
  color,
}: {
  label: string;
  value: string;
  progress: number;
  note: string;
  color: string;
}) {
  const style = {
    "--bar-color": color,
    "--bar-progress": `${Math.max(0, Math.min(100, progress))}%`,
  } as CSSProperties;

  return (
    <div className="metric-bar">
      <div className="metric-bar__meta">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="metric-bar__track" style={style}>
        <div className="metric-bar__fill" />
      </div>
      <div className="metric-bar__note">{note}</div>
    </div>
  );
}

export function ResultStrip({
  results,
  labels,
}: {
  results: Result[];
  labels: string[];
}) {
  return (
    <div className="result-strip">
      {results.map((result, index) => (
        <div key={`${result}-${labels[index]}-${index}`} className="result-strip__item">
          <div className={`result-strip__badge result-strip__badge--${resultTone(result)}`}>
            {result}
          </div>
          <div className="result-strip__label">{labels[index]}</div>
        </div>
      ))}
    </div>
  );
}

export function TimelineStrip({
  items,
  locale,
  color,
}: {
  items: SchedulePoint[];
  locale: Locale;
  color: string;
}) {
  const minDay = Math.min(...items.map((item) => item.day));
  const maxDay = Math.max(...items.map((item) => item.day));
  const range = maxDay - minDay || 1;

  return (
    <div className="timeline-strip">
      <div className="timeline-strip__line" />
      {items.map((item) => {
        const left = ((item.day - minDay) / range) * 100;
        return (
          <div
            key={`${item.opponent}-${item.day}-${item.competitionShort}`}
            className="timeline-strip__point"
            style={{ left: `calc(${left}% - 10px)` }}
          >
            <span className={`timeline-strip__comp${item.current ? " timeline-strip__comp--current" : ""}`}>
              {item.competitionShort}
            </span>
            <span
              className={`timeline-strip__dot${item.current ? " timeline-strip__dot--current" : ""}`}
              style={item.current ? { backgroundColor: color, borderColor: color } : undefined}
            />
            <span className="timeline-strip__opponent">{item.opponent}</span>
            <span className="timeline-strip__day">
              {formatRelativeDay(item.day, locale)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function WorkloadList({
  players,
  locale,
}: {
  players: KeyPlayerLoad[];
  locale: Locale;
}) {
  return (
    <div className="workload-list">
      {players.map((player) => {
        const content = (
          <>
            <div className="workload-list__meta">
              <div className="workload-list__name">{player.name}</div>
              <div className="workload-list__note">{player.age} · {player.minutes14d}</div>
            </div>
            <StatusTag label={workloadLabel(player.level, locale)} tone={player.level === "high" ? "danger" : player.level === "medium" ? "warning" : "positive"} />
          </>
        );

        return player.playerSlug ? (
          <Link
            href={`/player/${player.playerSlug}`}
            className="workload-list__item workload-list__item--link"
            key={player.name}
          >
            {content}
          </Link>
        ) : (
          <div className="workload-list__item" key={player.name}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
