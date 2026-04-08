export type Locale = "zh" | "en";
export type ThemeMode = "dark" | "light";
export type Tone = "positive" | "warning" | "danger" | "neutral" | "info";
export type Result = "W" | "D" | "L";
export type MatchBucket = "today" | "tomorrow" | "week";

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface CompetitionRecord {
  id: string;
  slug: string;
  icon: string;
  name: LocalizedText;
  region: string;
}

export interface TeamRecord {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  type: "club" | "national";
  country: string;
  city: string;
  color: string;
  badge: string;
}

export interface KeyPlayerLoad {
  playerSlug?: string;
  name: string;
  age: number;
  minutes14d: number;
  level: "high" | "medium" | "low";
  note: LocalizedText;
}

export interface SchedulePoint {
  day: number;
  opponent: string;
  home: boolean;
  competitionShort: string;
  current?: boolean;
}

export interface FormationHealth {
  available: number;
  doubtful: number;
  absent: number;
}

export interface MatchSide {
  teamId: string;
  fatigue: number;
  squadAvailability: number;
  matchDensity: number;
  restDays: number;
  travelKm: number;
  recentResults: Result[];
  momentumLabels: string[];
  keyAbsent: string[];
  keyFatigued: KeyPlayerLoad[];
  schedule: SchedulePoint[];
  aiSummary: LocalizedText;
  statusNote: LocalizedText;
  formationHealth: FormationHealth;
}

export interface MatchRecord {
  id: string;
  slug: string;
  bucket: MatchBucket;
  competitionId: string;
  stage: string;
  status?: string;
  kickoffLabel: string;
  startsAt: string;
  venue: string;
  homeScore?: number | null;
  awayScore?: number | null;
  home: MatchSide;
  away: MatchSide;
  verdict: LocalizedText;
  spotlight: LocalizedText;
  featuredPlayerSlug: string;
}

export interface NewsItem {
  id: string;
  slug: string;
  href: string;
  competitionIds: string[];
  category: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  source: string;
  publishedLabel: string;
  accent: string;
}

export interface PlayerHistoryItem {
  date: string;
  label: LocalizedText;
  duration: string;
}

export interface PlayerComparisonItem {
  label: LocalizedText;
  value: string;
  note: LocalizedText;
  tone: Tone;
}

export interface PlayerProfile {
  slug: string;
  teamId: string;
  name: string;
  photo?: string;
  position: string;
  age: number;
  nationality: string;
  fatigueScore: number;
  level: "high" | "medium" | "low";
  last14Minutes: number;
  seasonMinutes: number;
  appearancesCount?: number;
  startsLast5: number;
  nextFixture: string;
  summary: LocalizedText;
  workloadHistory: number[];
  workloadLabels: string[];
  fatigueTrend: number[];
  fatigueLabels: string[];
  injuries: PlayerHistoryItem[];
  rotationPrediction: LocalizedText;
  comparison: PlayerComparisonItem[];
}

export interface WorldCupTravelLeg {
  from: string;
  to: string;
  distanceKm: number;
  timezoneShift: number;
}

export interface WorldCupRecoveryMatch {
  opponent: string;
  city: string;
  daysBetween: number;
}

export interface WorldCupTeamProfile {
  teamId: string;
  group: string;
  clubMinutesIndex: number;
  travelKm: number;
  restDaysBetweenMatches: number;
  keyRiskCount: number;
  outlook: LocalizedText;
  travelLegs: WorldCupTravelLeg[];
  recoveryMatrix: WorldCupRecoveryMatch[];
}

export interface NotificationPreferences {
  preMatch: boolean;
  dailyDigest: boolean;
}

export interface UserPreferencesState {
  theme: ThemeMode;
  locale: Locale;
  followedTeams: string[];
  followedCompetitions: string[];
  notifications: NotificationPreferences;
}

export type PreferencesBackendMode = "local" | "supabase";
export type PreferencesSyncState = "local" | "syncing" | "synced" | "error";
