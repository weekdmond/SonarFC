import { useState, useEffect } from "react";

const THEMES = {
  dark: {
    appBg: "linear-gradient(180deg, #060a08, #0b120f, #08100d)",
    cardBg: "linear-gradient(160deg, #0f1512, #171d19)",
    modalBg: "linear-gradient(160deg, #0f1713, #18211c)",
    brandGradient: "linear-gradient(135deg, #18C37D, #6EE7B7)",
    accentGradient: "linear-gradient(135deg, #17B26A, #34D399)",
    accentTint: "#18C37D18",
    accentTintStrong: "#18C37D22",
    accentBorder: "#18C37D55",
    accentGlow: "#18C37D44",
    activeTabBg: "linear-gradient(135deg, #18C37D22, #6EE7B714)",
    surface: "#FFFFFF06",
    surfaceStrong: "#FFFFFF08",
    headerSurface: "#FFFFFF05",
    line: "#FFFFFF08",
    lineSoft: "#FFFFFF0A",
    lineStrong: "#FFFFFF15",
    track: "#161D19",
    text: "#FFFFFF",
    textStrong: "#FFFFFFCC",
    textMuted: "#FFFFFFAA",
    textDim: "#FFFFFF77",
    textSoft: "#FFFFFF55",
    textFaint: "#FFFFFF33",
    titleGradient: "linear-gradient(90deg, #FFFFFF, #FFFFFF88)",
    pillText: "#8EF0C0",
    modalButtonBg: "#FFFFFF15",
    summaryText: "#FFFFFFBB",
    timelineLine: "#FFFFFF18",
    timelineHomeDot: "#FFFFFF44",
    timelineAwayDot: "#FFFFFF22",
    timelineDotBorder: "#FFFFFF33",
    vsGhost: "#FFFFFF22",
    cardShadow: "0 8px 40px #00000044",
    modalShadow: "0 24px 80px #00000088",
    overlay: "#020403CC",
  },
  light: {
    appBg: "linear-gradient(180deg, #F2F5F3, #EDF2EF, #F7F9F8)",
    cardBg: "linear-gradient(160deg, #FFFFFF, #F7FAF8)",
    modalBg: "linear-gradient(160deg, #FFFFFF, #F8FBF9)",
    brandGradient: "linear-gradient(135deg, #17B26A, #52D69B)",
    accentGradient: "linear-gradient(135deg, #17B26A, #34D399)",
    accentTint: "rgba(23, 178, 106, 0.10)",
    accentTintStrong: "rgba(23, 178, 106, 0.18)",
    accentBorder: "rgba(23, 178, 106, 0.35)",
    accentGlow: "rgba(23, 178, 106, 0.18)",
    activeTabBg: "linear-gradient(135deg, rgba(23, 178, 106, 0.10), rgba(82, 214, 155, 0.06))",
    surface: "#F4F7F5",
    surfaceStrong: "#F7FAF8",
    headerSurface: "#F8FBF9",
    line: "#DCE5E0",
    lineSoft: "#E7EEEA",
    lineStrong: "#CDD8D2",
    track: "#ECF2EE",
    text: "#111815",
    textStrong: "#23302A",
    textMuted: "#33413B",
    textDim: "#66746E",
    textSoft: "#87948E",
    textFaint: "#A0ACA6",
    titleGradient: "linear-gradient(90deg, #111815, #5F6F68)",
    pillText: "#0E8F59",
    modalButtonBg: "#E7EEEA",
    summaryText: "#46534D",
    timelineLine: "#D8E1DC",
    timelineHomeDot: "#D1DBD5",
    timelineAwayDot: "#E8EFEB",
    timelineDotBorder: "#C7D1CC",
    vsGhost: "#D7E1DC",
    cardShadow: "0 10px 32px rgba(15, 23, 21, 0.08)",
    modalShadow: "0 24px 64px rgba(15, 23, 21, 0.16)",
    overlay: "rgba(11, 16, 13, 0.20)",
  },
};

