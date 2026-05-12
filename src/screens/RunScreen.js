import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, Vibration, Platform,
} from 'react-native';
import MapView, { Polygon, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  latLngToCell, cellToPolygon, getCellsAlongPath,
  haversine, generateEnemyCells,
  formatDistance, formatPace, formatDuration, formatArea, cellsToArea,
} from '../utils/geo';
import { getTerritories, saveTerritories, getPlayer, savePlayer, saveRun, getEnemies, saveEnemies } from '../utils/storage';
import { processRunCompletion, calcXPGain } from '../game/GameEngine';
import RunResultModal from '../components/RunResultModal';

const PLAYER_COLOR     = '#22d97a';
const ENEMY_COLOR      = '#ef4444';
const ATTACKING_COLOR  = '#f97316';
const MAP_DARK_STYLE   = require('../assets/mapStyle.json');

export default function RunScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);

  // Territory state
  const [territories, setTerritories] = useState({}); // { key: { row, col, owner, defense } }
  const [enemies, setEnemies] = useState({});           // { key: { row, col, health } }
  const [sessionCells, setSessionCells] = useState(new Set()); // new cells this run
  const [attackingCells, setAttackingCells] = useState(new Set()); // enemy cells being captured

  // UI state
  const [resultModal, setResultModal] = useState(null);
  const [notification, setNotification] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const watchRef = useRef(null);
  const timerRef = useRef(null);
  const sessionDistRef = useRef(0);
  const lastPosRef = useRef(null);
  const sessionNewCellsRef = useRef(0);
  const sessionEnemyCellsRef = useRef(0);

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    loadTerritories();
    startPulse();
    return () => {
      clearInterval(timerRef.current);
      watchRef.current?.remove();
    };
  }, []);

  async function loadTerritories() {
    const [savedTerr, savedEnemy, location] = await Promise.all([
      getTerritories(),
      getEnemies(),
      Location.getLastKnownPositionAsync(),
    ]);
    setTerritories(savedTerr);

    // Generate or restore enemies
    if (savedEnemy && Object.keys(savedEnemy).length > 0) {
      setEnemies(savedEnemy);
    } else if (location) {
      const generated = generateEnemyCells(location.coords.latitude, location.coords.longitude, 25);
      const enemyMap = {};
      generated.forEach((c) => { enemyMap[c.key] = c; });
      setEnemies(enemyMap);
      saveEnemies(enemyMap);
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

  // ── Start Run ─────────────────────────────────────────────────
  async function startRun() {
    const ok = await requestPermission();
    if (!ok) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRunning(true);
    setIsPaused(false);
    setRoutePoints([]);
    setSessionCells(new Set());
    setAttackingCells(new Set());
    sessionDistRef.current = 0;
    lastPosRef.current = null;
    sessionNewCellsRef.current = 0;
    sessionEnemyCellsRef.current = 0;
    setDistance(0);
    setElapsed(0);
    setSpeed(0);

    // Start timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Start location watch
    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      handleLocationUpdate
    );
  }

  // ── Location Update ───────────────────────────────────────────
  const handleLocationUpdate = useCallback((loc) => {
    const { latitude, longitude, speed: spd } = loc.coords;
    setCurrentLocation({ latitude, longitude });
    setSpeed(spd || 0);

    setRoutePoints((prev) => {
      const newPoints = [...prev, { latitude, longitude }];

      // Accumulate distance
      if (lastPosRef.current) {
        const d = haversine(lastPosRef.current.latitude, lastPosRef.current.longitude, latitude, longitude);
        sessionDistRef.current += d;
        setDistance(sessionDistRef.current);
      }
      lastPosRef.current = { latitude, longitude };

      // Calculate cells crossed
      const crossedKeys = getCellsAlongPath(newPoints.slice(-3));

      setTerritories((prevTerr) => {
        const newTerr = { ...prevTerr };

        setEnemies((prevEnemy) => {
          const newEnemy = { ...prevEnemy };
          let newCellCount = 0;
          let enemyCellCount = 0;
          const newSession = new Set(sessionCells);
          const newAttacking = new Set(attackingCells);

          crossedKeys.forEach((key) => {
            const [row, col] = key.split('_').map(Number);

            if (newEnemy[key]) {
              // Attack enemy territory
              newEnemy[key] = { ...newEnemy[key], health: newEnemy[key].health - 1 };
              newAttacking.add(key);
              if (newEnemy[key].health <= 0) {
                delete newEnemy[key];
                newAttacking.delete(key);
                newTerr[key] = { row, col, owner: 'player', defense: 1, capturedAt: Date.now() };
                enemyCellCount++;
                sessionEnemyCellsRef.current++;
                showNotif('적 영토 탈환!', '⚔️');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } else if (!newTerr[key]) {
              // Capture neutral territory
              newTerr[key] = { row, col, owner: 'player', defense: 1, capturedAt: Date.now() };
              newCellCount++;
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
  }, []);

  // ── Pause / Resume ────────────────────────────────────────────
  function togglePause() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused((p) => !p);
    if (isPaused) {
      watchRef.current?.remove();
      clearInterval(timerRef.current);
    }
    // Note: re-starting watch on resume omitted for brevity; real app should implement
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

          // Save territories
          await saveTerritories(territories);

          // Process run completion
          const paceSecPerKm = sessionDistRef.current > 0 ? (elapsed / sessionDistRef.current) * 1000 : 0;
          const player = await getPlayer();
          const { updated, xpGain, coinGain, newAchievements, newlyCompleted } =
            processRunCompletion(player, {
              distanceMeters: sessionDistRef.current,
              newCells: sessionNewCellsRef.current,
              enemyCells: sessionEnemyCellsRef.current,
              paceSecPerKm,
            });

          await savePlayer(updated);
          await saveRun({
            distance: sessionDistRef.current,
            duration: elapsed,
            cells: sessionNewCellsRef.current + sessionEnemyCellsRef.current,
            xpGain,
            coinGain,
            date: new Date().toISOString(),
          });

          setResultModal({
            distance: sessionDistRef.current,
            duration: elapsed,
            cells: sessionNewCellsRef.current,
            enemyCells: sessionEnemyCellsRef.current,
            xpGain,
            coinGain,
            newAchievements,
            newlyCompleted,
            leveledUp: updated.level > player.level,
            newLevel: updated.level,
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

  // ── Render visible territory polygons ─────────────────────────
  const terrPolygons = Object.values(territories).map((cell) => (
    <Polygon
      key={`t_${cell.row}_${cell.col}`}
      coordinates={cellToPolygon(cell.row, cell.col)}
      fillColor="rgba(34, 217, 122, 0.28)"
      strokeColor="rgba(34, 217, 122, 0.8)"
      strokeWidth={1}
    />
  ));

  const enemyPolygons = Object.values(enemies).map((cell) => {
    const isAttacking = attackingCells.has(cell.key);
    return (
      <Polygon
        key={`e_${cell.row}_${cell.col}`}
        coordinates={cellToPolygon(cell.row, cell.col)}
        fillColor={isAttacking ? 'rgba(249, 115, 22, 0.5)' : 'rgba(239, 68, 68, 0.28)'}
        strokeColor={isAttacking ? ATTACKING_COLOR : ENEMY_COLOR}
        strokeWidth={isAttacking ? 2 : 1}
      />
    );
  });

  const pace = sessionDistRef.current > 5 && elapsed > 0
    ? (elapsed / sessionDistRef.current) * 1000
    : 0;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={MAP_DARK_STYLE}
        showsUserLocation
        followsUserLocation={isRunning && !isPaused}
        initialRegion={{
          latitude: 37.5665,
          longitude: 126.978,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        mapType="standard"
      >
        {terrPolygons}
        {enemyPolygons}
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
        </View>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PLAYER_COLOR }]} />
            <Text style={styles.legendText}>내 영토 ({Object.keys(territories).length}칸)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ENEMY_COLOR }]} />
            <Text style={styles.legendText}>적 영토 ({Object.keys(enemies).length}칸)</Text>
          </View>
        </View>

        <View style={styles.btnRow}>
          {/* Center map */}
          <TouchableOpacity style={styles.iconBtn} onPress={centerMap}>
            <Ionicons name="locate" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Main button */}
          {!isRunning ? (
            <TouchableOpacity style={styles.startBtn} onPress={startRun} activeOpacity={0.85}>
              <LinearGradient colors={['#22d97a', '#16a057']} style={styles.startBtnGrad}>
                <Ionicons name="play" size={32} color="#000" />
                <Text style={styles.startBtnText}>달리기 시작</Text>
              </LinearGradient>
            </TouchableOpacity>
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

          {/* Navigation */}
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Result Modal */}
      {resultModal && (
        <RunResultModal
          data={resultModal}
          onClose={() => { setResultModal(null); navigation.navigate('Home'); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },

  notifBanner: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#22d97a',
    zIndex: 10,
  },
  notifText: { color: '#22d97a', fontWeight: '600', fontSize: 14 },

  topHud: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingBottom: 16,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  hudStat: { alignItems: 'center' },
  hudValue: { color: '#fff', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hudLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },

  bottomControls: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconBtn: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  startBtn: { flex: 1, borderRadius: 28, overflow: 'hidden' },
  startBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  startBtnText: { color: '#000', fontSize: 18, fontWeight: '700' },

  runBtns: { flex: 1, flexDirection: 'row', gap: 10 },
  pauseBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    flex: 2,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22d97a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stopBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
