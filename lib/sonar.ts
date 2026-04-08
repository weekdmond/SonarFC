import { messages } from "@/lib/i18n";
import type { Locale, MatchRecord, Result, Tone } from "@/lib/types";

export function energyScore(fatigue: number) {
  return Math.max(0, Math.min(100, 100 - fatigue));
}

export function energyBand(energy: number) {
  if (energy < 40) {
    return "exhausted";
  }
  if (energy < 60) {
    return "tired";
  }
  return "fresh";
}

export function formatDistance(km: number) {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}k km`;
  }

  return `${km} km`;
}

export function formatRelativeDay(day: number, locale: Locale) {
  if (day === 0) {
    return locale === "zh" ? "比赛日" : "Matchday";
  }

  if (day > 0) {
    return locale === "zh" ? `${day} 天后` : `+${day}d`;
  }

  return locale === "zh" ? `${Math.abs(day)} 天前` : `${day}d`;
}

export function fatigueTone(value: number): Tone {
  if (value > 65) {
    return "danger";
  }

  if (value > 45) {
    return "warning";
  }

  return "positive";
}

export function fatigueLabel(value: number, locale: Locale) {
  const copy = messages[locale].states;
  if (value > 65) {
    return copy.fatigueHigh;
  }
  if (value > 45) {
    return copy.fatigueMid;
  }
  return copy.fatigueLow;
}

export function availabilityTone(value: number): Tone {
  if (value >= 90) {
    return "positive";
  }
  if (value >= 82) {
    return "warning";
  }
  return "danger";
}

export function availabilityLabel(value: number, locale: Locale) {
  const copy = messages[locale].states;
  if (value >= 90) {
    return copy.squadStrong;
  }
  if (value >= 82) {
    return copy.squadWatch;
  }
  return copy.squadThin;
}

export function densityTone(value: number): Tone {
  if (value <= 2) {
    return "positive";
  }
  if (value <= 4) {
    return "warning";
  }
  return "danger";
}

export function densityLabel(value: number, locale: Locale) {
  const copy = messages[locale].states;
  if (value <= 2) {
    return copy.densityLight;
  }
  if (value <= 4) {
    return copy.densityMid;
  }
  return copy.densityHeavy;
}

export function travelTone(value: number): Tone {
  if (value < 1000) {
    return "positive";
  }
  if (value < 2000) {
    return "warning";
  }
  return "danger";
}

export function travelLabel(value: number, locale: Locale) {
  const copy = messages[locale].states;
  if (value < 1000) {
    return copy.travelLight;
  }
  if (value < 2000) {
    return copy.travelMid;
  }
  return copy.travelHeavy;
}

export function workloadTone(level: "high" | "medium" | "low"): Tone {
  if (level === "high") {
    return "danger";
  }
  if (level === "medium") {
    return "warning";
  }
  return "positive";
}

export function workloadLabel(level: "high" | "medium" | "low", locale: Locale) {
  const copy = messages[locale].states;
  if (level === "high") {
    return copy.loadHigh;
  }
  if (level === "medium") {
    return copy.loadMid;
  }
  return copy.loadLow;
}

export function resultTone(result: Result): Tone {
  if (result === "W") {
    return "positive";
  }
  if (result === "D") {
    return "warning";
  }
  return "danger";
}

export function overallAdvantage(match: MatchRecord, locale: Locale) {
  const homeScore =
    (100 - match.home.fatigue) +
    match.home.squadAvailability -
    match.home.matchDensity * 7 -
    Math.round(match.home.travelKm / 450);
  const awayScore =
    (100 - match.away.fatigue) +
    match.away.squadAvailability -
    match.away.matchDensity * 7 -
    Math.round(match.away.travelKm / 450);

  const diff = homeScore - awayScore;

  if (Math.abs(diff) < 8) {
    return locale === "zh" ? "赛前状态接近" : "Both teams enter in similar condition";
  }

  if (diff > 0) {
    return locale === "zh"
      ? `${match.home.teamId === "liverpool" ? "利物浦" : "主队"} 状态稍优`
      : "Home side carries the cleaner pre-match profile";
  }

  return locale === "zh"
    ? `${match.away.teamId === "man-city" ? "曼城" : "客队"} 状态稍优`
    : "Away side carries the cleaner pre-match profile";
}

export function toneClass(tone: Tone) {
  return `tone tone--${tone}`;
}