const MATCHES = [
  {
    id: 1,
    league: "Premier League",
    leagueIcon: "🏴",
    matchday: "Matchday 34",
    date: "Sat, Apr 11 · 20:30",
    venue: "Anfield, Liverpool",
    home: {
      name: "Liverpool",
      short: "LIV",
      color: "#C8102E",
      colorLight: "#C8102E22",
      badge: "🔴",
      fatigue: 72,
      squadAvail: 88,
      momentum: [3, 3, 1, 3, 3],
      momentumLabels: ["ARS(A)", "WOL(H)", "EVE(A)", "BOU(H)", "WHU(A)"],
      recentResults: ["W", "W", "D", "W", "W"],
      schedDensity: 4,
      schedWindow: 14,
      travelKm: 2840,
      keyAbsent: ["Diogo Jota", "Harvey Elliott"],
      keyFatigued: [
        { name: "Mo Salah", mins: 352, age: 33, level: "high" },
        { name: "Virgil van Dijk", mins: 360, age: 34, level: "high" },
        { name: "Trent Alexander-Arnold", mins: 310, age: 27, level: "medium" },
      ],
      schedule: [
        { day: -13, opponent: "ARS", home: false, comp: "PL" },
        { day: -10, opponent: "ATM", home: true, comp: "UCL" },
        { day: -6, opponent: "WOL", home: true, comp: "PL" },
        { day: -3, opponent: "EVE", home: false, comp: "PL" },
        { day: 0, opponent: "MCI", home: true, comp: "PL", current: true },
        { day: 4, opponent: "PSG", home: false, comp: "UCL" },
        { day: 7, opponent: "NEW", home: true, comp: "PL" },
      ],
      aiSummary:
        "利物浦过去14天踢了4场比赛，萨拉赫和范戴克累计出场超350分钟。周中经历默西塞德德比客场作战，核心球员疲劳指数偏高。但主场优势和近期连胜势头是关键利好。",
    },
    away: {
      name: "Man City",
      short: "MCI",
      color: "#6CABDD",
      colorLight: "#6CABDD22",
      badge: "🔵",
      fatigue: 45,
      squadAvail: 92,
      momentum: [3, 0, 3, 1, 3],
      momentumLabels: ["CHE(H)", "TOT(A)", "NFO(H)", "BHA(A)", "LEI(H)"],
      recentResults: ["W", "L", "W", "D", "W"],
      schedDensity: 2,
      schedWindow: 14,
      travelKm: 680,
      keyAbsent: ["Óscar Bobb"],
      keyFatigued: [
        { name: "Erling Haaland", mins: 248, age: 25, level: "medium" },
        { name: "Rodri", mins: 180, age: 29, level: "low" },
      ],
      schedule: [
        { day: -12, opponent: "CHE", home: true, comp: "PL" },
        { day: -5, opponent: "NFO", home: true, comp: "PL" },
        { day: 0, opponent: "LIV", home: false, comp: "PL", current: true },
        { day: 4, opponent: "BRU", home: true, comp: "UCL" },
        { day: 8, opponent: "ARS", home: false, comp: "PL" },
      ],
      aiSummary:
        "曼城过去两周仅踢2场，且均为主场，旅行负担极小。哈兰德和罗德里体能充沛，阵容接近全员可用。但客场挑战安菲尔德历史胜率偏低，心理压力是隐性变量。",
    },
  },
  {
    id: 2,
    league: "La Liga",
    leagueIcon: "🇪🇸",
    matchday: "Jornada 32",
    date: "Sun, Apr 12 · 21:00",
    venue: "Santiago Bernabéu, Madrid",
    home: {
      name: "Real Madrid",
      short: "RMA",
      color: "#FEBE10",
      colorLight: "#FEBE1022",
      badge: "⚪",
      fatigue: 68,
      squadAvail: 82,
      momentum: [3, 3, 0, 3, 1],
      momentumLabels: ["SEV(A)", "VIL(H)", "ATM(A)", "GET(H)", "CEL(A)"],
      recentResults: ["W", "W", "L", "W", "D"],
      schedDensity: 5,
      schedWindow: 14,
      travelKm: 3200,
      keyAbsent: ["Aurélien Tchouaméni", "Eduardo Camavinga", "Dani Carvajal"],
      keyFatigued: [
        { name: "Vinícius Jr", mins: 380, age: 25, level: "high" },
        { name: "Jude Bellingham", mins: 340, age: 22, level: "medium" },
      ],
      schedule: [
        { day: -14, opponent: "SEV", home: false, comp: "LL" },
        { day: -11, opponent: "BAY", home: false, comp: "UCL" },
        { day: -7, opponent: "VIL", home: true, comp: "LL" },
        { day: -4, opponent: "ATM", home: false, comp: "LL" },
        { day: -1, opponent: "BAY", home: true, comp: "UCL" },
        { day: 0, opponent: "BAR", home: true, comp: "LL", current: true },
        { day: 5, opponent: "VAL", home: false, comp: "LL" },
      ],
      aiSummary:
        "皇马经历14天5赛的魔鬼赛程，含两回合拜仁欧冠和马德里德比。维尼修斯出场380分钟高居全队之首，且3名主力中场因伤缺阵，阵容深度受到严峻考验。",
    },
    away: {
      name: "Barcelona",
      short: "BAR",
      color: "#A50044",
      colorLight: "#A5004422",
      badge: "🔵🔴",
      fatigue: 52,
      squadAvail: 95,
      momentum: [3, 3, 3, 3, 1],
      momentumLabels: ["RSO(H)", "BET(A)", "ESP(H)", "GIR(A)", "MAL(H)"],
      recentResults: ["W", "W", "W", "W", "D"],
      schedDensity: 3,
      schedWindow: 14,
      travelKm: 1100,
      keyAbsent: ["Frenkie de Jong"],
      keyFatigued: [
        { name: "Lamine Yamal", mins: 260, age: 18, level: "low" },
        { name: "Pedri", mins: 285, age: 23, level: "medium" },
      ],
      schedule: [
        { day: -11, opponent: "RSO", home: true, comp: "LL" },
        { day: -7, opponent: "BET", home: false, comp: "LL" },
        { day: -3, opponent: "ESP", home: true, comp: "LL" },
        { day: 0, opponent: "RMA", home: false, comp: "LL", current: true },
        { day: 4, opponent: "LIL", home: true, comp: "UCL" },
      ],
      aiSummary:
        "巴萨赛程相对轻松，过去两周3场且无欧冠压力。拉米尼·亚马尔体能充沛，球队近4场全胜势头强劲。仅弗兰基·德容长期缺阵，阵容完整度全联赛最高水平。",
    },
  },
];

