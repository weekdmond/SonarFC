import type { MatchRecord, MatchSide, PlayerProfile } from "@/lib/types";

export type FatigueRole = "starter" | "rotation" | "bench";

export interface ScheduleContext {
  matchDensity?: number;
  restDays?: number;
  travelKm?: number;
  competitionId?: string;
  isAway?: boolean;
}

export interface PlayerFatigueModel {
  pfi: number;
  energy: number;
  level: "high" | "medium" | "low";
  role: FatigueRole;
  residualFatigue: number;
  personalAcwr: number;
  acwrScore: number;
  ageScore: number;
  positionScore: number;
  schedulePressure: number;
  minutes14d: number;
}

export interface TeamFatigueModel {
  tfi: number;
  energy: number;
  level: "high" | "medium" | "low";
  avgSquadPfi: number;
  schedulePressure: number;
  starters: number;
  rotation: number;
  bench: number;
  highestPfiPlayer?: string;
  highestPfi?: number;
}

const LAMBDA_ACUTE = 2 / (7 + 1);
const LAMBDA_CHRONIC = 2 / (28 + 1);
const RECOVERY_TAU = 20;

const POSITION_LOAD_DETAILED: Record<string, number> = {
  GK: 0.35,
  CB: 0.68,
  FB: 0.92,
  LB: 0.92,
  RB: 0.92,
  WB: 0.92,
  DM: 0.82,
  CM: 0.88,
  AM: 0.9,
  LM: 0.95,
  RM: 0.95,
  LW: 1.0,
  RW: 1.0,
  ST: 0.8,
  CF: 0.82,
  FW: 0.82,
  MF: 0.88,
  DF: 0.72,
};

export function computePlayerPFI(
  player: PlayerProfile,
  options?: {
    scheduleContext?: ScheduleContext | null;
  }
): PlayerFatigueModel {
  const role = classifyPlayerRole(player);
  const recoveryFactor = ageRecoveryFactor(player.age);
  const positionLoad = resolvePositionLoad(player.position);
  const schedulePressure = computeSchedulePressure(options?.scheduleContext);
  const residualFatigue = computeResidualFatigue(player, recoveryFactor, role);
  const { ratio: personalAcwr, score: acwrScore } = computeApproxAcwr(player, positionLoad, role);
  const ageScore = clamp((1 - recoveryFactor) * 200);
  const positionScore = clamp(positionLoad * 100);

  let pfi = 0;

  if (role === "starter") {
    pfi =
      residualFatigue * 0.4 +
      acwrScore * 0.2 +
      ageScore * 0.15 +
      positionScore * 0.1 +
      schedulePressure * 0.15;
  } else if (role === "rotation") {
    pfi =
      residualFatigue * 0.3 +
      acwrScore * 0.3 +
      ageScore * 0.15 +
      positionScore * 0.1 +
      schedulePressure * 0.15;
  } else {
    pfi =
      residualFatigue * 0.1 +
      acwrScore * 0.1 +
      ageScore * 0.2 +
      positionScore * 0.15 +
      schedulePressure * 0.1;
  }

  const fatigue = round(clamp(pfi));

  return {
    pfi: fatigue,
    energy: energyFromFatigue(fatigue),
    level: fatigueLevel(fatigue),
    role,
    residualFatigue: round(residualFatigue),
    personalAcwr: round(personalAcwr, 2),
    acwrScore: round(acwrScore),
    ageScore: round(ageScore),
    positionScore: round(positionScore),
    schedulePressure: round(schedulePressure),
    minutes14d: player.last14Minutes,
  };
}

export function computeTeamTFI(
  players: PlayerProfile[],
  options?: {
    scheduleContext?: ScheduleContext | null;
  }
): TeamFatigueModel {
  const schedulePressure = computeSchedulePressure(options?.scheduleContext);
  const playerModels = players.map((player) =>
    ({
      player,
      model: computePlayerPFI(player, { scheduleContext: options?.scheduleContext }),
    })
  );

  const weighted = playerModels.reduce(
    (acc, item) => {
      const roleWeight =
        item.model.role === "starter" ? 3 : item.model.role === "rotation" ? 1.5 : 0;
      const minutesWeight = Math.max(item.model.minutes14d, 1);
      const weight = roleWeight * minutesWeight;

      if (weight > 0) {
        acc.weightedSum += item.model.pfi * weight;
        acc.totalWeight += weight;
      }

      acc[item.model.role] += 1;

      if (!acc.highest || item.model.pfi > acc.highest.model.pfi) {
        acc.highest = item;
      }

      return acc;
    },
    {
      weightedSum: 0,
      totalWeight: 0,
      starter: 0,
      rotation: 0,
      bench: 0,
      highest: null as
        | {
            player: PlayerProfile;
            model: PlayerFatigueModel;
          }
        | null,
    }
  );

  const avgSquadPfi = weighted.totalWeight > 0 ? weighted.weightedSum / weighted.totalWeight : 0;
  const tfi = round(clamp(avgSquadPfi * 0.7 + schedulePressure * 0.3));

  return {
    tfi,
    energy: energyFromFatigue(tfi),
    level: fatigueLevel(tfi),
    avgSquadPfi: round(avgSquadPfi),
    schedulePressure: round(schedulePressure),
    starters: weighted.starter,
    rotation: weighted.rotation,
    bench: weighted.bench,
    highestPfiPlayer: weighted.highest?.player.name,
    highestPfi: weighted.highest?.model.pfi,
  };
}

export function scheduleContextFromMatchSide(
  match: MatchRecord,
  side: MatchSide,
  isAway: boolean
): ScheduleContext {
  return {
    matchDensity: side.matchDensity,
    restDays: side.restDays,
    travelKm: side.travelKm,
    competitionId: match.competitionId,
    isAway,
  };
}

