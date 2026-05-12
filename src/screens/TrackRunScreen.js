import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Platform,
} from 'react-native';

let MapView, Polyline, Circle;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Polyline = Maps.Polyline;
  Circle = Maps.Circle;
}
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haversine, formatDistance, formatPace, formatDuration } from '../utils/geo';
import { getPlayer, savePlayer } from '../utils/storage';
import { calcLevel } from '../game/GameEngine';
const MAP_DARK = require('../assets/mapStyle.json');

export default function TrackRunScreen({ navigation, route }) {
  if (Platform.OS === 'web') return (
    <View style={{ flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <Text style={{ fontSize: 64 }}>📱</Text>
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>모바일 전용 기능</Text>
      <Text style={{ color: '#555', fontSize: 15, textAlign: 'center' }}>GPS 달리기는 iPhone 앱에서만 사용 가능합니다.</Text>
    </View>
  );

  const { track } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [phase, setPhase] = useState('ready'); // ready | running | paused | done
  const [routePoints, setRoutePoints] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [player, setPlayer] = useState(null);

  const watchRef = useRef(null);
  const timerRef = useRef(null);
  const distRef = useRef(0);
  const lastPosRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getPlayer().then(setPlayer);
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation(loc.coords);
    })();
    return () => {
      clearInterval(timerRef.current);
      watchRef.current?.remove();
    };
  }, []);

  // Pulse animation while running
  useEffect(() => {
    if (phase !== 'running') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [phase]);

  async function startRun() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('위치 권한 필요', '달리기를 시작하려면 위치 권한이 필요합니다.');
      return;
    }

    setPhase('running');

    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        setCurrentLocation({ latitude, longitude });
        setRoutePoints((prev) => [...prev, { latitude, longitude }]);

        if (lastPosRef.current) {
          const d = haversine(lastPosRef.current.latitude, lastPosRef.current.longitude, latitude, longitude);
          distRef.current += d;
          setDistance(distRef.current);

          // Goal reached
          if (distRef.current >= track.goalMeters) {
            finishRun(distRef.current);
          }
        }
        lastPosRef.current = { latitude, longitude };

        mapRef.current?.animateToRegion({
          latitude, longitude,
          latitudeDelta: 0.004, longitudeDelta: 0.004,
        }, 300);
      }
    );
  }

  function pauseRun() {
    setPhase('paused');
    clearInterval(timerRef.current);
    watchRef.current?.remove();
    watchRef.current = null;
  }

  async function resumeRun() {
    setPhase('running');
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        setCurrentLocation({ latitude, longitude });
        setRoutePoints((prev) => [...prev, { latitude, longitude }]);
        if (lastPosRef.current) {
          const d = haversine(lastPosRef.current.latitude, lastPosRef.current.longitude, latitude, longitude);
          distRef.current += d;
          setDistance(distRef.current);
          if (distRef.current >= track.goalMeters) finishRun(distRef.current);
        }
        lastPosRef.current = { latitude, longitude };
        mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 300);
      }
    );
  }

  async function finishRun(finalDist) {
    clearInterval(timerRef.current);
    watchRef.current?.remove();
    watchRef.current = null;
    setPhase('done');

    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}

    const p = await getPlayer();
    const pace = elapsed > 0 && finalDist > 0 ? Math.round((elapsed / (finalDist / 1000))) : 0;
    const updated = {
      ...p,
      xp: p.xp + track.xpBonus,
      coins: p.coins + track.coinBonus,
      totalDistance: p.totalDistance + finalDist,
      totalRuns: p.totalRuns + 1,
      todayDistance: p.todayDistance + finalDist,
      todayRuns: p.todayRuns + 1,
      bestPace: pace > 0 && pace < p.bestPace ? pace : p.bestPace,
    };
    updated.level = calcLevel(updated.xp);
    await savePlayer(updated);
    setPlayer(updated);
  }

  function confirmStop() {
    Alert.alert('달리기 중단', '트랙 달리기를 중단하면 보상을 받지 못해요. 그래도 중단할까요?', [
      { text: '계속 달리기', style: 'cancel' },
      { text: '중단', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }

  const progress = Math.min(distance / track.goalMeters, 1);
  const remaining = Math.max(track.goalMeters - distance, 0);
  const pace = elapsed > 0 && distance > 0 ? Math.round((elapsed / (distance / 1000))) : 0;

  // ── Done screen ───────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <LinearGradient colors={['#0a1a0a', '#0d1117']} style={styles.doneContainer}>
        <Text style={styles.doneEmoji}>{track.emoji}</Text>
        <Text style={styles.doneName}>{track.name} 완주!</Text>
        <Text style={styles.doneDesc}>{formatDistance(distance)} 달성</Text>

        <View style={styles.doneRewards}>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>XP 보너스</Text>
            <Text style={[styles.rewardVal, { color: '#f59e0b' }]}>+{track.xpBonus} XP</Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>코인 보너스</Text>
            <Text style={[styles.rewardVal, { color: '#22d97a' }]}>+{track.coinBonus} 🪙</Text>
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>소요 시간</Text>
            <Text style={styles.rewardVal}>{formatDuration(elapsed)}</Text>
          </View>
          {pace > 0 && (
            <View style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>평균 페이스</Text>
              <Text style={styles.rewardVal}>{formatPace(pace)}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.doneBtnText}>트랙 목록으로</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // ── Main run screen ───────────────────────────────────────────
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={MAP_DARK}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        } : { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      >
        {routePoints.length > 1 && (
          <Polyline coordinates={routePoints} strokeColor={track.color} strokeWidth={4} />
        )}
        {currentLocation && phase === 'running' && (
          <Circle
            center={currentLocation}
            radius={8}
            fillColor={track.color}
            strokeColor="#fff"
            strokeWidth={2}
          />
        )}
      </MapView>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <LinearGradient colors={['rgba(13,17,23,0.95)', 'rgba(13,17,23,0)']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity onPress={phase === 'ready' ? () => navigation.goBack() : confirmStop} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{track.emoji}</Text>
          <Text style={styles.headerName}>{track.name}</Text>
        </View>
      </View>

      {/* HUD */}
      <View style={[styles.hud, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient colors={['rgba(13,17,23,0)', 'rgba(13,17,23,0.97)']} style={StyleSheet.absoluteFill} />

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>진행률</Text>
            <Text style={styles.progressLabel}>남은 거리 {formatDistance(remaining)}</Text>
          </View>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: `${(progress * 100).toFixed(1)}%`, backgroundColor: track.color }]} />
          </View>
          <Text style={[styles.progressPct, { color: track.color }]}>{(progress * 100).toFixed(0)}%</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{formatDistance(distance)}</Text>
            <Text style={styles.statLabel}>달린 거리</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{formatDuration(elapsed)}</Text>
            <Text style={styles.statLabel}>시간</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{pace > 0 ? formatPace(pace) : '--'}</Text>
            <Text style={styles.statLabel}>페이스</Text>
          </View>
        </View>

        {/* Control buttons */}
        <View style={styles.controls}>
          {phase === 'ready' && (
            <TouchableOpacity style={[styles.mainBtn, { backgroundColor: track.color }]} onPress={startRun} activeOpacity={0.85}>
              <Ionicons name="play" size={28} color="#000" />
              <Text style={styles.mainBtnText}>달리기 시작</Text>
            </TouchableOpacity>
          )}
          {phase === 'running' && (
            <View style={styles.runningBtns}>
              <TouchableOpacity style={styles.stopBtn} onPress={confirmStop}>
                <Ionicons name="stop" size={22} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mainBtn, { backgroundColor: '#f59e0b', flex: 1 }]} onPress={pauseRun} activeOpacity={0.85}>
                <Ionicons name="pause" size={24} color="#000" />
                <Text style={styles.mainBtnText}>일시정지</Text>
              </TouchableOpacity>
            </View>
          )}
          {phase === 'paused' && (
            <View style={styles.runningBtns}>
              <TouchableOpacity style={styles.stopBtn} onPress={confirmStop}>
                <Ionicons name="stop" size={22} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mainBtn, { backgroundColor: track.color, flex: 1 }]} onPress={resumeRun} activeOpacity={0.85}>
                <Ionicons name="play" size={24} color="#000" />
                <Text style={styles.mainBtnText}>계속 달리기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Goal reminder */}
        {phase === 'ready' && (
          <Text style={styles.goalHint}>
            목표: {formatDistance(track.goalMeters)} 완주 시 +{track.xpBonus}XP +{track.coinBonus}🪙
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },

  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, gap: 10, zIndex: 10 },
  backBtn: { padding: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerEmoji: { fontSize: 18 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700' },

  hud: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 40, paddingHorizontal: 20, gap: 16 },

  progressSection: { gap: 6 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: '#888', fontSize: 12 },
  progressBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressPct: { fontSize: 13, fontWeight: '700', textAlign: 'right' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statVal: { color: '#fff', fontSize: 22, fontWeight: '700' },
  statLabel: { color: '#555', fontSize: 11 },

  controls: { gap: 10 },
  mainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18, paddingVertical: 16 },
  mainBtnText: { color: '#000', fontSize: 17, fontWeight: '800' },
  runningBtns: { flexDirection: 'row', gap: 10 },
  stopBtn: { width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', alignItems: 'center', justifyContent: 'center' },

  goalHint: { color: '#444', fontSize: 12, textAlign: 'center' },

  // Done screen
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  doneEmoji: { fontSize: 72 },
  doneName: { color: '#fff', fontSize: 26, fontWeight: '800' },
  doneDesc: { color: '#22d97a', fontSize: 16 },
  doneRewards: { width: '100%', backgroundColor: '#141c14', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20, gap: 14, marginTop: 8 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardLabel: { color: '#888', fontSize: 14 },
  rewardVal: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneBtn: { backgroundColor: '#22d97a', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14, marginTop: 8 },
  doneBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