const lerp = (a, b, t) => a + (b - a) * t;
const fatigueColor = (v) =>
  v > 65 ? "#EF4444" : v > 45 ? "#F59E0B" : "#22C55E";
const fatigueLabel = (v) =>
  v > 65 ? "疲劳偏高" : v > 45 ? "中等负荷" : "体能充沛";
const levelColor = (l) =>
  l === "high" ? "#EF4444" : l === "medium" ? "#F59E0B" : "#22C55E";

function AnimatedNumber({ value, suffix = "", duration = 1200 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = null;

    const step = (ts) => {
      if (!start) {
        start = ts;
      }

      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(lerp(0, value, progress)));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

function EnergyBar({ value, delay = 0, theme }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(100 - value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const bg = fatigueColor(value);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 32,
        borderRadius: 8,
        background: theme.track,
        overflow: "hidden",
        border: `1px solid ${theme.lineStrong}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${width}%`,
          background: `linear-gradient(90deg, ${bg}DD, ${bg}88)`,
          borderRadius: 8,
          transition: "width 1.2s cubic-bezier(.4,0,.2,1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: theme.text,
          letterSpacing: 1,
          textShadow: "0 1px 4px #0008",
        }}
      >
        {fatigueLabel(value)} · {value}
      </div>
    </div>
  );
}

