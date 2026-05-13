import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, onValue, off, update, get } from 'firebase/database';

// ── 설정 방법 ──────────────────────────────────────────────────
// Firebase 콘솔(console.firebase.google.com)에서 프로젝트를 만들고
// Realtime Database를 활성화한 뒤 아래 값을 입력하세요.
const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',   // 예: 'https://your-project.firebaseio.com'
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

function isConfigured() {
  return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL);
}

let db = null;

function getDb() {
  if (!isConfigured()) return null;
  if (!db) {
    const app = getApps().length === 0
      ? initializeApp(FIREBASE_CONFIG)
      : getApps()[0];
    db = getDatabase(app);
  }
  return db;
}

// ── 내 영토 동기화 ─────────────────────────────────────────────
export async function syncMyTerritories(playerId, territories) {
  const database = getDb();
  if (!database) return;
  try {
    // 영토를 요약해서 저장 (전체 저장 시 데이터가 너무 커질 수 있음)
    const summary = {
      count: Object.keys(territories).length,
      cellKeys: Object.keys(territories).slice(0, 200),
      updatedAt: Date.now(),
    };
    await set(ref(database, `players/${playerId}/territories`), summary);
  } catch (e) { console.warn('[Firebase] syncMyTerritories:', e.message); }
}

// ── 내 위치 업데이트 ───────────────────────────────────────────
export async function updateMyPosition(playerId, lat, lng, playerName) {
  const database = getDb();
  if (!database) return;
  try {
    await update(ref(database, `players/${playerId}`), {
      lat, lng,
      name: playerName ?? '달리기 영웅',
      lastSeen: Date.now(),
    });
  } catch {}
}

// ── 주변 플레이어 실시간 구독 ──────────────────────────────────
// onUpdate(players: Array<{id, lat, lng, name, lastSeen}>)
// 반환값: unsubscribe 함수
export function watchNearbyPlayers(myPlayerId, onUpdate) {
  const database = getDb();
  if (!database) return () => {};
  const playersRef = ref(database, 'players');
  onValue(playersRef, (snapshot) => {
    const data = snapshot.val() ?? {};
    const now = Date.now();
    const nearby = Object.entries(data)
      .filter(([id, p]) => id !== myPlayerId && p.lastSeen && now - p.lastSeen < 5 * 60 * 1000)
      .map(([id, p]) => ({ id, lat: p.lat, lng: p.lng, name: p.name ?? '알 수 없음', lastSeen: p.lastSeen }));
    onUpdate(nearby);
  });
  return () => off(playersRef);
}

// ── 다른 플레이어 영토 조회 (단발성) ──────────────────────────
export async function fetchOtherTerritories(excludePlayerId) {
  const database = getDb();
  if (!database) return [];
  try {
    const snap = await get(ref(database, 'players'));
    const data = snap.val() ?? {};
    return Object.entries(data)
      .filter(([id]) => id !== excludePlayerId)
      .map(([id, p]) => ({ id, name: p.name, cellKeys: p.territories?.cellKeys ?? [] }));
  } catch { return []; }
}

export const isMultiplayerEnabled = isConfigured;
