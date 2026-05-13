import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { getPlayer, savePlayer } from '../utils/storage';
import { calcLevel } from '../game/GameEngine';
import { C } from '../theme/pokemon';

const RACE_DURATION_MS = 9000; // 9s animation
const COUNTDOWN_FROM = 3;

// Calculate how long each racer takes to finish (ms). Lower overall = slower.
function getRaceDuration(overall) {
  const noise = (Math.random() - 0.5) * 0.2; // ±10% randomness
  const factor = 1 - (overall / 100) * 0.5;  // overall 100 → 0.5x speed, 0 → 1.0x
  return RACE_DURATION_MS * (factor + noise);
}

export default function RaceScreen({ navigation, route }) {
  const { arena, playerStats, player: initialPlayer } = route.params;
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState('countdown'); // countdown | racing | result
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [placements, setPlacements] = useState([]); // sorted finish order
  const [player, setPlayer] = useState(initialPlayer);

  // Build racers: player first, then opponents
  const racers = [
    { id: 'player', name: player.name, emoji: route.params.charEmoji || '🏃', overall: playerStats.overall, isPlayer: true },
    ...arena.opponents.map((op) => ({ ...op, id: op.name, isPlayer: false })),
  ];

  // One Animated.Value (0→1) per racer
  const progRefs = useRef(racers.map(() => new Animated.Value(0)));
  const finishTimes = useRef([]);
  const finishCount = useRef(0);

  // Countdown
  useEffect(() => {
    if (countdown === 0) {
      startRace();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function startRace() {
    setPhase('racing');
    finishTimes.current = [];
    finishCount.current = 0;

    racers.forEach((racer, i) => {
      const duration = getRaceDuration(racer.overall);
      Animated.timing(progRefs.current[i], {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start(() => {
        finishTimes.current.push({ racer, duration });
        finishCount.current += 1;
        if (finishCount.current === racers.length) {
          onAllFinished();
        }
      });
    });
  }

  async function onAllFinished() {
    const sorted = [...finishTimes.current].sort((a, b) => a.duration - b.duration);
    setPlacements(sorted.map((f) => f.racer));
    setPhase('result');

    const playerPlace = sorted.findIndex((f) => f.racer.isPlayer) + 1;
    const won = playerPlace === 1;
    try { Haptics.notificationAsync(won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning); } catch {}

    const xpGain  = won ? arena.winXP  : arena.loseXP;
    const coinGain = won ? arena.winCoin : arena.loseCoin;

    const p = await getPlayer();
    const updated = {
      ...p,
      xp:    p.xp    + xpGain,
      coins: p.coins + coinGain,
    };
    updated.level = calcLevel(updated.xp);
    await savePlayer(updated);
    setPlayer(updated);
  }

  const placeLabels = ['🥇 1위', '🥈 2위', '🥉 3위', '4위'];
  const placeColors = ['#FFD700', '#A8A9AD', '#CD7F32', '#555'];

  const playerPlace = placements.findIndex((r) => r.isPlayer);
  const won = playerPlace === 0;
  const xpGain  = won ? arena.winXP  : arena.loseXP;
  const coinGain = won ? arena.winCoin : arena.loseCoin;

  return (
    <LinearGradient colors={['#0a0f2a', '#1a1a2e']} style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{arena.emoji}</Text>
        <Text style={styles.headerTitle}>{arena.name}</Text>
      </View>

      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownNum}>{countdown === 0 ? 'GO!' : countdown}</Text>
          <Text style={styles.countdownSub}>준비하세요!</Text>
        </View>
      )}

      {/* Race track */}
      <View style={styles.track}>
        {racers.map((racer, i) => (
          <View key={racer.id} style={styles.lane}>
            <View style={styles.laneInfo}>
              <Text style={styles.laneEmoji}>{racer.emoji}</Text>
              <Text style={[styles.laneName, racer.isPlayer && styles.laneNamePlayer]} numberOfLines={1}>
                {racer.isPlayer ? '나' : racer.name}
              </Text>
              <Text style={styles.lanePower}>{racer.overall}</Text>
            </View>
            <View style={styles.laneTrack}>
              {/* Finish line */}
              <View style={styles.finishLine} />
              {/* Runner dot animated */}
              <Animated.View
                style={[
                  styles.runnerDot,
                  racer.isPlayer && { backgroundColor: '#22d97a' },
                  {
                    left: progRefs.current[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '88%'],
                    }),
                  },
                ]}
              >
                <Text style={styles.runnerEmoji}>{racer.emoji}</Text>
              </Animated.View>
            </View>
          </View>
        ))}
      </View>

      {/* Result panel */}
      {phase === 'result' && (
        <View style={styles.resultPanel}>
          <LinearGradient colors={['#0f1a3a', '#16213e']} style={styles.resultGrad}>
            <Text style={styles.resultTitle}>{won ? '🎉 우승!' : '레이스 완료'}</Text>

            <View style={styles.placementList}>
              {placements.map((racer, i) => (
                <View key={racer.id} style={[styles.placementRow, racer.isPlayer && styles.placementHighlight]}>
                  <Text style={[styles.placeLabel, { color: placeColors[i] }]}>{placeLabels[i]}</Text>
                  <Text style={styles.placementEmoji}>{racer.emoji}</Text>
                  <Text style={[styles.placementName, racer.isPlayer && { color: C.yellow }]}>
                    {racer.isPlayer ? player.name : racer.name}
                  </Text>
                  <Text style={styles.placementPower}>종합 {racer.overall}</Text>
                </View>
              ))}
            </View>

            <View style={styles.rewardBox}>
              <Text style={[styles.rewardXp, { color: won ? C.yellow : C.text2 }]}>+{xpGain} XP</Text>
              <Text style={[styles.rewardCoin, { color: won ? C.green : C.text3 }]}>+{coinGain} 🪙</Text>
            </View>

            <View style={styles.resultBtns}>
              <TouchableOpacity
                style={styles.rematchBtn}
                onPress={() => {
                  progRefs.current.forEach((a) => a.setValue(0));
                  setPhase('countdown');
                  setCountdown(COUNTDOWN_FROM);
                  setPlacements([]);
                }}
              >
                <Ionicons name="refresh" size={18} color="#000" />
                <Text style={styles.rematchText}>다시 경주</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.exitText}>아레나로</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { color: C.yellow, fontSize: 18, fontWeight: '900', letterSpacing: 1 },

  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  countdownNum: { fontSize: 96, fontWeight: '900', color: C.yellow, textShadowColor: 'rgba(255,203,5,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  countdownSub: { color: C.text2, fontSize: 16, marginTop: 8 },

  track: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 16 },

  lane: { gap: 6 },
  laneInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  laneEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  laneName: { flex: 1, color: C.text2, fontSize: 13, fontWeight: '700' },
  laneNamePlayer: { color: C.yellow },
  lanePower: { color: C.text3, fontSize: 12, fontWeight: '700' },
  laneTrack: { height: 36, backgroundColor: C.card, borderRadius: 18, borderWidth: 2, borderColor: C.border, overflow: 'hidden', justifyContent: 'center' },
  finishLine: { position: 'absolute', right: 8, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,203,5,0.4)' },
  runnerDot: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(204,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  runnerEmoji: { fontSize: 18 },

  resultPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', borderTopWidth: 2, borderTopColor: C.yellow },
  resultGrad: { padding: 24, gap: 16 },
  resultTitle: { color: C.yellow, fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },

  placementList: { gap: 8 },
  placementRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: C.bg },
  placementHighlight: { backgroundColor: 'rgba(255,203,5,0.08)', borderWidth: 2, borderColor: 'rgba(255,203,5,0.3)' },
  placeLabel: { fontSize: 13, fontWeight: '800', width: 48 },
  placementEmoji: { fontSize: 18 },
  placementName: { flex: 1, color: C.text2, fontSize: 13, fontWeight: '700' },
  placementPower: { color: C.text3, fontSize: 11, fontWeight: '700' },

  rewardBox: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  rewardXp: { fontSize: 20, fontWeight: '900' },
  rewardCoin: { fontSize: 20, fontWeight: '900' },

  resultBtns: { flexDirection: 'row', gap: 10 },
  rematchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.yellow, borderRadius: 14, paddingVertical: 14 },
  rematchText: { color: '#1a1a2e', fontSize: 15, fontWeight: '900' },
  exitBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2, borderRadius: 14, paddingVertical: 14, borderWidth: 2, borderColor: C.border },
  exitText: { color: C.text2, fontSize: 15, fontWeight: '700' },
});
