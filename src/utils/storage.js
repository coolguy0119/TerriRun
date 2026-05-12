import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PLAYER: 'player_data',
  TERRITORIES: 'territories',
  ENEMIES: 'enemy_territories',
  RUN_HISTORY: 'run_history',
};

// ── Player Data ────────────────────────────────────────────────
const DEFAULT_PLAYER = {
  name: '달리기 영웅',
  xp: 0,
  level: 1,
  coins: 0,
  totalDistance: 0,
  totalRuns: 0,
  totalCells: 0,
  todayDistance: 0,
  todayRuns: 0,
  todayCells: 0,
  lastActiveDate: null,
  streak: 0,
  bestPace: 9999,
  achievements: [],
  completedMissions: [],
};

export async function getPlayer() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PLAYER);
    return raw ? { ...DEFAULT_PLAYER, ...JSON.parse(raw) } : { ...DEFAULT_PLAYER };
  } catch { return { ...DEFAULT_PLAYER }; }
}

export async function savePlayer(data) {
  try { await AsyncStorage.setItem(KEYS.PLAYER, JSON.stringify(data)); }
  catch (e) { console.error('savePlayer', e); }
}

// ── Territory Data ─────────────────────────────────────────────
// Stored as object: { [key]: { row, col, owner, defense, capturedAt } }
export async function getTerritories() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.TERRITORIES);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function saveTerritories(data) {
  try { await AsyncStorage.setItem(KEYS.TERRITORIES, JSON.stringify(data)); }
  catch (e) { console.error('saveTerritories', e); }
}

// ── Enemy Territory Data ───────────────────────────────────────
export async function getEnemies() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ENEMIES);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveEnemies(data) {
  try { await AsyncStorage.setItem(KEYS.ENEMIES, JSON.stringify(data)); }
  catch (e) { console.error('saveEnemies', e); }
}

// ── Run History ────────────────────────────────────────────────
export async function saveRun(runData) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RUN_HISTORY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift({ ...runData, id: Date.now() });
    if (history.length > 50) history.length = 50; // keep last 50
    await AsyncStorage.setItem(KEYS.RUN_HISTORY, JSON.stringify(history));
  } catch (e) { console.error('saveRun', e); }
}

export async function getRunHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RUN_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Daily Reset ────────────────────────────────────────────────
export function checkAndResetDaily(player) {
  const today = new Date().toDateString();
  if (player.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = player.lastActiveDate === yesterday.toDateString();
    return {
      ...player,
      todayDistance: 0,
      todayRuns: 0,
      todayCells: 0,
      lastActiveDate: today,
      completedMissions: [],
      streak: wasYesterday ? player.streak : 0,
    };
  }
  return player;
}