export function energyFromFatigue(fatigue: number) {
  return clamp(100 - fatigue);
}

export function fatigueLevel(score: number): "high" | "medium" | "low" {
  if (score > 65) {
    return "high";
  }
  if (score > 40) {
    return "medium";
  }
  return "low";
}

function classifyPlayerRole(player: PlayerProfile): FatigueRole {
  const appearances28d = Math.max(
    player.workloadHistory.filter((value) => value > 0).length,
    Math.min(player.appearancesCount ?? 0, 5)
  );

  if (appearances28d === 0) {
    return "bench";
  }

  if (player.startsLast5 >= 3 || (appearances28d >= 2 && player.startsLast5 / appearances28d > 0.6)) {
    return "starter";
  }

  return "rotation";
}

function ageRecoveryFactor(age: number) {
  if (age <= 22) return 1.05;
  if (age <= 27) return 1.0;
  if (age <= 30) return 0.88;
  if (age <= 33) return 0.78;
  if (age <= 36) return 0.65;
  return 0.5;
}

function resolvePositionLoad(position: string) {
  const normalized = position.toUpperCase();
  const direct = POSITION_LOAD_DETAILED[normalized];
  if (direct) {
    return direct;
  }
  if (/(LW|RW|WING)/.test(normalized)) return 1.0;
  if (/(LB|RB|WB)/.test(normalized)) return 0.92;
  if (/(AM|CM|MID|MF|DM|LM|RM)/.test(normalized)) return 0.88;
  if (/(CB|DEF|DF)/.test(normalized)) return 0.72;
  if (/(FW|ST|CF)/.test(normalized)) return 0.82;
  if (/GK/.test(normalized)) return 0.35;
  return 0.8;
}

function computeResidualFatigue(
  player: PlayerProfile,
  recoveryFactor: number,
  role: FatigueRole
) {
  const recentLoads = player.workloadHistory.filter((value) => value > 0).slice(-5);

  if (!recentLoads.length) {
    return 0;
  }

  const gapDays = clampNumber(14 / Math.max(recentLoads.length, 1), 2.5, 7);
  const tau = RECOVERY_TAU / recoveryFactor;
  const starterMultiplier = role === "starter" ? 1.15 : 1.0;

  const totalResidual = recentLoads
    .slice()
    .reverse()
    .reduce((sum, minutes, index) => {
      const hoursSince = index * gapDays * 24;
      const residual = (minutes / 90) * starterMultiplier * Math.exp(-hoursSince / tau);
      return sum + residual;
    }, 0);

  return clamp(totalResidual * 60);
}

function computeApproxAcwr(
  player: PlayerProfile,
  positionLoad: number,
  role: FatigueRole
) {
  const recentLoads = player.workloadHistory.filter((value) => value > 0).slice(-5);

  if (!recentLoads.length) {
    return { ratio: role === "bench" ? 1 : 0.3, score: role === "bench" ? 0 : 18 };
  }

  const days = Array.from({ length: 42 }, () => 0);
  const gapDays = clampNumber(28 / Math.max(recentLoads.length, 1), 3, 7);

  recentLoads.forEach((minutes, index) => {
    const reversedIndex = recentLoads.length - 1 - index;
    const dayIndex = Math.max(0, 41 - Math.round(reversedIndex * gapDays));
    days[dayIndex] = Math.max(days[dayIndex], minutes * positionLoad);
  });

  let ewmaAcute = days[0];
  let ewmaChronic = days[0];

  for (const load of days.slice(1)) {
    ewmaAcute = load * LAMBDA_ACUTE + (1 - LAMBDA_ACUTE) * ewmaAcute;
    ewmaChronic = load * LAMBDA_CHRONIC + (1 - LAMBDA_CHRONIC) * ewmaChronic;
  }

  const ratio = ewmaChronic > 0.5 ? ewmaAcute / ewmaChronic : role === "bench" ? 1 : 0.3;
  let score = 0;

  if (ratio >= 0.8 && ratio <= 1.3) {
    score = Math.max(0, ((ratio - 0.8) / (1.3 - 0.8)) * 25);
  } else if (ratio > 1.3) {
    score = 25 + ((ratio - 1.3) / (1.5 - 1.3)) * 75;
  } else {
    score = Math.max(0, ((0.8 - ratio) / 0.8) * 30);
  }

  return {
    ratio,
    score: clamp(score),
  };
}

function computeSchedulePressure(context?: ScheduleContext | null) {
  if (!context) {
    return 0;
  }

  const density = context.matchDensity ?? 0;
  const restDays = context.restDays ?? 6;
  const travelKm = context.travelKm ?? 0;

  let densityScore = clamp((density / 6) * 100);
  const congestionMult =
    restDays <= 1 ? 5 :
    restDays <= 2 ? 3.5 :
    restDays <= 3 ? 2 :
    restDays <= 4 ? 1.4 :
    restDays <= 5 ? 1.1 : 1;
  densityScore = clamp(densityScore * (congestionMult / 2));

  const recoveryScore = clamp(100 * Math.exp(-(restDays * 24) / RECOVERY_TAU));

  const competitionId = (context.competitionId ?? "").toLowerCase();
  const european = competitionId.includes("champions") || competitionId.includes("europa");
  const international = competitionId.includes("world-cup") || competitionId.includes("nations") || competitionId.includes("international");
  const travelBase = clamp(travelKm / 35);
  const travelPenalty = international
    ? 25
    : european
      ? context.isAway
        ? 35
        : 15
      : 0;
  const travelScore = clamp(Math.max(travelBase, travelPenalty));

  return clamp(densityScore * 0.4 + recoveryScore * 0.25 + travelScore * 0.2);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
