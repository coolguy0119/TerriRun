// ── Level System ───────────────────────────────────────────────
// XP thresholds for levels 1-20
const XP_TABLE = [
  0, 200, 500, 900, 1400, 2000, 2800, 3700, 4800, 6100,
  7600, 9300, 11200, 13400, 15900, 18700, 21800, 25300, 29200, 33500
];

export const MAX_LEVEL = 20;

export function calcLevel(xp) {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= XP_TABLE[i]) return Math.min(i + 1, MAX_LEVEL);
  }
  return 1;
}

export function xpProgress(xp) {
  const level = calcLevel(xp);
  if (level >= MAX_LEVEL) return { current: xp - XP_TABLE[MAX_LEVEL - 1], needed: 0, percent: 1 };
  const currentThreshold = XP_TABLE[level - 1];
  const nextThreshold = XP_TABLE[level];
  const current = xp - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  return { current, needed, percent: current / needed };
}

export function calcXPGain(distanceMeters, newCells, enemyCells) {
  const distXP = Math.round(distanceMeters / 15);
  const cellXP = newCells * 30;
  const enemyXP = enemyCells * 80; // bonus for capturing enemy territory
  return distXP + cellXP + enemyXP;
}

export function calcCoins(newCells, enemyCells) {
  return newCells * 5 + enemyCells * 20;
}

// ── League System ──────────────────────────────────────────────
export const LEAGUES = [
  { id: 'bronze',   name: '브론즈',    minCells: 0,    color: '#CD7F32', emoji: '🥉' },
  { id: 'silver',   name: '실버',      minCells: 30,   color: '#A8A9AD', emoji: '🥈' },
  { id: 'gold',     name: '골드',      minCells: 100,  color: '#FFD700', emoji: '🥇' },
  { id: 'platinum', name: '플래티넘',  minCells: 300,  color: '#E5E4E2', emoji: '💎' },
  { id: 'diamond',  name: '다이아',    minCells: 800,  color: '#B9F2FF', emoji: '💠' },
  { id: 'champion', name: '챔피언',    minCells: 2000, color: '#FF6B35', emoji: '🏆' },
];

export function getLeague(totalCells) {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (totalCells >= LEAGUES[i].minCells) return LEAGUES[i];
  }
  return LEAGUES[0];
}

export function getNextLeague(totalCells) {
  for (let i = 0; i < LEAGUES.length; i++) {
    if (totalCells < LEAGUES[i].minCells) return LEAGUES[i];
  }
  return null;
}

// ── Achievements ───────────────────────────────────────────────
export const ACHIEVEMENTS = [
  {
    id: 'first_run',
    name: '첫 달리기',
    desc: '첫 번째 달리기를 완료하세요',
    emoji: '🏃',
    xpReward: 100,
    check: (p) => p.totalRuns >= 1,
  },
  {
    id: 'cells_10',
    name: '영토 개척자',
    desc: '영토 10칸 이상 확보',
    emoji: '🗺️',
    xpReward: 150,
    check: (p) => p.totalCells >= 10,
  },
  {
    id: 'cells_50',
    name: '지역 지배자',
    desc: '영토 50칸 이상 확보',
    emoji: '🏰',
    xpReward: 300,
    check: (p) => p.totalCells >= 50,
  },
  {
    id: 'cells_200',
    name: '정복자',
    desc: '영토 200칸 이상 확보',
    emoji: '👑',
    xpReward: 800,
    check: (p) => p.totalCells >= 200,
  },
  {
    id: 'dist_5k',
    name: '5K 러너',
    desc: '누적 5km 달리기',
    emoji: '⚡',
    xpReward: 200,
    check: (p) => p.totalDistance >= 5000,
  },
  {
    id: 'dist_21k',
    name: '하프 마라토너',
    desc: '누적 21km 달리기',
    emoji: '🏅',
    xpReward: 500,
    check: (p) => p.totalDistance >= 21000,
  },
  {
    id: 'dist_42k',
    name: '마라토너',
    desc: '누적 42km 달리기',
    emoji: '🎖️',
    xpReward: 1000,
    check: (p) => p.totalDistance >= 42000,
  },
  {
    id: 'streak_3',
    name: '3일 연속 달리기',
    desc: '3일 연속으로 달리기',
    emoji: '🔥',
    xpReward: 250,
    check: (p) => p.streak >= 3,
  },
  {
    id: 'streak_7',
    name: '일주일 달리기',
    desc: '7일 연속으로 달리기',
    emoji: '💪',
    xpReward: 700,
    check: (p) => p.streak >= 7,
  },
  {
    id: 'enemy_hunter',
    name: '적 영토 탈환',
    desc: '적 영토 10칸 이상 탈환',
    emoji: '⚔️',
    xpReward: 400,
    check: (p) => (p.enemyCaptured || 0) >= 10,
  },
  {
    id: 'level_5',
    name: '레벨 5 달성',
    desc: '레벨 5에 도달',
    emoji: '⭐',
    xpReward: 300,
    check: (p) => p.level >= 5,
  },
  {
    id: 'speed_demon',
    name: '스피드 악마',
    desc: '5분/km 페이스 달성',
    emoji: '💨',
    xpReward: 500,
    check: (p) => p.bestPace < 300,
  },
];