function MomentumDots({ data, results, labels, theme }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        alignItems: "flex-end",
        height: 64,
        padding: "0 4px",
      }}
    >
      {data.map((value, index) => {
        const height = value === 3 ? 48 : value === 1 ? 28 : 14;
        const bg = value === 3 ? "#22C55E" : value === 1 ? "#F59E0B" : "#EF4444";

        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: bg,
                fontWeight: 800,
                opacity: 0.9,
              }}
            >
              {results[index]}
            </div>
            <div
              style={{
                width: "100%",
                maxWidth: 32,
                height,
                borderRadius: 6,
                background: `linear-gradient(180deg, ${bg}CC, ${bg}44)`,
                transition: "height 0.8s cubic-bezier(.4,0,.2,1)",
                transitionDelay: `${index * 100}ms`,
              }}
            />
            <div
              style={{
                fontSize: 8,
                color: theme.textDim,
                whiteSpace: "nowrap",
                letterSpacing: 0.3,
              }}
            >
              {labels[index]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleTimeline({ schedule, color, theme }) {
  const minDay = Math.min(...schedule.map((item) => item.day));
  const maxDay = Math.max(...schedule.map((item) => item.day));
  const range = maxDay - minDay || 1;

  return (
    <div style={{ position: "relative", height: 56, margin: "8px 0" }}>
      <div
        style={{
          position: "absolute",
          top: 22,
          left: 16,
          right: 16,
          height: 2,
          background: theme.timelineLine,
          borderRadius: 1,
        }}
      />
      {schedule.map((item, index) => {
        const left = ((item.day - minDay) / range) * 100;
        const isCurrent = item.current;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `calc(${left}% )`,
              top: 0,
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: isCurrent ? theme.text : theme.textSoft,
                fontWeight: isCurrent ? 800 : 500,
                letterSpacing: 0.5,
              }}
            >
              {item.comp}
            </div>
            <div
              style={{
                width: isCurrent ? 18 : 10,
                height: isCurrent ? 18 : 10,
                borderRadius: "50%",
                background: isCurrent
                  ? color
                  : item.home
                    ? theme.timelineHomeDot
                    : theme.timelineAwayDot,
                border: isCurrent ? `2px solid ${theme.text}` : `1px solid ${theme.timelineDotBorder}`,
                boxShadow: isCurrent ? `0 0 12px ${color}88` : "none",
                transition: "all 0.5s",
              }}
            />
            <div
              style={{
                fontSize: 9,
                color: isCurrent ? theme.text : theme.textDim,
                fontWeight: isCurrent ? 700 : 400,
              }}
            >
              {item.opponent}
            </div>
            {!isCurrent && (
              <div style={{ fontSize: 7, color: theme.textFaint }}>
                {item.day > 0 ? `+${item.day}d` : `${item.day}d`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeamPanel({ team, side, theme }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexDirection: side === "away" ? "row-reverse" : "row",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${team.color}44, ${team.color}11)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            border: `1px solid ${team.color}55`,
          }}
        >
          {team.badge}
        </div>
        <div style={{ textAlign: side === "away" ? "right" : "left" }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: theme.text,
              letterSpacing: -0.5,
            }}
          >
            {team.name}
          </div>
          <div style={{ fontSize: 11, color: theme.textSoft, letterSpacing: 1 }}>
            {side === "home" ? "主场" : "客场"}
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 11, color: theme.textDim, fontWeight: 600 }}>
            ⚡ 疲劳指数
          </span>
          <span
            style={{
              fontSize: 11,
              color: fatigueColor(team.fatigue),
              fontWeight: 700,
            }}
          >
            <AnimatedNumber value={team.fatigue} suffix="/100" />
          </span>
        </div>
        <EnergyBar value={team.fatigue} delay={300} theme={theme} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {[
          {
            label: "阵容可用",
            value: `${team.squadAvail}%`,
            icon: "👥",
            color:
              team.squadAvail > 90
                ? "#22C55E"
                : team.squadAvail > 80
                  ? "#F59E0B"
                  : "#EF4444",
          },
          {
            label: `${team.schedWindow}天赛程`,
            value: `${team.schedDensity}场`,
            icon: "📅",
            color:
              team.schedDensity <= 2
                ? "#22C55E"
                : team.schedDensity <= 3
                  ? "#F59E0B"
                  : "#EF4444",
          },
          {
            label: "旅行距离",
            value: `${(team.travelKm / 1000).toFixed(1)}k km`,
            icon: "✈️",
            color:
              team.travelKm < 1000
                ? "#22C55E"
                : team.travelKm < 2000
                  ? "#F59E0B"
                  : "#EF4444",
          },
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              background: theme.surfaceStrong,
              borderRadius: 10,
              padding: "10px 8px",
              textAlign: "center",
              border: `1px solid ${theme.lineSoft}`,
            }}
          >
            <div style={{ fontSize: 16 }}>{stat.icon}</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: stat.color,
                marginTop: 4,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 9,
                color: theme.textSoft,
                marginTop: 2,
                letterSpacing: 0.3,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            color: theme.textDim,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          📈 近5场势头
        </div>
        <MomentumDots
          data={team.momentum}
          results={team.recentResults}
          labels={team.momentumLabels}
          theme={theme}
        />
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            color: theme.textDim,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          🏃 关键球员负荷
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {team.keyFatigued.map((player, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: theme.surface,
                borderRadius: 8,
                padding: "8px 10px",
                border: `1px solid ${levelColor(player.level)}22`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: levelColor(player.level),
                  boxShadow: `0 0 6px ${levelColor(player.level)}66`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: theme.textStrong,
                    fontWeight: 600,
                  }}
                >
                  {player.name}
                </div>
                <div style={{ fontSize: 9, color: theme.textFaint }}>
                  {player.age}岁 · 近14天{player.mins}分钟
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: levelColor(player.level),
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {player.level === "high"
                  ? "⚠️ 高负荷"
                  : player.level === "medium"
                    ? "中等"
                    : "✅ 充沛"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {team.keyAbsent.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: theme.textDim,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            🚑 缺阵球员
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {team.keyAbsent.map((player, index) => (
              <span
                key={index}
                style={{
                  fontSize: 10,
                  color: "#EF4444CC",
                  background: "#EF444418",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                ✕ {player}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div
          style={{
            fontSize: 11,
            color: theme.textDim,
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          🗓 赛程时间轴
        </div>
        <ScheduleTimeline schedule={team.schedule} color={team.color} theme={theme} />
      </div>
    </div>
  );
}

function AISummary({ match, onClose, theme }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: theme.overlay,
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: theme.modalBg,
          borderRadius: 20,
          padding: 28,
          maxWidth: 600,
          width: "100%",
          border: `1px solid ${theme.lineStrong}`,
          boxShadow: theme.modalShadow,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: theme.text,
              letterSpacing: 0.5,
            }}
          >
            🤖 AI 赛前状态分析
          </div>
          <button
            onClick={onClose}
            style={{
              background: theme.modalButtonBg,
              border: "none",
              borderRadius: 8,
              color: theme.text,
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 20 }}>{match.home.badge}</span>
          <span
            style={{ fontSize: 13, fontWeight: 700, color: match.home.color }}
          >
            {match.home.name}
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: theme.summaryText,
            lineHeight: 1.7,
            margin: "0 0 20px 0",
            padding: "12px 14px",
            background: `${match.home.color}0A`,
            borderRadius: 10,
            borderLeft: `3px solid ${match.home.color}66`,
          }}
        >
          {match.home.aiSummary}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 20 }}>{match.away.badge}</span>
          <span
            style={{ fontSize: 13, fontWeight: 700, color: match.away.color }}
          >
            {match.away.name}
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: theme.summaryText,
            lineHeight: 1.7,
            margin: 0,
            padding: "12px 14px",
            background: `${match.away.color}0A`,
            borderRadius: 10,
            borderLeft: `3px solid ${match.away.color}66`,
          }}
        >
          {match.away.aiSummary}
        </p>

        <div
          style={{
            marginTop: 20,
            fontSize: 10,
            color: theme.textFaint,
            textAlign: "center",
          }}
        >
          基于赛程、出场数据和疲劳模型生成 · SonarFC Engine
        </div>
      </div>
    </div>
  );
}

function VSBadge({ home, away, theme }) {
  const diff = home.fatigue - away.fatigue;
  const advantage =
    Math.abs(diff) < 10 ? "势均力敌" : diff > 0 ? `${away.short}体能占优` : `${home.short}体能占优`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "0 8px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: theme.vsGhost,
          letterSpacing: 4,
        }}
      >
        VS
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#D2F8E4",
          background: theme.accentTint,
          padding: "3px 8px",
          borderRadius: 20,
          whiteSpace: "nowrap",
          fontWeight: 600,
          border: `1px solid ${theme.accentTintStrong}`,
        }}
      >
        {advantage}
      </div>
    </div>
  );
}

