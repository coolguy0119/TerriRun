import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, Platform,
} from 'react-native';
import MapView, { Polygon, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as TaskManager from 'expo-task-manager';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  latLngToCell, cellToPolygon, getCellsAlongPath,
  haversine, generateEnemyCells, generateEventZones,
  formatDistance, formatPace, formatDuration, formatArea, cellsToArea,
} from '../utils/geo';
import {
  getTerritories, saveTerritories, getPlayer, savePlayer,
  saveRun, getEnemies, saveEnemies, getEventZones, saveEventZones,
} from '../utils/storage';
import {
  processRunCompletion, calcXPGain, isShielded, buyShield,
  SHIELD_COST, ITEMS, getEventZoneReward,
} from '../game/GameEngine';
import { BACKGROUND_LOCATION_TASK } from '../utils/tasks';
import { syncMyTerritories, updateMyPosition, isMultiplayerEnabled } from '../services/firebaseService';
import { saveRunWorkout, isHealthKitAvailable, initHealthKit } from '../services/healthService';
import RunResultModal from '../components/RunResultModal';

const PLAYER_COLOR    = '#22d97a';
const SHIELD_COLOR    = '#3b82f6';
const ENEMY_COLOR     = '#ef4444';
const ATTACKING_COLOR = '#f97316';
const EVENT_COLOR     = '#f59e0b';
const MAP_DARK_STYLE  = require('../assets/mapStyle.json');

