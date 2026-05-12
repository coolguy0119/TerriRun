import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

const DURATION = 10;

export default function TapBattleGame({ onFinish }) {
  const [phase, setPhase] = useState('ready'); // ready | playing | done
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  function startGame() {
    setPhase('playing');
    setCount(0);
    setTimeLeft(DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  function handleTap() {
    if (phase !== 'playing') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCount((c) => c + 1);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,   duration: 50, useNativeDriver: true }),
    ]).start();
  }

  const bp = count * 2;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚡ 번개 탭</Text>

      {phase === 'ready' && (
        <>
          <Text style={styles.desc}>10초 동안 최대한 빠르게 탭하세요!</Text>
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startText}>시작!</Text>
          </TouchableOpacity>
        </>
      )}

      {phase === 'playing' && (
        <>
          <Text style={styles.timer}>{timeLeft}초</Text>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity style={styles.tapBtn} onPress={handleTap} activeOpacity={0.7}>
              <Text style={styles.tapEmoji}>⚡</Text>
              <Text style={styles.tapCount}>{count}</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.hint}>빠르게 탭!</Text>
        </>
      )}

      {phase === 'done' && (
        <>
          <Text style={styles.result}>탭: {count}회</Text>
          <Text style={styles.bp}>+{bp} BP 획득!</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => onFinish(bp)}>
            <Text style={styles.doneText}>완료</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  desc: { color: '#888', fontSize: 15, textAlign: 'center' },
  timer: { color: '#ef4444', fontSize: 48, fontWeight: '800' },
  tapBtn: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#f59e0b', gap: 8 },
  tapEmoji: { fontSize: 48 },
  tapCount: { color: '#f59e0b', fontSize: 36, fontWeight: '800' },
  hint: { color: '#555', fontSize: 14 },
  result: { color: '#fff', fontSize: 28, fontWeight: '700' },
  bp: { color: '#22d97a', fontSize: 36, fontWeight: '800' },
  startBtn: { backgroundColor: '#f59e0b', borderRadius: 16, paddingHorizontal: 48, paddingVertical: 16 },
  startText: { color: '#000', fontSize: 20, fontWeight: '800' },
  doneBtn: { backgroundColor: '#22d97a', borderRadius: 16, paddingHorizontal: 48, paddingVertical: 16 },
  doneText: { color: '#000', fontSize: 18, fontWeight: '700' },
});