function MatchCard({ match, theme }) {
  const [showAI, setShowAI] = useState(false);

  return (
    <>
      <div
        style={{
          background: theme.cardBg,
          borderRadius: 24,
          border: `1px solid ${theme.lineSoft}`,
          overflow: "hidden",
          boxShadow: theme.cardShadow,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            background: theme.headerSurface,
            borderBottom: `1px solid ${theme.line}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{match.leagueIcon}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: theme.textMuted,
                letterSpacing: 0.5,
              }}
            >
              {match.league}
            </span>
            <span style={{ fontSize: 10, color: theme.textFaint }}>
              · {match.matchday}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: theme.textDim }}>
              {match.date}
            </span>
            <button
              onClick={() => setShowAI(true)}
              style={{
                background: theme.accentGradient,
                border: "none",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: theme.text,
                cursor: "pointer",
                letterSpacing: 0.3,
                boxShadow: `0 2px 12px ${theme.accentGlow}`,
              }}
            >
              🤖 AI 分析
            </button>
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "8px 0 4px",
            fontSize: 10,
            color: theme.textFaint,
            letterSpacing: 0.5,
          }}
        >
          📍 {match.venue}
        </div>

        <div
          style={{
            display: "flex",
            padding: "12px 24px 28px",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <TeamPanel team={match.home} side="home" theme={theme} />
          <VSBadge home={match.home} away={match.away} theme={theme} />
          <TeamPanel team={match.away} side="away" theme={theme} />
        </div>
      </div>

      {showAI && <AISummary match={match} onClose={() => setShowAI(false)} theme={theme} />}
    </>
  );
}

export default function SonarFC() {
  const [activeMatch, setActiveMatch] = useState(0);
  const [themeMode, setThemeMode] = useState("dark");
  const theme = THEMES[themeMode];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.appBg,
        fontFamily:
          "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: theme.text,
        padding: "0 0 40px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 32px",
          borderBottom: `1px solid ${theme.line}`,
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: theme.brandGradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: -0.5,
              background: theme.titleGradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            SonarFC
          </span>
          <span
            style={{
              fontSize: 9,
              color: theme.pillText,
              background: theme.accentTint,
              padding: "2px 8px",
              borderRadius: 20,
              fontWeight: 700,
              letterSpacing: 1,
              border: `1px solid ${theme.accentTintStrong}`,
            }}
          >
            BETA
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ fontSize: 12, color: theme.textFaint }}>
            赛前状态探测 · Pre-match Condition Sonar
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: 3,
              borderRadius: 999,
              background: theme.surfaceStrong,
              border: `1px solid ${theme.lineSoft}`,
            }}
          >
            {[
              { id: "dark", label: "深色" },
              { id: "light", label: "浅色" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setThemeMode(item.id)}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  background:
                    themeMode === item.id ? theme.accentGradient : "transparent",
                  color: themeMode === item.id ? theme.text : theme.textDim,
                  boxShadow:
                    themeMode === item.id
                      ? `0 2px 10px ${theme.accentGlow}`
                      : "none",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "16px 32px",
          overflowX: "auto",
        }}
      >
        {MATCHES.map((match, index) => (
          <button
            key={match.id}
            onClick={() => setActiveMatch(index)}
            style={{
              background:
                activeMatch === index
                  ? theme.activeTabBg
                  : theme.surfaceStrong,
              border:
                activeMatch === index
                  ? `1px solid ${theme.accentBorder}`
                  : `1px solid ${theme.lineSoft}`,
              borderRadius: 12,
              padding: "10px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              transition: "all 0.3s",
            }}
          >
            <span style={{ fontSize: 14 }}>{match.home.badge}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: activeMatch === index ? theme.text : theme.textDim,
              }}
            >
              {match.home.short} vs {match.away.short}
            </span>
            <span style={{ fontSize: 14 }}>{match.away.badge}</span>
            <span
              style={{
                fontSize: 9,
                color: theme.textFaint,
                marginLeft: 4,
              }}
            >
              {match.leagueIcon} {match.league}
            </span>
          </button>
        ))}
      </div>

      <div style={{ padding: "0 32px", maxWidth: 1100, margin: "0 auto" }}>
        <MatchCard match={MATCHES[activeMatch]} theme={theme} />
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: 32,
          fontSize: 10,
          color: theme.textFaint,
          letterSpacing: 0.5,
        }}
      >
        SonarFC © 2026 · 数据基于公开赛程与出场记录 · 疲劳指数由 SonarFC Engine 计算
      </div>
    </div>
  );
}
