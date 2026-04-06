import { useState, useEffect, useRef } from "react";

const MATCHES = [
  {
    id: 1,
    league: "Premier League",
    leagueIcon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
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

// -- tiny helpers --
const lerp = (a, b, t) => a + (b - a) * t;
const fatigueColor = (v) =>
  v > 65 ? "#EF4444" : v > 45 ? "#F59E0B" : "#22C55E";
const fatigueLabel = (v) =>
  v > 65 ? "疲劳偏高" : v > 45 ? "中等负荷" : "体能充沛";
const levelColor = (l) =>
  l === "high" ? "#EF4444" : l === "medium" ? "#F59E0B" : "#22C55E";

// ── AnimatedNumber ──
function AnimatedNumber({ value, suffix = "", duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(lerp(0, value, p)));
      if (p < 1) requestAnimationFrame(step);
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

// ── Battery / Energy Bar ──
function EnergyBar({ value, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(100 - value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  const bg = fatigueColor(value);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 32,
        borderRadius: 8,
        background: "#1a1a2e",
        overflow: "hidden",
        border: "1px solid #ffffff12",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${width}%`,
          background: `linear-gradient(90deg, ${bg}dd, ${bg}88)`,
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
          color: "#fff",
          letterSpacing: 1,
          textShadow: "0 1px 4px #0008",
        }}
      >
        {fatigueLabel(value)} · {value}
      </div>
    </div>
  );
}

// ── Momentum Dots ──
function MomentumDots({ data, results, labels, color }) {
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
      {data.map((v, i) => {
        const h = v === 3 ? 48 : v === 1 ? 28 : 14;
        const bg = v === 3 ? "#22C55E" : v === 1 ? "#F59E0B" : "#EF4444";
        return (
          <div
            key={i}
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
              {results[i]}
            </div>
            <div
              style={{
                width: "100%",
                maxWidth: 32,
                height: h,
                borderRadius: 6,
                background: `linear-gradient(180deg, ${bg}cc, ${bg}44)`,
                transition: "height 0.8s cubic-bezier(.4,0,.2,1)",
                transitionDelay: `${i * 100}ms`,
              }}
            />
            <div
              style={{
                fontSize: 8,
                color: "#ffffff66",
                whiteSpace: "nowrap",
                letterSpacing: 0.3,
              }}
            >
              {labels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Schedule Timeline ──
function ScheduleTimeline({ schedule, color }) {
  const minDay = Math.min(...schedule.map((s) => s.day));
  const maxDay = Math.max(...schedule.map((s) => s.day));
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
          background: "#ffffff18",
          borderRadius: 1,
        }}
      />
      {schedule.map((s, i) => {
        const left = ((s.day - minDay) / range) * 100;
        const isCurrent = s.current;
        return (
          <div
            key={i}
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
                color: isCurrent ? "#fff" : "#ffffff55",
                fontWeight: isCurrent ? 800 : 500,
                letterSpacing: 0.5,
              }}
            >
              {s.comp}
            </div>
            <div
              style={{
                width: isCurrent ? 18 : 10,
                height: isCurrent ? 18 : 10,
                borderRadius: "50%",
                background: isCurrent
                  ? color
                  : s.home
                    ? "#ffffff44"
                    : "#ffffff22",
                border: isCurrent ? "2px solid #fff" : "1px solid #ffffff33",
                boxShadow: isCurrent ? `0 0 12px ${color}88` : "none",
                transition: "all 0.5s",
              }}
            />
            <div
              style={{
                fontSize: 9,
                color: isCurrent ? "#fff" : "#ffffff66",
                fontWeight: isCurrent ? 700 : 400,
              }}
            >
              {s.opponent}
            </div>
            {!isCurrent && (
              <div style={{ fontSize: 7, color: "#ffffff33" }}>
                {s.day > 0 ? `+${s.day}d` : `${s.day}d`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Team Panel ──
function TeamPanel({ team, side }) {
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
      {/* Header */}
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
              color: "#fff",
              letterSpacing: -0.5,
            }}
          >
            {team.name}
          </div>
          <div style={{ fontSize: 11, color: "#ffffff55", letterSpacing: 1 }}>
            {side === "home" ? "主场" : "客场"}
          </div>
        </div>
      </div>

      {/* Fatigue */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 11, color: "#ffffff77", fontWeight: 600 }}>
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
        <EnergyBar value={team.fatigue} color={team.color} delay={300} />
      </div>

      {/* Quick Stats */}
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
        ].map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: "#ffffff08",
              borderRadius: 10,
              padding: "10px 8px",
              textAlign: "center",
              border: "1px solid #ffffff0a",
            }}
          >
            <div style={{ fontSize: 16 }}>{s.icon}</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: s.color,
                marginTop: 4,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#ffffff55",
                marginTop: 2,
                letterSpacing: 0.3,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Momentum */}
      <div>
        <div
          style={{
            fontSize: 11,
            color: "#ffffff77",
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
          color={team.color}
        />
      </div>

      {/* Key Fatigued Players */}
      <div>
        <div
          style={{
            fontSize: 11,
            color: "#ffffff77",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          🏃 关键球员负荷
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {team.keyFatigued.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#ffffff06",
                borderRadius: 8,
                padding: "8px 10px",
                border: `1px solid ${levelColor(p.level)}22`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: levelColor(p.level),
                  boxShadow: `0 0 6px ${levelColor(p.level)}66`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#ffffffcc",
                    fontWeight: 600,
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 9, color: "#ffffff44" }}>
                  {p.age}岁 · 近14天{p.mins}分钟
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: levelColor(p.level),
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {p.level === "high"
                  ? "⚠️ 高负荷"
                  : p.level === "medium"
                    ? "中等"
                    : "✅ 充沛"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Absent Players */}
      {team.keyAbsent.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#ffffff77",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            🚑 缺阵球员
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {team.keyAbsent.map((p, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  color: "#EF4444cc",
                  background: "#EF444418",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                ✕ {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Timeline */}
      <div>
        <div
          style={{
            fontSize: 11,
            color: "#ffffff77",
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          🗓 赛程时间轴
        </div>
        <ScheduleTimeline schedule={team.schedule} color={team.color} />
      </div>
    </div>
  );
}

// ── AI Summary Modal ──
function AISummary({ match, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000cc",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #0f0f23, #1a1a35)",
          borderRadius: 20,
          padding: 28,
          maxWidth: 600,
          width: "100%",
          border: "1px solid #ffffff15",
          boxShadow: "0 24px 80px #00000088",
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
              color: "#fff",
              letterSpacing: 0.5,
            }}
          >
            🤖 AI 赛前状态分析
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#ffffff15",
              border: "none",
              borderRadius: 8,
              color: "#fff",
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
            color: "#ffffffbb",
            lineHeight: 1.7,
            margin: "0 0 20px 0",
            padding: "12px 14px",
            background: `${match.home.color}0a`,
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
            color: "#ffffffbb",
            lineHeight: 1.7,
            margin: 0,
            padding: "12px 14px",
            background: `${match.away.color}0a`,
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
            color: "#ffffff33",
            textAlign: "center",
          }}
        >
          基于赛程、出场数据和疲劳模型生成 · SonarFC Engine
        </div>
      </div>
    </div>
  );
}

// ── VS Badge ──
function VSBadge({ home, away }) {
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
          color: "#ffffff22",
          letterSpacing: 4,
        }}
      >
        VS
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#ffffff55",
          background: "#ffffff0a",
          padding: "3px 8px",
          borderRadius: 20,
          whiteSpace: "nowrap",
          fontWeight: 600,
        }}
      >
        {advantage}
      </div>
    </div>
  );
}

// ── Match Card ──
function MatchCard({ match }) {
  const [showAI, setShowAI] = useState(false);
  return (
    <>
      <div
        style={{
          background: "linear-gradient(160deg, #0d0d1f, #141428)",
          borderRadius: 24,
          border: "1px solid #ffffff0c",
          overflow: "hidden",
          boxShadow: "0 8px 40px #00000044",
        }}
      >
        {/* Match Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            background: "#ffffff06",
            borderBottom: "1px solid #ffffff08",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{match.leagueIcon}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#ffffffaa",
                letterSpacing: 0.5,
              }}
            >
              {match.league}
            </span>
            <span style={{ fontSize: 10, color: "#ffffff44" }}>
              · {match.matchday}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#ffffff66" }}>
              {match.date}
            </span>
            <button
              onClick={() => setShowAI(true)}
              style={{
                background:
                  "linear-gradient(135deg, #6366F1, #8B5CF6)",
                border: "none",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                cursor: "pointer",
                letterSpacing: 0.3,
                boxShadow: "0 2px 12px #6366F144",
              }}
            >
              🤖 AI 分析
            </button>
          </div>
        </div>

        {/* Venue */}
        <div
          style={{
            textAlign: "center",
            padding: "8px 0 4px",
            fontSize: 10,
            color: "#ffffff33",
            letterSpacing: 0.5,
          }}
        >
          📍 {match.venue}
        </div>

        {/* Two columns */}
        <div
          style={{
            display: "flex",
            padding: "12px 24px 28px",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <TeamPanel team={match.home} side="home" />
          <VSBadge home={match.home} away={match.away} />
          <TeamPanel team={match.away} side="away" />
        </div>
      </div>

      {showAI && <AISummary match={match} onClose={() => setShowAI(false)} />}
    </>
  );
}

// ── Main App ──
export default function SonarFC() {
  const [activeMatch, setActiveMatch] = useState(0);
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #06060f, #0a0a1a, #08081a)",
        fontFamily:
          "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#fff",
        padding: "0 0 40px 0",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 32px",
          borderBottom: "1px solid #ffffff08",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366F1, #EC4899)",
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
              background: "linear-gradient(90deg, #fff, #ffffff88)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            SonarFC
          </span>
          <span
            style={{
              fontSize: 9,
              color: "#6366F1",
              background: "#6366F118",
              padding: "2px 8px",
              borderRadius: 20,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            BETA
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#ffffff44" }}>
          赛前状态探测 · Pre-match Condition Sonar
        </div>
      </div>

      {/* Match Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "16px 32px",
          overflowX: "auto",
        }}
      >
        {MATCHES.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setActiveMatch(i)}
            style={{
              background:
                activeMatch === i
                  ? "linear-gradient(135deg, #6366F133, #8B5CF622)"
                  : "#ffffff08",
              border:
                activeMatch === i
                  ? "1px solid #6366F155"
                  : "1px solid #ffffff0a",
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
            <span style={{ fontSize: 14 }}>
              {m.home.badge}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: activeMatch === i ? "#fff" : "#ffffff66",
              }}
            >
              {m.home.short} vs {m.away.short}
            </span>
            <span style={{ fontSize: 14 }}>
              {m.away.badge}
            </span>
            <span
              style={{
                fontSize: 9,
                color: "#ffffff44",
                marginLeft: 4,
              }}
            >
              {m.leagueIcon} {m.league}
            </span>
          </button>
        ))}
      </div>

      {/* Active Match */}
      <div style={{ padding: "0 32px", maxWidth: 1100, margin: "0 auto" }}>
        <MatchCard match={MATCHES[activeMatch]} />
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          marginTop: 32,
          fontSize: 10,
          color: "#ffffff22",
          letterSpacing: 0.5,
        }}
      >
        SonarFC © 2026 · 数据基于公开赛程与出场记录 · 疲劳指数由 SonarFC Engine 计算
      </div>
    </div>
  );
}