export default function RunScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  // Run state
  const [isRunning, setIsRunning]       = useState(false);
  const [isPaused, setIsPaused]         = useState(false);
  const [routePoints, setRoutePoints]   = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [elapsed, setElapsed]           = useState(0);
  const [distance, setDistance]         = useState(0);
  const [speed, setSpeed]               = useState(0);

  // Territory state
  const [territories, setTerritories]   = useState({});
  const [enemies, setEnemies]           = useState({});
  const [eventZones, setEventZones]     = useState({});
  const [sessionCells, setSessionCells] = useState(new Set());
  const [attackingCells, setAttackingCells] = useState(new Set());

  // UI state
  const [resultModal, setResultModal]   = useState(null);
  const [notification, setNotification] = useState(null);
  const [player, setPlayer]             = useState(null);
  const [activeItems, setActiveItems]   = useState(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refs for session tracking (avoids stale closure in callbacks)
  const watchRef              = useRef(null);
  const timerRef              = useRef(null);
  const sessionDistRef        = useRef(0);
  const lastPosRef            = useRef(null);
  const sessionNewCellsRef    = useRef(0);
  const sessionEnemyCellsRef  = useRef(0);
  const sessionBonusXPRef     = useRef(0);
  const sessionBonusCoinsRef  = useRef(0);
  const elapsedAtPauseRef     = useRef(0);
  const eventZonesRef         = useRef({});
  const playerIdRef           = useRef(`player_${Date.now()}`);

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    loadTerritories();
    startPulse();
    if (isHealthKitAvailable()) initHealthKit().catch(() => {});
    return () => {
      clearInterval(timerRef.current);
      watchRef.current?.remove();
    };
  }, []);

  async function loadTerritories() {
    const [savedTerr, savedEnemy, savedEvents, location, savedPlayer] = await Promise.all([
      getTerritories(),
      getEnemies(),
      getEventZones(),
      Location.getLastKnownPositionAsync(),
      getPlayer(),
    ]);

    setTerritories(savedTerr);
    setPlayer(savedPlayer);
    if (savedPlayer?.name) playerIdRef.current = `player_${savedPlayer.name}`;

    // Enemies
    if (savedEnemy && Object.keys(savedEnemy).length > 0) {
      setEnemies(savedEnemy);
    } else if (location) {
      const generated = generateEnemyCells(location.coords.latitude, location.coords.longitude, 25);
      const enemyMap = {};
      generated.forEach((c) => { enemyMap[c.key] = c; });
      setEnemies(enemyMap);
      saveEnemies(enemyMap);
    }

    // Event zones
    if (savedEvents && Object.keys(savedEvents).length > 0) {
      setEventZones(savedEvents);
      eventZonesRef.current = savedEvents;
    } else if (location) {
      const generated = generateEventZones(location.coords.latitude, location.coords.longitude);
      const zoneMap = {};
      generated.forEach((z) => { zoneMap[z.key] = z; });
      setEventZones(zoneMap);
      eventZonesRef.current = zoneMap;
      saveEventZones(zoneMap);
    }
  }

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }

  // ── Event zone capture (runs after each new route point) ─────
  useEffect(() => {
    if (!isRunning || isPaused || routePoints.length < 2) return;
    const lastTwo = routePoints.slice(-2);
    const crossedKeys = getCellsAlongPath(lastTwo);

    let zonesUpdated = false;
    const newZones = { ...eventZonesRef.current };
    crossedKeys.forEach((key) => {
      if (newZones[key] && !newZones[key].captured) {
        const zone = newZones[key];
        const reward = getEventZoneReward(zone.type);
        newZones[key] = { ...zone, captured: true };
        sessionBonusXPRef.current   += reward.bonusXP;
        sessionBonusCoinsRef.current += reward.bonusCoins;
        showNotif(`${reward.emoji} ${zone.name} 점령! +${reward.bonusXP} XP`, reward.emoji);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        zonesUpdated = true;
      }
    });

    if (zonesUpdated) {
      eventZonesRef.current = newZones;
      setEventZones({ ...newZones });
      saveEventZones(newZones);
    }
  }, [routePoints.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notifications ─────────────────────────────────────────────
  function showNotif(text, emoji = '🎯') {
    setNotification({ text, emoji });
    setTimeout(() => setNotification(null), 2500);
  }

  // ── Location permission ───────────────────────────────────────
  async function requestPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('위치 권한 필요', '달리기 추적을 위해 위치 권한이 필요합니다.', [
        { text: '설정 열기', onPress: () => Location.enableNetworkProviderAsync() },
        { text: '취소' },
      ]);
      return false;
    }
    return true;
  }

  async function startBackgroundTracking() {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') return;
      const already = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (!already) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 30,
          ...(Platform.OS === 'android' ? {
            foregroundService: {
              notificationTitle: 'TerraRun 달리기 중',
              notificationBody: '영토를 캡처하고 있어요!',
              notificationColor: '#22d97a',
            },
          } : {}),
        });
      }
    } catch {}
  }

  async function stopBackgroundTracking() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    } catch {}
  }

  // ── Start Run ─────────────────────────────────────────────────
  async function startRun() {
    const ok = await requestPermission();
    if (!ok) return;

    if (activeItems.has('bomb')) {
      setEnemies((prev) => {
        const updated = {};
        for (const [k, c] of Object.entries(prev)) {
          updated[k] = { ...c, health: 1 };
        }
        saveEnemies(updated);
        return updated;
      });
      showNotif('💣 폭탄 발동! 적 체력 1로 감소');
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRunning(true);
    setIsPaused(false);
    setRoutePoints([]);
    setSessionCells(new Set());
    setAttackingCells(new Set());
    sessionDistRef.current       = 0;
    lastPosRef.current           = null;
    sessionNewCellsRef.current   = 0;
    sessionEnemyCellsRef.current = 0;
    sessionBonusXPRef.current    = 0;
    sessionBonusCoinsRef.current = 0;
    setDistance(0);
    setElapsed(0);
    setSpeed(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
      handleLocationUpdate
    );

    await startBackgroundTracking();
  }

  // ── Location Update ───────────────────────────────────────────
  const handleLocationUpdate = useCallback((loc) => {
    const { latitude, longitude, speed: spd } = loc.coords;
    setCurrentLocation({ latitude, longitude });
    setSpeed(spd || 0);

    // Firebase 위치 동기화 (멀티플레이어 활성화 시)
    if (isMultiplayerEnabled()) {
      updateMyPosition(playerIdRef.current, latitude, longitude).catch(() => {});
    }

    setRoutePoints((prev) => {
      const newPoints = [...prev, { latitude, longitude }];

      if (lastPosRef.current) {
        const d = haversine(lastPosRef.current.latitude, lastPosRef.current.longitude, latitude, longitude);
        sessionDistRef.current += d;
        setDistance(sessionDistRef.current);
      }
      lastPosRef.current = { latitude, longitude };

      const baseCrossed = getCellsAlongPath(newPoints.slice(-3));
      const crossedKeys = activeItems.has('invasion')
        ? new Set([...baseCrossed, ...[...baseCrossed].flatMap((key) => {
            const [r, c] = key.split('_').map(Number);
            return [`${r+1}_${c}`, `${r-1}_${c}`, `${r}_${c+1}`, `${r}_${c-1}`];
          })])
        : baseCrossed;

      setTerritories((prevTerr) => {
        const newTerr = { ...prevTerr };

        setEnemies((prevEnemy) => {
          const newEnemy = { ...prevEnemy };
          const newAttacking = new Set(attackingCells);

          crossedKeys.forEach((key) => {
            const [row, col] = key.split('_').map(Number);

            if (newTerr[key] && isShielded(newTerr[key])) {
              // Shielded — skip
            } else if (newEnemy[key]) {
              const damage    = activeItems.has('power_strike') ? 2 : 1;
              const newHealth = activeItems.has('blitz') ? 0 : newEnemy[key].health - damage;
              newEnemy[key]   = { ...newEnemy[key], health: newHealth };
              newAttacking.add(key);
              if (newEnemy[key].health <= 0) {
                delete newEnemy[key];
                newAttacking.delete(key);
                newTerr[key] = { row, col, owner: 'player', defense: 1, capturedAt: Date.now() };
                sessionEnemyCellsRef.current++;
                showNotif('적 영토 탈환!', '⚔️');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } else if (!newTerr[key]) {
              newTerr[key] = { row, col, owner: 'player', defense: 1, capturedAt: Date.now() };
              sessionNewCellsRef.current++;
              if (sessionNewCellsRef.current % 10 === 0) {
                showNotif(`영토 ${sessionNewCellsRef.current}칸 확보!`, '🚩');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }
          });

          setAttackingCells(newAttacking);
          if (Object.keys(newEnemy).length !== Object.keys(prevEnemy).length) {
            saveEnemies(newEnemy);
          }
          return newEnemy;
        });

        return newTerr;
      });

      return newPoints;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pause / Resume ────────────────────────────────────────────
  async function togglePause() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isPaused) {
      // Pausing
      watchRef.current?.remove();
      watchRef.current = null;
      clearInterval(timerRef.current);
      elapsedAtPauseRef.current = elapsed;
      setIsPaused(true);
    } else {
      // Resuming
      lastPosRef.current = null; // prevent distance jump after pause
      const resumeStart = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(elapsedAtPauseRef.current + Math.floor((Date.now() - resumeStart) / 1000));
      }, 1000);
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        handleLocationUpdate
      );
      setIsPaused(false);
    }
  }

  // ── Stop Run ──────────────────────────────────────────────────
  async function stopRun() {
    Alert.alert('달리기 종료', '달리기를 종료하고 영토를 저장할까요?', [
      { text: '계속 달리기', style: 'cancel' },
      {
        text: '종료 & 저장',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          clearInterval(timerRef.current);
          watchRef.current?.remove();
          setIsRunning(false);
          await stopBackgroundTracking();

          await saveTerritories(territories);

          const paceSecPerKm = sessionDistRef.current > 0 ? (elapsed / sessionDistRef.current) * 1000 : 0;
          const currentPlayer = await getPlayer();
          const { updated, xpGain, coinGain, newAchievements, newlyCompleted } =
            processRunCompletion(currentPlayer, {
              distanceMeters: sessionDistRef.current,
              newCells:        sessionNewCellsRef.current,
              enemyCells:      sessionEnemyCellsRef.current,
              paceSecPerKm,
              bonusXP:         sessionBonusXPRef.current,
              bonusCoins:      sessionBonusCoinsRef.current,
            });

          await savePlayer(updated);
          await saveRun({
            distance:   sessionDistRef.current,
            duration:   elapsed,
            cells:      sessionNewCellsRef.current + sessionEnemyCellsRef.current,
            eventCells: Object.values(eventZonesRef.current).filter((z) => z.captured).length,
            xpGain,
            coinGain,
            date: new Date().toISOString(),
          });

          // Firebase 영토 동기화
          if (isMultiplayerEnabled()) {
            syncMyTerritories(playerIdRef.current, territories).catch(() => {});
          }

          // Apple HealthKit 운동 저장
          if (isHealthKitAvailable() && sessionDistRef.current > 50) {
            saveRunWorkout({
              distanceMeters:  sessionDistRef.current,
              durationSeconds: elapsed,
              endDate:         new Date(),
            }).catch(() => {});
          }

          setResultModal({
            distance:        sessionDistRef.current,
            duration:        elapsed,
            cells:           sessionNewCellsRef.current,
            enemyCells:      sessionEnemyCellsRef.current,
            bonusXP:         sessionBonusXPRef.current,
            xpGain,
            coinGain,
            newAchievements,
            newlyCompleted,
            leveledUp:       updated.level > currentPlayer.level,
            newLevel:        updated.level,
            playerCoins:     updated.coins,
          });
        },
      },
    ]);
  }

  // ── Center on user ────────────────────────────────────────────
  function centerMap() {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 600);
    }
  }

  // ── Render polygons ───────────────────────────────────────────
  const terrPolygons = Object.values(territories).map((cell) => {
    const shielded = isShielded(cell);
    const defenseAlpha = 0.2 + Math.min((cell.defense || 1) - 1, 4) * 0.04;
    return (
      <Polygon
        key={`t_${cell.row}_${cell.col}`}
        coordinates={cellToPolygon(cell.row, cell.col)}
        fillColor={shielded ? 'rgba(59,130,246,0.35)' : `rgba(34,217,122,${defenseAlpha})`}
        strokeColor={shielded ? SHIELD_COLOR : 'rgba(34,217,122,0.8)'}
        strokeWidth={shielded ? 2 : Math.min(cell.defense || 1, 3)}
      />
    );
  });

  const enemyPolygons = Object.values(enemies).map((cell) => {
    const isAttacking = attackingCells.has(cell.key);
    return (
      <Polygon
        key={`e_${cell.row}_${cell.col}`}
        coordinates={cellToPolygon(cell.row, cell.col)}
        fillColor={isAttacking ? 'rgba(249,115,22,0.5)' : 'rgba(239,68,68,0.28)'}
        strokeColor={isAttacking ? ATTACKING_COLOR : ENEMY_COLOR}
        strokeWidth={isAttacking ? 2 : 1}
      />
    );
  });

  const eventPolygons = Object.values(eventZones)
    .filter((z) => !z.captured)
    .map((zone) => (
      <Polygon
        key={`ev_${zone.key}`}
        coordinates={cellToPolygon(zone.row, zone.col)}
        fillColor="rgba(245,158,11,0.3)"
        strokeColor={EVENT_COLOR}
        strokeWidth={2}
      />
    ));

  const pace = sessionDistRef.current > 5 && elapsed > 0
    ? (elapsed / sessionDistRef.current) * 1000
    : 0;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={MAP_DARK_STYLE}
        showsUserLocation
        followsUserLocation={isRunning && !isPaused}
        initialRegion={{ latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        mapType="standard"
      >
        {terrPolygons}
        {enemyPolygons}
        {eventPolygons}
        {routePoints.length > 1 && (
          <Polyline
            coordinates={routePoints}
            strokeColor={PLAYER_COLOR}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
      </MapView>

      {/* Notification banner */}
      {notification && (
        <View style={[styles.notifBanner, { top: insets.top + 16 }]}>
          <Text style={styles.notifText}>{notification.emoji} {notification.text}</Text>
        </View>
      )}

      {/* Top HUD */}
      {isRunning && (
        <View style={[styles.topHud, { paddingTop: insets.top + 8 }]}>
          <LinearGradient colors={['rgba(0,0,0,0.75)', 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={styles.hudRow}>
            <View style={styles.hudStat}>
              <Text style={styles.hudValue}>{formatDistance(distance)}</Text>
              <Text style={styles.hudLabel}>거리</Text>
            </View>
            <View style={styles.hudStat}>
              <Text style={styles.hudValue}>{formatDuration(elapsed)}</Text>
              <Text style={styles.hudLabel}>시간</Text>
            </View>
            <View style={styles.hudStat}>
              <Text style={[styles.hudValue, { color: '#f59e0b' }]}>{formatPace(speed)}</Text>
              <Text style={styles.hudLabel}>페이스</Text>
            </View>
            <View style={styles.hudStat}>
              <Text style={[styles.hudValue, { color: PLAYER_COLOR }]}>
                {sessionNewCellsRef.current + sessionEnemyCellsRef.current}
              </Text>
              <Text style={styles.hudLabel}>캡처</Text>
            </View>
          </View>
          {isPaused && (
            <Text style={styles.pausedBadge}>⏸ 일시정지</Text>
          )}
        </View>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PLAYER_COLOR }]} />
            <Text style={styles.legendText}>내 영토 ({Object.keys(territories).length}칸)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ENEMY_COLOR }]} />
            <Text style={styles.legendText}>적 영토 ({Object.keys(enemies).length}칸)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EVENT_COLOR }]} />
            <Text style={styles.legendText}>이벤트 ({Object.values(eventZones).filter((z) => !z.captured).length})</Text>
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={centerMap}>
            <Ionicons name="locate" size={22} color="#fff" />
          </TouchableOpacity>

          {!isRunning ? (
            <View style={styles.startGroup}>
              {player && Object.values(player.inventory || {}).some((v) => v > 0) && (
                <View style={styles.itemRow}>
                  {ITEMS.filter((it) => (player.inventory?.[it.id] || 0) > 0).map((it) => {
                    const on = activeItems.has(it.id);
                    return (
                      <TouchableOpacity
                        key={it.id}
                        style={[styles.itemChip, on && styles.itemChipOn]}
                        onPress={() => {
                          setActiveItems((prev) => {
                            const next = new Set(prev);
                            on ? next.delete(it.id) : next.add(it.id);
                            return next;
                          });
                        }}
                      >
                        <Text style={styles.itemChipEmoji}>{it.emoji}</Text>
                        <Text style={[styles.itemChipLabel, on && styles.itemChipLabelOn]}>{it.name}</Text>
                        <Text style={styles.itemChipCount}>{player.inventory[it.id]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <TouchableOpacity style={styles.startBtn} onPress={startRun} activeOpacity={0.85}>
                <LinearGradient colors={['#22d97a', '#16a057']} style={styles.startBtnGrad}>
                  <Ionicons name="play" size={32} color="#000" />
                  <Text style={styles.startBtnText}>달리기 시작</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.runBtns}>
              <TouchableOpacity style={styles.pauseBtn} onPress={togglePause}>
                <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopBtn} onPress={stopRun}>
                <Ionicons name="stop" size={24} color="#000" />
                <Text style={styles.stopBtnText}>완료</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {resultModal && (
        <RunResultModal
          data={resultModal}
          onClose={() => { setResultModal(null); navigation.navigate('Home'); }}
          onShield={async () => {
            const terr = await getTerritories();
            const p    = await getPlayer();
            const result = buyShield(p, terr);
            if (!result) {
              Alert.alert('코인 부족', `쉴드 구매에 ${SHIELD_COST} 코인이 필요해요.\n현재 코인: ${p.coins}`);
              return;
            }
            await savePlayer(result.updatedPlayer);
            await saveTerritories(result.updatedTerritories);
            setTerritories(result.updatedTerritories);
            Alert.alert('쉴드 활성화!', '모든 영토에 24시간 쉴드가 적용됐어요. 🛡️');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },

  notifBanner: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#22d97a', zIndex: 10,
  },
  notifText: { color: '#22d97a', fontWeight: '600', fontSize: 14 },

  topHud: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 16 },
  hudRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
  hudStat: { alignItems: 'center' },
  hudValue: { color: '#fff', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hudLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
  pausedBadge: { color: '#f59e0b', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },

  bottomControls: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 24, paddingHorizontal: 20 },
  legend: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  startGroup: { flex: 1, gap: 8 },
  itemRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  itemChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  itemChipOn: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' },
  itemChipEmoji: { fontSize: 14 },
  itemChipLabel: { color: '#888', fontSize: 11, fontWeight: '600' },
  itemChipLabelOn: { color: '#ef4444' },
  itemChipCount: { color: '#555', fontSize: 10, marginLeft: 2 },
  startBtn: { flex: 1, borderRadius: 28, overflow: 'hidden' },
  startBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  startBtnText: { color: '#000', fontSize: 18, fontWeight: '700' },

  runBtns: { flex: 1, flexDirection: 'row', gap: 10 },
  pauseBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  stopBtn: { flex: 2, height: 56, borderRadius: 28, backgroundColor: '#22d97a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stopBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
