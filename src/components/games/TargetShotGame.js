import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width: SW, height: SH } = Dimensions.get('window');
const DURATION = 15;
const TARGET_SIZE = 60;
const MOVE_INTERVAL = 1200;

function randomPos() {
  return {
    x: Math.random() * (SW - TARGET_SIZE - 40) + 20,
    y: Math.random() * (SH * 0.45) + 80,
  };
}

export default function TargetShotGame({ onFinish }) {
  const [phase, setPhase] = useState('ready');
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [targetPos, setTargetPos] = useState(randomPos());
  const [flash, setFlash] = useState(false);
  const timerRef = useRef(null);
  const moveRef = useRef(null);

  function startGame() {
    setPhase('playing');
    setHits(0);
    setMisses(0);
    setTimeLeft(DURATION);
    setTargetPos(randomPos());

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); clearInterval(moveRef.current); setPhase('done'); return 0; }
        return t - 1;
      });
    }, 1000);

    moveRef.current = setInterval(() => {
      setTargetPos(randomPos());
      setMisses((m) => m + 1);
    }, MOVE_INTERVAL);
  }

  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(moveRef.current); }, []);

  function handleHit() {
    if (phase !== 'playing') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHits((h) => h + 1);
    setMisses((m) => Math.max(0, m - 1));
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    setTargetPos(randomPos());
  }

  function handleMiss() {
    if (phase !== 'playing') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMisses((m) => m + 1);
  }

  const bp = hits * 8;
  const accuracy = hits + misses > 0 ? Math.round(hits / (hits + misses) * 100) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎯 조준 사격</Text>

      {phase === 'ready' && (
        <View style={styles.center}>
          <Text style={styles.desc}>움직이는 타겟을 탭하세요!{'\n'}빠를수록 더 많은 BP!</Text>
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startText}>시작!</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'playing' && (
        <TouchableOpacity style={styles.field} onPress={handleMiss} activeOpacity={1}>
          <View style={styles.hud}>
            <Text style={styles.timer}>{timeLeft}s</Text>
            <Text style={styles.hitCount}>🎯 {hits}</Text>
          </View>
          <TouchableOpacity
            style={[styles.target, { left: targetPos.x, top: targetPos.y }, flash && styles.targetHit]}
            onPress={handleHit}
            activeOpacity={0.6}
          >
            <Text style={styles.targetEmoji}>🎯</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.result}>명중: {hits}회</Text>
          <Text style={styles.accuracy}>정확도 {accuracy}%</Text>
          <Text style={styles.bp}>+{bp} BP 획득!</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => onFinish(bp)}>
            <Text style={styles.doneText}>완료</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', paddingTop: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  desc: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  field: { flex: 1, position: 'relative' },
  hud: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  timer: { color: '#ef4444', fontSize: 28, fontWeight: '800' },
  hitCount: { color: '#22d97a', fontSize: 24, fontWeight: '700' },
  target: { position: 'absolute', width: TARGET_SIZE, height: TARGET_SIZE, borderRadius: TARGET_SIZE / 2, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ef4444' },
  targetHit: { backgroundColor: 'rgba(34,217,122,0.3)', borderColor: '#22d97a' },
  targetEmoji: { fontSize: 32 },
  result: { color: '#fff', fontSize: 28, fontWeight: '700' },
  accuracy: { color: '#888', fontSize: 16 },
  bp: { color: '#22d97a', fontSize: 36, fontWeight: '800' },
  startBtn: { backgroundColor: '#ef4444', borderRadius: 16, paddingHorizontal: 48, paddingVertical: 16 },
  startText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  doneBtn: { backgroundColor: '#22d97a', borderRadius: 16, paddingHorizontal: 48, paddingVertical: 16 },
  doneText: { color: '#000', fontSize: 18, fontWeight: '700' },
});
