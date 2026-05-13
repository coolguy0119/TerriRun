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

// ── Arena System ───────────────────────────────────────────────
// Character emoji by level bracket
export function getCharacterEmoji(level) {
  if (level >= 17) return '👑';
  if (level >= 12) return '🔥';
  if (level >= 8)  return '⚡';
  if (level >= 5)  return '🏃';
  if (level >= 3)  return '🚶';
  return '🐣';
}

// Derive character combat stats from real running history
export function calcCharacterStats(player) {
  // Speed: best pace in sec/km. 240=elite(100), 600=beginner(0)
  const speed = player.bestPace < 9999
    ? Math.min(100, Math.max(5, Math.round((600 - player.bestPace) / 3.6)))
    : 5;
  // Stamina: total km run. 100km = 100 stamina
  const stamina = Math.min(100, Math.round(player.totalDistance / 1000));
  // Power: level * 5
  const power = Math.min(100, player.level * 5);
  // Streak bonus (up to +10)
  const streakBonus = Math.min(10, player.streak);
  // Overall score used in race sim
  const overall = Math.round(speed * 0.4 + stamina * 0.35 + power * 0.2 + streakBonus * 0.5);
  return { speed, stamina, power, streakBonus, overall };
}

export const ARENAS = [
  {
    id: 'bronze',
    name: '브론즈 아레나',
    emoji: '🥉',
    requiredLevel: 1,
    color: '#CD7F32',
    desc: '누구나 입장 가능한 입문 경기장',
    winXP: 100, winCoin: 20, loseXP: 20, loseCoin: 5,
    opponents: [
      { name: '달리기 초보', emoji: '🐢', speed: 12, stamina: 8,  power: 5,  overall: 9  },
      { name: '조깅맨',     emoji: '🚶', speed: 18, stamina: 12, power: 10, overall: 14 },
      { name: '동네 러너',  emoji: '🏃', speed: 25, stamina: 18, power: 15, overall: 20 },
    ],
  },
  {
    id: 'silver',
    name: '실버 아레나',
    emoji: '🥈',
    requiredLevel: 3,
    color: '#A8A9AD',
    desc: '꾸준히 달린 러너들의 무대',
    winXP: 250, winCoin: 50, loseXP: 50, loseCoin: 10,
    opponents: [
      { name: '공원 러너',   emoji: '🏃', speed: 30, stamina: 25, power: 20, overall: 26 },
      { name: '마라톤 준비생', emoji: '⚡', speed: 38, stamina: 32, power: 25, overall: 33 },
      { name: '스피드스타',  emoji: '💨', speed: 45, stamina: 38, power: 30, overall: 39 },
    ],
  },
  {
    id: 'gold',
    name: '골드 아레나',
    emoji: '🥇',
    requiredLevel: 5,
    color: '#FFD700',
    desc: '실력 있는 러너만 입장 가능',
    winXP: 500, winCoin: 100, loseXP: 80, loseCoin: 15,
    opponents: [
      { name: '영토 사냥꾼',  emoji: '🦅', speed: 48, stamina: 45, power: 38, overall: 44 },
      { name: '새벽 러너',    emoji: '🌙', speed: 55, stamina: 52, power: 44, overall: 51 },
      { name: '트랙의 제왕',  emoji: '🔥', speed: 62, stamina: 58, power: 50, overall: 58 },
    ],
  },
  {
    id: 'platinum',
    name: '플래티넘 아레나',
    emoji: '💎',
    requiredLevel: 8,
    color: '#E5E4E2',
    desc: '엘리트 러너들의 격전지',
    winXP: 900, winCoin: 180, loseXP: 120, loseCoin: 20,
    opponents: [
      { name: '거리의 지배자',  emoji: '⚡', speed: 65, stamina: 62, power: 55, overall: 62 },
      { name: '철인 러너',      emoji: '🦾', speed: 72, stamina: 68, power: 60, overall: 68 },
      { name: '영토 왕',        emoji: '👑', speed: 78, stamina: 74, power: 66, overall: 74 },
    ],
  },
  {
    id: 'diamond',
    name: '다이아 아레나',
    emoji: '💠',
    requiredLevel: 12,
    color: '#B9F2FF',
    desc: '전설에 도전하는 최강 러너들',
    winXP: 1600, winCoin: 320, loseXP: 200, loseCoin: 30,
    opponents: [
      { name: '속도의 신',   emoji: '🌪️', speed: 80, stamina: 78, power: 72, overall: 78 },
      { name: '불사조',      emoji: '🔥', speed: 85, stamina: 82, power: 76, overall: 82 },
      { name: '다이아 킹',   emoji: '💎', speed: 88, stamina: 86, power: 80, overall: 86 },
    ],
  },
  {
    id: 'champion',
    name: '챔피언 아레나',
    emoji: '🏆',
    requiredLevel: 17,
    color: '#a855f7',
    desc: '최강자만 입장하는 전설의 경기장',
    winXP: 3000, winCoin: 600, loseXP: 300, loseCoin: 40,
    opponents: [
      { name: '챔피언 I',   emoji: '🏅', speed: 90, stamina: 88, power: 84, overall: 89 },
      { name: '챔피언 II',  emoji: '🎖️', speed: 94, stamina: 92, power: 88, overall: 93 },
      { name: '전설의 러너', emoji: '👑', speed: 98, stamina: 96, power: 92, overall: 96 },
    ],
  },
];

// ── Item System ───────────────────────────────────────────────
export const ITEMS = [
  {
    id: 'power_strike',
    name: '파워 스트라이크',
    emoji: '⚡',
    desc: '이번 달리기 동안 적 영토 피해량 2배 (2번 통과로 즉시 점령)',
    cost: 150,
  },
  {
    id: 'bomb',
    name: '폭탄',
    emoji: '💣',
    desc: '달리기 시작 시 주변 모든 적 영토 체력을 1로 감소',
    cost: 200,
  },
  {
    id: 'blitz',
    name: '블리츠',
    emoji: '🌀',
    desc: '이번 달리기 동안 적 영토 1번 통과로 즉시 점령',
    cost: 280,
  },
  {
    id: 'invasion',
    name: '대침략',
    emoji: '⚔️',
    desc: '이번 달리기 동안 이동 경로 좌우 1칸도 자동 점령',
    cost: 320,
  },
  {
    id: 'spy',
    name: '정찰대',
    emoji: '🕵️',
    desc: '즉시 주변 적 영토 50개 추가 생성 (탈환 기회 확보)',
    cost: 80,
  },
];

export function purchaseItem(player, itemId) {
  const item = ITEMS.find((i) => i.id === itemId);
  if (!item || player.coins < item.cost) return null;
  const inventory = { ...player.inventory };
  inventory[itemId] = (inventory[itemId] || 0) + 1;
  return { ...player, coins: player.coins - item.cost, inventory };
}

// ── Shield System ─────────────────────────────────────────────
export const SHIELD_COST = 100;
export const SHIELD_DURATION_MS = 24 * 60 * 60 * 1000;

export function isShielded(cell) {
  return !!(cell?.shielded && cell.shieldExpiry > Date.now());
}

export function buyShield(player, territories) {
  if (player.coins < SHIELD_COST) return null;
  const expiry = Date.now() + SHIELD_DURATION_MS;
  const updated = {};
  for (const [key, cell] of Object.entries(territories)) {
    updated[key] = cell.owner === 'player'
      ? { ...cell, shielded: true, shieldExpiry: expiry }
      : cell;
  }
  return {
    updatedPlayer: { ...player, coins: player.coins - SHIELD_COST },
    updatedTerritories: updated,
  };
}

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
