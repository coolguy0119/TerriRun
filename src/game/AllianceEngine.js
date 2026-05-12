export const ENEMY_ALLIANCES = [
  { id: 'red_wolves',   name: '레드 울브즈',   tag: 'RW', color: '#ef4444', cells: 450, wins: 12, desc: '공격적인 달리기 전문 연맹' },
  { id: 'blue_hawks',   name: '블루 호크스',   tag: 'BH', color: '#3b82f6', cells: 320, wins: 8,  desc: '전략적 영토 확장 연맹' },
  { id: 'gold_tigers',  name: '골드 타이거즈', tag: 'GT', color: '#f59e0b', cells: 280, wins: 6,  desc: '스피드 특화 엘리트 연맹' },
  { id: 'dark_bears',   name: '다크 베어즈',   tag: 'DB', color: '#8b5cf6', cells: 190, wins: 3,  desc: '신생 연맹 — 빠르게 성장 중' },
];

export const BATTLE_GAMES = [
  {
    id: 'tap_battle',
    name: '번개 탭',
    emoji: '⚡',
    desc: '10초 안에 최대한 빠르게 탭! 탭 수 × 2 BP',
    bpPerUnit: 2,
  },
  {
    id: 'target_shot',
    name: '조준 사격',
    emoji: '🎯',
    desc: '15초 동안 움직이는 타겟을 정확하게 탭! 명중 × 8 BP',
    bpPerUnit: 8,
  },
  {
    id: 'territory_rush',
    name: '영토 돌격',
    emoji: '🗺️',
    desc: '12초 안에 격자판 셀을 최대한 많이 점령! 칸 × 5 BP',
    bpPerUnit: 5,
  },
];

export const ATTACK_COST = 100;   // BP to attack (removes 10 enemy cells)
export const DEFEND_COST = 50;    // BP to reinforce defense

export function createAlliance(name, tag, color) {
  return { name: name.trim(), tag: tag.trim().toUpperCase(), color, battlePoints: 0, wins: 0, attackedAlliances: {} };
}

export function canAttack(alliance) {
  return alliance && alliance.battlePoints >= ATTACK_COST;
}

export function doAttack(alliance, targetId, enemies) {
  if (!canAttack(alliance)) return null;
  const keys = Object.keys(enemies);
  const toRemove = keys.sort(() => Math.random() - 0.5).slice(0, 10);
  const updatedEnemies = { ...enemies };
  toRemove.forEach((k) => delete updatedEnemies[k]);
  const updatedAlliance = {
    ...alliance,
    battlePoints: alliance.battlePoints - ATTACK_COST,
    wins: alliance.wins + 1,
    attackedAlliances: {
      ...alliance.attackedAlliances,
      [targetId]: (alliance.attackedAlliances?.[targetId] || 0) + 1,
    },
  };
  return { updatedAlliance, updatedEnemies, removedCount: toRemove.length };
}