export function checkNewAchievements(player) {
  const newOnes = [];
  for (const ach of ACHIEVEMENTS) {
    if (!player.achievements.includes(ach.id) && ach.check(player)) {
      newOnes.push(ach);
    }
  }
  return newOnes;
}

// ── Daily Missions ─────────────────────────────────────────────
export const DAILY_MISSIONS = [
  {
    id: 'run_once',
    name: '오늘의 달리기',
    desc: '달리기 1회 완료',
    emoji: '🏃',
    xpReward: 100,
    coinReward: 20,
    check: (p) => p.todayRuns >= 1,
  },
  {
    id: 'run_2k',
    name: '2km 달리기',
    desc: '오늘 총 2km 달리기',
    emoji: '📏',
    xpReward: 200,
    coinReward: 40,
    check: (p) => p.todayDistance >= 2000,
  },
  {
    id: 'capture_5',
    name: '영토 5칸 확보',
    desc: '오늘 새 영토 5칸 이상 캡처',
    emoji: '🚩',
    xpReward: 150,
    coinReward: 30,
    check: (p) => p.todayCells >= 5,
  },
];

// ── Run Completion ─────────────────────────────────────────────
export function processRunCompletion(player, runStats) {
  const { distanceMeters, newCells, enemyCells, paceSecPerKm } = runStats;

  const xpGain = calcXPGain(distanceMeters, newCells, enemyCells);
  const coinGain = calcCoins(newCells, enemyCells);

  const updated = {
    ...player,
    xp: player.xp + xpGain,
    coins: player.coins + coinGain,
    totalDistance: player.totalDistance + distanceMeters,
    totalRuns: player.totalRuns + 1,
    totalCells: player.totalCells + newCells + enemyCells,
    todayDistance: player.todayDistance + distanceMeters,
    todayRuns: player.todayRuns + 1,
    todayCells: player.todayCells + newCells + enemyCells,
    enemyCaptured: (player.enemyCaptured || 0) + enemyCells,
    bestPace: paceSecPerKm && paceSecPerKm < player.bestPace ? paceSecPerKm : player.bestPace,
  };
  updated.level = calcLevel(updated.xp);

  // Check missions
  const newlyCompleted = [];
  for (const mission of DAILY_MISSIONS) {
    if (!player.completedMissions.includes(mission.id) && mission.check(updated)) {
      newlyCompleted.push(mission);
      updated.xp += mission.xpReward;
      updated.coins += mission.coinReward;
    }
  }
  updated.completedMissions = [
    ...player.completedMissions,
    ...newlyCompleted.map((m) => m.id),
  ];

  // Check achievements
  const newAchievements = checkNewAchievements(updated);
  for (const ach of newAchievements) {
    updated.xp += ach.xpReward;
  }
  updated.achievements = [
    ...player.achievements,
    ...newAchievements.map((a) => a.id),
  ];
  updated.level = calcLevel(updated.xp);

  return { updated, xpGain, coinGain, newAchievements, newlyCompleted };
}
